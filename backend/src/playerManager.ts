import type { Lobby, Player } from "@shared/types.js";
import {
  getLobbyByCode,
  getLobbyBySocket,
  trackSocket,
  untrackSocket,
} from "./lobbyManager.js";

// Adds player to lobby
// @returns lobby, whether player was added or not, but null when lobby doesnt exist
// Eventually will add functionality for when duplicate players exist
export function addPlayer(
  code: string,
  id: string,
  name: string,
): Lobby | null {
  const lobby = getLobbyByCode(code);
  if (!lobby) return null;
  if (lobby.players.find((p: Player) => p.id === id)) return lobby;
  lobby.players.push({ id, name, score: 0 });
  trackSocket(id, code);
  return lobby;
}

// Removes player from lobby
// @returns updated lobby, or null if lobby doesn't exist
export function removePlayer(socketId: string): Lobby | null {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;
  lobby.players = lobby.players.filter((p: Player) => p.id !== socketId);
  untrackSocket(socketId);
  return lobby;
}
