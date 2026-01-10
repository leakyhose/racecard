import type { Lobby, Player } from "@shared/types.js";
import {
  getLobbyByCode,
  getLobbyBySocket,
  trackSocket,
  untrackSocket,
} from "./lobbyManager.js";

export function addPlayer(
  code: string,
  id: string,
  name: string,
  score: number = 0,
): Lobby | null {
  const lobby = getLobbyByCode(code);
  if (!lobby) return null;
  if (lobby.players.find((p: Player) => p.id === id)) return lobby;
  lobby.players.push({
    id,
    name,
    score,
    wins: 0,
    miniStatus: null,
    answerTimes: [],
    totalAnswers: 0,
    correctAnswers: 0,
  });
  trackSocket(id, code);
  return lobby;
}

export function removePlayer(socketId: string): Lobby | null {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;
  lobby.players = lobby.players.filter((p: Player) => p.id !== socketId);

  if (lobby.endGameVotes) {
    lobby.endGameVotes = lobby.endGameVotes.filter((id) => id !== socketId);
  }

  untrackSocket(socketId);
  return lobby;
}
