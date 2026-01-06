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



    type CardData = {
      term: string;
      definition: string;
      trick_terms?: string[];
      trick_definitions?: string[];
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
          "term, definition, trick_terms, trick_definitions, is_generated, term_generated, definition_generated, order_index",
        )
        .eq("public_set_id", setId)
        .order("order_index", { ascending: true })
        .order("id", { ascending: true }) // Fallback
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
      trickTerms: card.trick_terms || [],
      trickDefinitions: card.trick_definitions || [],
      isGenerated:
        (card.term_generated && card.definition_generated) ||
        card.is_generated ||
        false,
      termGenerated: card.term_generated || false,
      definitionGenerated: card.definition_generated || false,
    }));

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
