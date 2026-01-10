import type { Flashcard } from "@shared/types.js";

export function shuffle<T>(array: T[]): T[] {
  const length = array.length;

  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }

  return array;
}

export function swap(array: Flashcard[]): Flashcard[] {
  return array.map((flashcard) => ({
    id: flashcard.id,
    question: flashcard.answer,
    answer: flashcard.question,
    trickTerms: flashcard.trickDefinitions || [],
    trickDefinitions: flashcard.trickTerms || [],
    isGenerated: flashcard.isGenerated || false,
    termGenerated: flashcard.definitionGenerated || false,
    definitionGenerated: flashcard.termGenerated || false,
  }));
}
