import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard, Settings } from "@shared/types";

export interface LoadedPublicSet {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  username?: string;
  user_id?: string;
  allow_view?: boolean;
  allow_save?: boolean;
  settings: Partial<Settings>;
  flashcardCount: number;
}

export async function loadPublicSet(
  setId: string,
): Promise<LoadedPublicSet | null> {
  try {
    const { data: setData, error: setError } = await supabase
      .from("public_flashcard_sets")
      .select("*")
      .eq("id", setId)
      .single();

    if (setError) throw setError;

    // OPTIMIZATION: Only fetch essential fields initially (skip trick_terms/trick_definitions)
    // These arrays can be huge and are only needed when playing MC mode
    // They'll be lazy-loaded when the game starts via loadMCOptions()
    type CardData = {
      term: string;
      definition: string;
      is_generated?: boolean;
      term_generated?: boolean;
      definition_generated?: boolean;
      order_index: number;
    };
    let allCardsData: CardData[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error: fetchError } = await supabase
        .from("flashcards")
        .select(
          "term, definition, is_generated, term_generated, definition_generated, order_index",
        )
        .eq("public_set_id", setId)
        .order("order_index", { ascending: true })
        .order("id", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        allCardsData = [...allCardsData, ...data];
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    const flashcards: Flashcard[] = allCardsData.map((card, index) => ({
      id: index.toString(),
      question: card.term,
      answer: card.definition,
      trickTerms: [], // Lazy loaded later via loadMCOptions()
      trickDefinitions: [], // Lazy loaded later via loadMCOptions()
      isGenerated:
        (card.term_generated && card.definition_generated) ||
        card.is_generated ||
        false,
      termGenerated: card.term_generated || false,
      definitionGenerated: card.definition_generated || false,
    }));

    // Debug: Log loaded flashcards
    console.log(`[loadPublicSet] Loaded ${flashcards.length} flashcards for set "${setData.name}" (${setId})`);
    console.log("[loadPublicSet] First 5 flashcards:", flashcards.slice(0, 5).map(f => ({
      id: f.id,
      question: f.question?.substring(0, 50) + (f.question?.length > 50 ? "..." : ""),
      answer: f.answer?.substring(0, 50) + (f.answer?.length > 50 ? "..." : ""),
      termGenerated: f.termGenerated,
      definitionGenerated: f.definitionGenerated,
    })));

    socket.emit(
      "updateFlashcard",
      flashcards,
      setData.name,
      setId,
      setData.description,
      setData.allow_view,
      setData.allow_save,
      setData.user_id,
      setData.username,
      setData.created_at,
      setData.updated_at,
    );

    const settings: Partial<Settings> = {};
    if (
      setData.shuffle_flashcard !== null &&
      setData.shuffle_flashcard !== undefined
    )
      settings.shuffle = setData.shuffle_flashcard;
    if (
      setData.fuzzy_tolerance !== null &&
      setData.fuzzy_tolerance !== undefined
    )
      settings.fuzzyTolerance = setData.fuzzy_tolerance;
    if (setData.use_term !== null && setData.use_term !== undefined)
      settings.answerByTerm = setData.use_term;
    if (setData.use_mc !== null && setData.use_mc !== undefined)
      settings.multipleChoice = setData.use_mc;
    if (setData.round_time !== null && setData.round_time !== undefined)
      settings.roundTime = setData.round_time;

    return {
      id: setId,
      name: setData.name,
      description: setData.description,
      createdAt: setData.created_at,
      updatedAt: setData.updated_at,
      username: setData.username,
      user_id: setData.user_id,
      allow_view: setData.allow_view,
      allow_save: setData.allow_save,
      settings,
      flashcardCount: flashcards.length,
    };
  } catch (err) {
    console.error("Error loading public set:", err);
    return null;
  }
}

/**
 * Lazy-load MC options (trick_terms/trick_definitions) for a public set.
 * Call this when the game is about to start and MC mode is enabled.
 * Returns a map of order_index -> { trick_terms, trick_definitions }
 */
export async function loadMCOptions(
  setId: string,
): Promise<Map<number, { trickTerms: string[]; trickDefinitions: string[] }> | null> {
  try {
    console.log(`[loadMCOptions] Loading MC options for set ${setId}...`);
    const startTime = Date.now();
    
    type MCData = {
      order_index: number;
      trick_terms?: string[];
      trick_definitions?: string[];
    };
    let allData: MCData[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("flashcards")
        .select("order_index, trick_terms, trick_definitions")
        .eq("public_set_id", setId)
        .order("order_index", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    const mcMap = new Map<number, { trickTerms: string[]; trickDefinitions: string[] }>();
    for (const card of allData) {
      mcMap.set(card.order_index, {
        trickTerms: card.trick_terms || [],
        trickDefinitions: card.trick_definitions || [],
      });
    }

    console.log(`[loadMCOptions] Loaded MC options for ${mcMap.size} cards in ${Date.now() - startTime}ms`);
    return mcMap;
  } catch (err) {
    console.error("Error loading MC options:", err);
    return null;
  }
}
