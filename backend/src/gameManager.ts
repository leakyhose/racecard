import type { Gamestate } from "@shared/types.js";
import { getLobbyBySocket, getLobbyByCode } from "./lobbyManager.js";
import { generateResponse } from "./generateDistractors.js";

import { shuffle, swap } from "./util.js";

const codeToGamestate = new Map<string, Gamestate>();

// Track distractor generation status
const distractorStatus = new Map<
  string,
  { ready: boolean; generating: boolean }
>();

// Generate distractors for flashcards using OpenAI
export async function generateDistractors(
  lobbyCode: string,
  onProgress?: (message: string) => void,
) {
  const lobby = getLobbyByCode(lobbyCode);
  if (!lobby) return;

  // Check if already generating for this lobby
  const status = distractorStatus.get(lobbyCode);
  if (status?.generating) {
    console.log(
      `Distractor generation already in progress for lobby ${lobbyCode}, skipping...`,
    );
    return;
  }

  // Work with lobby flashcards directly, not gamestate (gamestate may not exist yet)
  const flashcardsToGenerate = lobby.flashcards;
  if (!flashcardsToGenerate || flashcardsToGenerate.length === 0) return;

  distractorStatus.set(lobbyCode, { ready: false, generating: true });

  try {
    const response = await generateResponse(flashcardsToGenerate, onProgress);

    if (!response) {
      console.error("Failed to generate distractors: empty response");
      distractorStatus.set(lobbyCode, { ready: false, generating: false });
      throw new Error("Failed to generate distractors");
    }

    const parsedResponse: {
      termDistractors: string[][];
      definitionDistractors: string[][];
    } = JSON.parse(response);

    // Validate the response
    if (
      !Array.isArray(parsedResponse.termDistractors) ||
      !Array.isArray(parsedResponse.definitionDistractors) ||
      parsedResponse.termDistractors.length !== flashcardsToGenerate.length ||
      parsedResponse.definitionDistractors.length !==
        flashcardsToGenerate.length
    ) {
      console.error("Invalid distractors format: array length mismatch");
      distractorStatus.set(lobbyCode, { ready: false, generating: false });
      throw new Error("Invalid distractors format");
    }

    // Assign distractors to each flashcard in the lobby
    flashcardsToGenerate.forEach((flashcard, index) => {
      const termDistractors = parsedResponse.termDistractors[index];
      const definitionDistractors = parsedResponse.definitionDistractors[index];

      if (
        Array.isArray(termDistractors) &&
        termDistractors.length === 3 &&
        Array.isArray(definitionDistractors) &&
        definitionDistractors.length === 3
      ) {
        flashcard.trickTerms = termDistractors;
        flashcard.trickDefinitions = definitionDistractors;
        flashcard.isGenerated = true;
      } else {
        console.error(`Invalid distractors for flashcard ${index}`);
        flashcard.trickTerms = [];
        flashcard.trickDefinitions = [];
        flashcard.isGenerated = false;
      }
    });

    console.log(`Distractors generated successfully for lobby ${lobbyCode}`);
    distractorStatus.set(lobbyCode, { ready: true, generating: false });
  } catch (error) {
    console.error("Error generating distractors:", error);
    distractorStatus.set(lobbyCode, { ready: false, generating: false });
    throw error;
  }
}

// Check if distractors are ready
export function areDistractorsReady(lobbyCode: string): boolean {
  const status = distractorStatus.get(lobbyCode);
  return status?.ready ?? true; // Default to true if not tracked
}

// Check if distractors are currently generating
export function areDistractorsGenerating(lobbyCode: string): boolean {
  const status = distractorStatus.get(lobbyCode);
  return status?.generating ?? false;
}

// Clean up distractor status
export function cleanupDistractorStatus(lobbyCode: string) {
  distractorStatus.delete(lobbyCode);
}

// Initialize game for a lobby (without shuffling yet)
export function startGame(socketId: string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;

  let gameFlashcards = [...lobby.flashcards];

  codeToGamestate.set(lobby.code, {
    flashcards: gameFlashcards,
    roundStart: 0,
    wrongAnswers: [],
    correctAnswers: [],
    submittedPlayers: [],
  });

  return lobby;
}

// Shuffle cards for a lobby (called after countdown)
export function shuffleGameCards(lobbyCode: string) {
  const lobby = getLobbyByCode(lobbyCode);
  if (!lobby) return;

  const gs = codeToGamestate.get(lobbyCode);
  if (!gs) return;

  if (lobby.settings.shuffle) {
    gs.flashcards = shuffle(gs.flashcards);
  }
}

// Set round start time when question is emitted
export function setRoundStart(lobbyCode: string) {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs) return;
  gs.roundStart = Date.now();
}

// Get the current question for a lobby
export function getCurrentQuestion(
  lobbyCode: string,
): { question: string; choices: string[] | null } | null {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs || !gs.flashcards || gs.flashcards.length === 0) return null;

  const currentFlashcard = gs.flashcards[0];
  if (!currentFlashcard) return null;

  const lobby = getLobbyByCode(lobbyCode);
  const isMultipleChoice = lobby?.settings.multipleChoice ?? false;
  const answerByTerm = lobby?.settings.answerByTerm ?? false;

  // Dynamically determine what to show based on mode
  const question = answerByTerm
    ? currentFlashcard.answer
    : currentFlashcard.question;
  const correctAnswer = answerByTerm
    ? currentFlashcard.question
    : currentFlashcard.answer;

  let choices: string[] | null = null;
  if (isMultipleChoice && currentFlashcard.isGenerated) {
    // answerByTerm: show term, need definition distractors (trickDefinitions)
    // answerByDefinition: show definition, need term distractors (trickTerms)
    const distractors = answerByTerm
      ? currentFlashcard.trickDefinitions
      : currentFlashcard.trickTerms;

    if (distractors && distractors.length === 3) {
      choices = shuffle([correctAnswer, ...distractors]);
    }
  }

  return { question, choices };
}

// Validate an answer from a player
export function validateAnswer(socketId: string, answerText: string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;

  const gs = codeToGamestate.get(lobby.code);
  if (!gs) return null;

  const currentFlashcard = gs.flashcards?.[0];
  if (!currentFlashcard) return null;

  const player = lobby.players.find((p) => p.id === socketId);
  if (!player) return null;

  const timeTaken = Math.max(307, Date.now() - gs.roundStart) - 300; // Buffer for animation of the card fliping into position.

  // Determine correct answer based on mode
  const answerByTerm = lobby.settings.answerByTerm ?? false;
  const correctAnswer = answerByTerm
    ? currentFlashcard.question
    : currentFlashcard.answer;

  const isCorrect =
    correctAnswer.toLowerCase().trim() === answerText.toLowerCase().trim();

  if (isCorrect) {
    if (!gs.correctAnswers.find((a) => a.player === player.name)) {
      let points = 1;
      if (gs.correctAnswers.length === 0) {
        points = 5;
      } else {
        const firstTime = gs.correctAnswers[0]?.time ?? 0;
        const diff = (timeTaken - firstTime) / 1000;
        if (diff < 1.5) points = 4;
        else if (diff < 3) points = 3;
        else if (diff < 5) points = 2;
        else points = 1;
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

// Check if all players have answered correctly
export function allPlayersAnsweredCorrectly(lobbyCode: string): boolean {
  const lobby = getLobbyByCode(lobbyCode);
  const gs = codeToGamestate.get(lobbyCode);
  if (!lobby || !gs) return false;

  const totalPlayers = lobby.players.length;
  const submittedPlayers = gs.submittedPlayers.length;

  return submittedPlayers >= totalPlayers;
}

// Get results for current round
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

// Advance to next flashcard
export function advanceToNextFlashcard(
  lobbyCode: string,
): { question: string; choices: string[] | null } | null {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs || !gs.flashcards || gs.flashcards.length === 0) return null;

  gs.flashcards.shift();

  gs.correctAnswers = [];
  gs.wrongAnswers = [];
  gs.submittedPlayers = [];
  // roundStart will be set when newFlashcard is emitted

  if (!gs.flashcards[0]) return null;

  return getCurrentQuestion(lobbyCode);
}

// Clean up game state when game ends
export function endGame(lobbyCode: string) {
  codeToGamestate.delete(lobbyCode);
  cleanupDistractorStatus(lobbyCode);
}
