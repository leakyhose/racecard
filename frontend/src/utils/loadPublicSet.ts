import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard, Settings } from "@shared/types";

export interface LoadedPublicSet {
  id: string;
  name: string;
  description?: string;
  settings: Partial<Settings>;
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

    const { error: rpcError } = await supabase.rpc("increment_plays", {
      row_id: setId,
    });

    if (rpcError) {
      const { error: updateError } = await supabase
        .from("public_flashcard_sets")
        .update({ plays: (Number(setData.plays) || 0) + 1 })
        .eq("id", setId);

      if (updateError) {
        console.warn("Failed to increment plays", updateError);
      }
    }

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
      settings,
    };
  } catch (err) {
    console.error("Error loading public set:", err);
    return null;
  }
}
