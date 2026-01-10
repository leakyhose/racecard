import type { Gamestate } from "@shared/types.js";
import {
  getLobbyBySocket,
  getLobbyByCode,
  resetPlayerStats,
} from "./lobbyManager.js";
import { generateResponse } from "./generateDistractors.js";

import { shuffle, swap } from "./util.js";
import { normalizeForFuzzy } from "./fuzzySearch.js";

const codeToGamestate = new Map<string, Gamestate>();

const distractorStatus = new Map<
  string,
  { ready: boolean; generating: boolean }
>();

export async function generateDistractors(
  lobbyCode: string,
  mode: "term" | "definition" | "both",
  onProgress?: (message: string) => void,
) {
  const lobby = getLobbyByCode(lobbyCode);
  if (!lobby) return;

  const status = distractorStatus.get(lobbyCode);
  if (status?.generating) {
    console.log(
      `Distractor generation already in progress for lobby ${lobbyCode}, skipping...`,
    );
    return;
  }

  const flashcardsToGenerate = [...lobby.flashcards];
  if (!flashcardsToGenerate || flashcardsToGenerate.length === 0) return;

  distractorStatus.set(lobbyCode, { ready: false, generating: true });

  try {
    const response = await generateResponse(
      flashcardsToGenerate,
      mode,
      onProgress,
    );

    if (!response) {
      console.error("Failed to generate distractors: empty response");
      distractorStatus.set(lobbyCode, { ready: false, generating: false });
      throw new Error("Failed to generate distractors");
    }

    const parsedResponse: {
      termDistractors?: string[][];
      definitionDistractors?: string[][];
    } = JSON.parse(response);

    if (
      ((mode === "definition" || mode === "both") &&
        (!Array.isArray(parsedResponse.termDistractors) ||
          parsedResponse.termDistractors.length !==
            flashcardsToGenerate.length)) ||
      ((mode === "term" || mode === "both") &&
        (!Array.isArray(parsedResponse.definitionDistractors) ||
          parsedResponse.definitionDistractors.length !==
            flashcardsToGenerate.length))
    ) {
      console.error("Invalid distractors format: array length mismatch");
      distractorStatus.set(lobbyCode, { ready: false, generating: false });
      throw new Error("Invalid distractors format");
    }

    flashcardsToGenerate.forEach((flashcard, index) => {
      if (mode === "definition" || mode === "both") {
        const termDistractors = parsedResponse.termDistractors![index];
        if (Array.isArray(termDistractors) && termDistractors.length === 3) {
          flashcard.trickDefinitions = termDistractors;
          flashcard.definitionGenerated = true;
        } else {
          flashcard.trickDefinitions = [];
          flashcard.definitionGenerated = false;
        }
      }

      if (mode === "term" || mode === "both") {
        const definitionDistractors =
          parsedResponse.definitionDistractors![index];
        if (
          Array.isArray(definitionDistractors) &&
          definitionDistractors.length === 3
        ) {
          flashcard.trickTerms = definitionDistractors;
          flashcard.termGenerated = true;
        } else {
          flashcard.trickTerms = [];
          flashcard.termGenerated = false;
        }
      }

      flashcard.isGenerated =
        (flashcard.termGenerated && flashcard.definitionGenerated) || false;
    });

    console.log(`Distractors generated successfully for lobby ${lobbyCode}`);
    distractorStatus.set(lobbyCode, { ready: true, generating: false });
  } catch (error) {
    console.error("Error generating distractors:", error);
    distractorStatus.set(lobbyCode, { ready: false, generating: false });
    throw error;
  }
}

export function areDistractorsReady(lobbyCode: string): boolean {
  const status = distractorStatus.get(lobbyCode);
  return status?.ready ?? true; // Default to true if not tracked
}

export function areDistractorsGenerating(lobbyCode: string): boolean {
  const status = distractorStatus.get(lobbyCode);
  return status?.generating ?? false;
}

export function cleanupDistractorStatus(lobbyCode: string) {
  distractorStatus.delete(lobbyCode);
}

export function startGame(socketId: string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;

  if (!lobby.settings.shuffle) {
    lobby.shuffledFlashcards = [];
  }

  if (!lobby.shuffledFlashcards) {
    lobby.shuffledFlashcards = [];
  }

  const currentDeckIds = new Set(lobby.shuffledFlashcards.map((c) => c.id));
  let missingCards = lobby.flashcards.filter((c) => !currentDeckIds.has(c.id));

  if (lobby.settings.shuffle) {
    missingCards = shuffle(missingCards);
  }

  lobby.shuffledFlashcards = [...lobby.shuffledFlashcards, ...missingCards];

  const gameFlashcards = [...lobby.shuffledFlashcards];

  codeToGamestate.set(lobby.code, {
    flashcards: gameFlashcards,
    roundStart: 0,
    wrongAnswers: [],
    correctAnswers: [],
    submittedPlayers: [],
    cardsPlayed: lobby.flashcards.length - gameFlashcards.length,
  });

  return lobby;
}

export function shuffleGameCards(lobbyCode: string) {
  return;
}

export function setRoundStart(lobbyCode: string) {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs) return;
  gs.roundStart = Date.now();
}

export function getCurrentQuestion(
  lobbyCode: string,
): {
  question: string;
  choices: string[] | null;
  cardsPlayed: number;
  totalCards: number;
} | null {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs || !gs.flashcards || gs.flashcards.length === 0) return null;

  const currentFlashcard = gs.flashcards[0];
  if (!currentFlashcard) return null;

  const lobby = getLobbyByCode(lobbyCode);
  const isMultipleChoice = lobby?.settings.multipleChoice ?? false;
  const answerByTerm = lobby?.settings.answerByTerm ?? false;

  const question = answerByTerm
    ? currentFlashcard.answer
    : currentFlashcard.question;
  const correctAnswer = answerByTerm
    ? currentFlashcard.question
    : currentFlashcard.answer;

  let choices: string[] | null = null;
  const isSideGenerated = answerByTerm
    ? currentFlashcard.termGenerated
    : currentFlashcard.definitionGenerated;

  if (isMultipleChoice && isSideGenerated) {
    const distractors = answerByTerm
      ? currentFlashcard.trickTerms
      : currentFlashcard.trickDefinitions;

    if (distractors && distractors.length === 3) {
      choices = shuffle([correctAnswer, ...distractors]);
    }
  }

  return {
    question,
    choices,
    cardsPlayed: gs.cardsPlayed,
    totalCards: lobby?.flashcards.length || 0,
  };
}

export function validateAnswer(socketId: string, answerText: string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;

  const gs = codeToGamestate.get(lobby.code);
  if (!gs) return null;

  const currentFlashcard = gs.flashcards?.[0];
  if (!currentFlashcard) return null;

  const player = lobby.players.find((p) => p.id === socketId);
  if (!player) return null;

  if (
    lobby.settings.multipleChoice &&
    gs.submittedPlayers.includes(player.id)
  ) {
    return null;
  }

  const timeTaken = Math.max(307, Date.now() - gs.roundStart) - 300;

  const answerByTerm = lobby.settings.answerByTerm ?? false;
  const correctAnswer = answerByTerm
    ? currentFlashcard.question
    : currentFlashcard.answer;

  let isCorrect: boolean;
  
  if (!lobby.settings.multipleChoice && lobby.settings.fuzzyTolerance) {
    const normalizedCorrect = normalizeForFuzzy(correctAnswer);
    
    if (normalizedCorrect.length === 0) {
      isCorrect = correctAnswer.toLowerCase().trim() === answerText.toLowerCase().trim();
    } else {
      const normalizedAnswer = normalizeForFuzzy(answerText);
      isCorrect = normalizedCorrect === normalizedAnswer;
    }
  } else {
    isCorrect = correctAnswer.toLowerCase().trim() === answerText.toLowerCase().trim();
  }

  if (isCorrect) {
    if (!gs.correctAnswers.find((a) => a.player === player.name)) {
      let points = 1;
      if (gs.correctAnswers.length === 0) {
        points = 10;
      } else {
        const firstTime = gs.correctAnswers[0]?.time ?? 0;
        const diff = (timeTaken - firstTime) / 1000;
        points = Math.max(1, 9 - Math.floor(diff / 0.7));
      }

      gs.correctAnswers.push({ player: player.name, time: timeTaken });
      player.score += points;
      player.miniStatus = timeTaken;
      player.isCorrect = true;
    }

    if (!gs.submittedPlayers.find((a) => a === player.id)) {
      gs.submittedPlayers.push(player.id);
    }
  } else if (lobby.settings.multipleChoice) {
    player.miniStatus = timeTaken;
    player.isCorrect = false;
    gs.wrongAnswers.push({ player: player.name, answer: [answerText] });
    gs.submittedPlayers.push(player.id);
  } else {
    player.miniStatus = answerText;
    player.isCorrect = false;
    const existing = gs.wrongAnswers.find((w) => w.player === player.name);
    if (existing) {
      existing.answer.push(answerText);
    } else {
      gs.wrongAnswers.push({ player: player.name, answer: [answerText] });
    }
  }
  return { isCorrect, timeTaken, lobby };
}

export function allPlayersAnsweredCorrectly(lobbyCode: string): boolean {
  const lobby = getLobbyByCode(lobbyCode);
  const gs = codeToGamestate.get(lobbyCode);
  if (!lobby || !gs) return false;

  const totalPlayers = lobby.players.length;
  const submittedPlayers = gs.submittedPlayers.length;

  return submittedPlayers >= totalPlayers;
}

export function getRoundResults(lobbyCode: string) {
  const gs = codeToGamestate.get(lobbyCode);
  const lobby = getLobbyByCode(lobbyCode);
  if (!gs || !lobby) return null;

  const currentFlashcard = gs.flashcards?.[0];
  if (!currentFlashcard) return null;

  const answerByTerm = lobby.settings.answerByTerm ?? false;
  const correctAnswer = answerByTerm
    ? currentFlashcard.question
    : currentFlashcard.answer;

  return {
    Answer: correctAnswer,
    fastestPlayers: [...gs.correctAnswers].sort((a, b) => a.time - b.time),
    wrongAnswers: gs.wrongAnswers,
  };
}

export function advanceToNextFlashcard(
  lobbyCode: string,
): {
  question: string;
  choices: string[] | null;
  cardsPlayed: number;
  totalCards: number;
} | null {
  const gs = codeToGamestate.get(lobbyCode);
  const lobby = getLobbyByCode(lobbyCode);
  if (!gs || !gs.flashcards || gs.flashcards.length === 0 || !lobby)
    return null;

  gs.flashcards.shift();
  if (lobby.shuffledFlashcards && lobby.shuffledFlashcards.length > 0) {
    lobby.shuffledFlashcards.shift();
  }

  gs.correctAnswers = [];
  gs.wrongAnswers = [];
  gs.submittedPlayers = [];
  gs.cardsPlayed++;

  if (gs.cardsPlayed >= lobby.flashcards.length) {
    return null;
  }

  if (!gs.flashcards[0]) {
    return null;
  }

  return getCurrentQuestion(lobbyCode);
}

export function processUnansweredPlayers(lobbyCode: string) {
  const lobby = getLobbyByCode(lobbyCode);
  const gs = codeToGamestate.get(lobbyCode);
  if (!lobby || !gs) return;

  lobby.players.forEach((player) => {
    if (!gs.submittedPlayers.includes(player.id)) {
      if (!player.totalAnswers) player.totalAnswers = 0;
      player.totalAnswers++;
    }
  });
}

export function removeCurrentCardFromDeck(lobbyCode: string) {
  const lobby = getLobbyByCode(lobbyCode);
  if (
    lobby &&
    lobby.shuffledFlashcards &&
    lobby.shuffledFlashcards.length > 0
  ) {
    lobby.shuffledFlashcards.shift();
  }
}

export function endGame(lobbyCode: string) {
  codeToGamestate.delete(lobbyCode);
  cleanupDistractorStatus(lobbyCode);
  resetPlayerStats(lobbyCode);
}
