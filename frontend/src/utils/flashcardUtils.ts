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
    // Expecting at least 3 parts: Question, Answer, Wrong1
    if (parts.length >= 3) {
      const question = parts[0].trim();
      const answer = parts[1].trim();
      
      // Get all wrong answers (distractors)
      const rawDistractors = parts.slice(2).map(p => p.trim()).filter(p => p !== "");

      if (question && answer && rawDistractors.length >= 1) {
        let trickDefinitions: string[] = [];
        
        if (rawDistractors.length === 1) {
             // [Correct, wrong, wrong]
             trickDefinitions = [answer, rawDistractors[0], rawDistractors[0]];
        } else if (rawDistractors.length === 2) {
             // [wrong1, wrong2, wrong2]
             trickDefinitions = [rawDistractors[0], rawDistractors[1], rawDistractors[1]];
        } else {
             // [wrong1, wrong2, wrong3] (take first 3)
             trickDefinitions = rawDistractors.slice(0, 3);
        }

        flashcards.push({
          id: crypto.randomUUID(),
          question,
          answer,
          trickDefinitions,
          isGenerated: true,
        });
      }
    }
  }

  return flashcards;
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
}
