import type { Flashcard } from "@shared/types";

export type TermDefinitionSeparator = "tab" | "comma" | "custom";
export type RowSeparator = "newline" | "semicolon" | "custom";

export interface ParseOptions {
  termDefinitionSeparator: TermDefinitionSeparator;
  rowSeparator: RowSeparator;
  customTermSeparator?: string;
  customRowSeparator?: string;
}

export function parseFlashcards(
  text: string,
  options: ParseOptions,
): Flashcard[] {
  const {
    termDefinitionSeparator,
    rowSeparator,
    customTermSeparator,
    customRowSeparator,
  } = options;

  // Determine the row separator
  let rowSep: string;
  if (rowSeparator === "newline") {
    rowSep = "\n";
  } else if (rowSeparator === "semicolon") {
    rowSep = ";";
  } else {
    rowSep = customRowSeparator || "\n";
  }

  // Determine the term/definition separator
  let termSep: string;
  if (termDefinitionSeparator === "tab") {
    termSep = "\t";
  } else if (termDefinitionSeparator === "comma") {
    termSep = ",";
  } else {
    termSep = customTermSeparator || "\t";
  }

  // Split into rows and parse
  const rows = text.split(rowSep);
  const flashcards: Flashcard[] = [];

  for (const row of rows) {
    const trimmedRow = row.trim();
    if (!trimmedRow) continue;

    const parts = trimmedRow.split(termSep);
    if (parts.length >= 2) {
      const question = parts[0].trim();
      const answer = parts.slice(1).join(termSep).trim();

      if (question && answer) {
        flashcards.push({
          id: crypto.randomUUID(),
          question,
          answer,
          distractors: [],
        });
      }
    }
  }

  return flashcards;
}

export function parseAdvancedFlashcards(
  text: string,
  options: ParseOptions,
): Flashcard[] {
  const {
    termDefinitionSeparator,
    rowSeparator,
    customTermSeparator,
    customRowSeparator,
  } = options;

  // Determine the row separator
  let rowSep: string;
  if (rowSeparator === "newline") {
    rowSep = "\n";
  } else if (rowSeparator === "semicolon") {
    rowSep = ";";
  } else {
    rowSep = customRowSeparator || "\n";
  }

  // Determine the term/definition separator
  let termSep: string;
  if (termDefinitionSeparator === "tab") {
    termSep = "\t";
  } else if (termDefinitionSeparator === "comma") {
    termSep = ",";
  } else {
    termSep = customTermSeparator || "\t";
  }

  // Split into rows and parse
  const rows = text.split(rowSep);
  const flashcards: Flashcard[] = [];

  for (const row of rows) {
    const trimmedRow = row.trim();
    if (!trimmedRow) continue;

    const parts = trimmedRow.split(termSep);
    // Expecting at least 5 parts: Question, Answer, Wrong1, Wrong2, Wrong3
    if (parts.length >= 5) {
      const question = parts[0].trim();
      const answer = parts[1].trim();
      const wrong1 = parts[2].trim();
      const wrong2 = parts[3].trim();
      const wrong3 = parts[4].trim();

      if (question && answer && wrong1 && wrong2 && wrong3) {
        flashcards.push({
          id: crypto.randomUUID(),
          question,
          answer,
          trickDefinitions: [wrong1, wrong2, wrong3],
          isGenerated: true,
        });
      }
    }
  }

  return flashcards;
}
