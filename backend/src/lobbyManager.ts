import type { Flashcard, Lobby, Settings } from "@shared/types.js";
import { generateCode, deleteCode } from "./codeGenerator.js";
import { addPlayer } from "./playerManager.js";

const lobbies = new Map<string, Lobby>();
const socketToLobby = new Map<string, string>();

// Tracks a socket's lobby membership
export function trackSocket(socketId: string, code: string) {
  socketToLobby.set(socketId, code);
}

// Untracks a socket (for when they leave/disconnect)
export function untrackSocket(socketId: string) {
  socketToLobby.delete(socketId);
}

// Creates a lobby
// @returns new lobby
export function createLobby(hostID: string, hostName: string): Lobby {
  const code = generateCode();
  const newLobby: Lobby = {
    code,
    hostID,
    players: [{ id: hostID, name: hostName, score: 0 }],
    flashcards: [],
    status: "waiting",
    settings: { shuffle: false, fuzzyTolerance: true },
  };
  lobbies.set(code, newLobby);
  socketToLobby.set(hostID, code);
  return newLobby;
}

// Updates flashcards in a lobby
// @returns updated lobby
export function updateFlashcard(socketId: string, flashcards: Flashcard[]){
    const lobby = getLobbySocket(socketId);
    if (!lobby){
        return false;
    }
    lobby.flashcards = flashcards;
    return lobby
}

// Updates settings in a lobby
// @returns updated lobby
export function updateSettings(socketId: string, settings: Settings){
    const lobby = getLobbySocket(socketId);
    if (!lobby){
        return false;
    }
    lobby.settings = settings;
    return lobby
}

// Adds player to lobby
// @returns updated lobby
export function addPlayerToLobby(code: string, id: string, name: string){
    return addPlayer(code, id, name);
}

// Deletes a lobby
export function deleteLobby(code: string){
    deleteCode(code);
    lobbies.delete(code);
}

// Returns lobby from code
export function getLobbyCode(code: string) {
  return lobbies.get(code) || null;
}

// Returns lobby from socket
export function getLobbySocket(socketId: string): Lobby | null{
  const lobbyCode = socketToLobby.get(socketId);
  if (!lobbyCode) return null;
  return getLobbyCode(lobbyCode);
}

// Gets list of all lobbies
export function getAllLobbies() {
  return Array.from(lobbies.values());
}
