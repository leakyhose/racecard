import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard, Settings } from "@shared/types";

export interface LoadedPublicSet {
  id: string;
  name: string;
  settings: Partial<Settings>;
}

export async function loadPublicSet(setId: string): Promise<LoadedPublicSet | null> {
  try {
    // 1. Fetch set details
    const { data: setData, error: setError } = await supabase
      .from("public_flashcard_sets")
      .select("*")
      .eq("id", setId)
      .single();

    if (setError) throw setError;

    // Increment plays - using RPC to bypass RLS if needed
    const { error: rpcError } = await supabase.rpc("increment_plays", {
      row_id: setId,
    });

    if (rpcError) {
      // Fallback to direct update if RPC fails (e.g. function doesn't exist)
      const { error: updateError } = await supabase
        .from("public_flashcard_sets")
        .update({ plays: (Number(setData.plays) || 0) + 1 })
        .eq("id", setId);

      if (updateError) {
        console.warn("Failed to increment plays", updateError);
      }
    }

    // 2. Fetch flashcards
    const { data: cardsData, error: cardsError } = await supabase
      .from("flashcards")
      .select(
        "term, definition, trick_terms, trick_definitions, is_generated, term_generated, definition_generated",
      )
      .eq("public_set_id", setId)
      .order("id", { ascending: true });

    if (cardsError) throw cardsError;

    const flashcards: Flashcard[] = cardsData.map((card, index) => ({
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

    // 3. Emit socket event
    socket.emit("updateFlashcard", flashcards, setData.name, setId);

    // 4. Return settings
    const settings: Partial<Settings> = {};
    if (setData.shuffle_flashcard !== null && setData.shuffle_flashcard !== undefined) settings.shuffle = setData.shuffle_flashcard;
    if (setData.fuzzy_tolerance !== null && setData.fuzzy_tolerance !== undefined) settings.fuzzyTolerance = setData.fuzzy_tolerance;
    if (setData.use_term !== null && setData.use_term !== undefined) settings.answerByTerm = setData.use_term;
    if (setData.use_mc !== null && setData.use_mc !== undefined) settings.multipleChoice = setData.use_mc;
    if (setData.round_time !== null && setData.round_time !== undefined) settings.roundTime = setData.round_time;

    return {
      id: setId,
      name: setData.name,
      settings
    };

  } catch (err) {
    console.error("Error loading public set:", err);
    return null;
  }
}
