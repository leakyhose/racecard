import type { Flashcard, Gamestate } from "@shared/types.js";
import { getLobbyBySocket, getLobbyByCode } from "./lobbyManager.js";

import { shuffle } from "./util.js";

const codeToGamestate = new Map<string, Gamestate>();

// Initialize game for a lobby (without shuffling yet)
export function startGame(socketId: string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;

  // Don't set status or shuffle yet - just prepare the state
  codeToGamestate.set(lobby.code, {
    flashcards: [...lobby.flashcards], // Will be shuffled later
    roundStart: 0,
    wrongAnswers: [],
    correctAnswers: [],
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
    gs.flashcards = shuffle([...gs.flashcards]);
  }
}

// Set round start time when question is emitted
export function setRoundStart(lobbyCode: string) {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs) return;
  gs.roundStart = Date.now();
}

// Get the current question for a lobby
export function getCurrentQuestion(lobbyCode: string): string | null {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs || !gs.flashcards || gs.flashcards.length === 0) return null;
  return gs.flashcards[0]?.question || null;
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
    }
  } else {
    const existing = gs.wrongAnswers.find((w) => w.player === player.name);
    if (existing) {
      existing.answer = answerText;
    } else {
      gs.wrongAnswers.push({ player: player.name, answer: answerText });
    }
  }

  return { isCorrect, timeTaken, lobby };
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
export function advanceToNextFlashcard(lobbyCode: string): string | null {
  const gs = codeToGamestate.get(lobbyCode);
  if (!gs || !gs.flashcards || gs.flashcards.length === 0) return null;

  gs.flashcards.shift();

  gs.correctAnswers = [];
  gs.wrongAnswers = [];
  // roundStart will be set when newFlashcard is emitted

  return gs.flashcards[0]?.question || null;
}

// Clean up game state when game ends
export function endGame(lobbyCode: string) {
  codeToGamestate.delete(lobbyCode);
}