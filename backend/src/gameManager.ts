import type { Gamestate } from "@shared/types.js";
import { getLobbyBySocket, getLobbyByCode } from "./lobbyManager.js";
import { generateResponse } from "./generateDistractors.js";

import { shuffle, swap } from "./util.js";

const codeToGamestate = new Map<string, Gamestate>();

// Track distractor generation status
const distractorStatus = new Map<string, { ready: boolean }>();

// Generate distractors for flashcards using OpenAI
export async function generateDistractors(lobbyCode: string) {
  const lobby = getLobbyByCode(lobbyCode);
  if (!lobby) return;

  const gs = codeToGamestate.get(lobbyCode);
  if (!gs) return;

  distractorStatus.set(lobbyCode, { ready: false });

  try {
    const response = await generateResponse(gs.flashcards);
    
    if (!response) {
      console.error("Failed to generate distractors: empty response");
      distractorStatus.set(lobbyCode, { ready: true });
      return;
    }

    const distractorsArray: string[][] = JSON.parse(response);

    // Validate the response, should never fire if AI prompting is correct
    if (!Array.isArray(distractorsArray) || distractorsArray.length !== gs.flashcards.length) {
      console.error("Invalid distractors format: array length mismatch");
      distractorStatus.set(lobbyCode, { ready: true });
      return;
    }

    // Assign distractors to each flashcard
    gs.flashcards.forEach((flashcard, index) => {
      const distractors = distractorsArray[index];
      if (Array.isArray(distractors) && distractors.length === 3) {
        flashcard.distractors = distractors;
      } else {
        console.error(`Invalid distractors for flashcard ${index}`);
        flashcard.distractors = [];
      }
    });

    console.log(`Distractors generated successfully for lobby ${lobbyCode}`);
    distractorStatus.set(lobbyCode, { ready: true });
  } catch (error) {
    console.error("Error generating distractors:", error);
    distractorStatus.set(lobbyCode, { ready: true });
  }
}

// Check if distractors are ready
export function areDistractorsReady(lobbyCode: string): boolean {
  const status = distractorStatus.get(lobbyCode);
  return status?.ready ?? true; // Default to true if not tracked
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
  if (lobby.settings.answerByTerm) {
    gameFlashcards = swap(gameFlashcards);
  }

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
export function getCurrentQuestion(lobbyCode: string): { question: string; choices: string[] | null } | null {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs || !gs.flashcards || gs.flashcards.length === 0) return null;
  
  const currentFlashcard = gs.flashcards[0];
  if (!currentFlashcard) return null;

  const lobby = getLobbyByCode(lobbyCode);
  const isMultipleChoice = lobby?.settings.multipleChoice ?? false;

  let choices: string[] | null = null;
  if (isMultipleChoice && currentFlashcard.distractors && currentFlashcard.distractors.length === 3) {
    // Create array with correct answer and 3 distractors, then shuffle
    choices = shuffle([currentFlashcard.answer, ...currentFlashcard.distractors]);
  }

  return { question: currentFlashcard.question, choices };
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

  const timeTaken = Date.now() - gs.roundStart;

  const isCorrect =
    currentFlashcard.answer.toLowerCase().trim() ===
    answerText.toLowerCase().trim();

  if (isCorrect) {
    if (!gs.correctAnswers.find((a) => a.player === player.name)) {
      gs.correctAnswers.push({ player: player.name, time: timeTaken });
      player.score += 1;
      player.miniStatus = timeTaken;
    }

    if (!gs.submittedPlayers.find((a) => a === player.id)) {
      gs.submittedPlayers.push(player.id);
    }
  
  } 
  
  else if (lobby.settings.multipleChoice) {
    player.miniStatus = timeTaken;
    gs.wrongAnswers.push({ player: player.name, answer: [answerText] });
    gs.submittedPlayers.push(player.id);

  } else {
    player.miniStatus = answerText;
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
  if (!gs) return null;

  const currentFlashcard = gs.flashcards?.[0];
  if (!currentFlashcard) return null;

  return {
    Answer: currentFlashcard.answer,
    fastestPlayers: [...gs.correctAnswers].sort((a, b) => a.time - b.time),
    wrongAnswers: gs.wrongAnswers,
  };
}

// Advance to next flashcard
export function advanceToNextFlashcard(lobbyCode: string): { question: string; choices: string[] | null } | null {
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
