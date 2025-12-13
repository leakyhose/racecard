import type { Flashcard, Lobby, Settings, Player } from "@shared/types.js";
import { generateCode, deleteCode } from "./codeGenerator.js";
import { addPlayer, removePlayer } from "./playerManager.js";

const lobbies = new Map<string, Lobby>();
const socketToLobby = new Map<string, string>();

// Tracks a socket's lobby membership
// MUST BE USED IN ANY FUNCTION CHANGING PLAYERS IN AND OUT OF LOBBIES
export function trackSocket(socketId: string, code: string) {
  socketToLobby.set(socketId, code);
}

// Untracks a socket (for when they leave/disconnect)
// MUST BE USED IN ANY FUNCTION CHANGING PLAYERS IN AND OUT OF LOBBIES
export function untrackSocket(socketId: string) {
  socketToLobby.delete(socketId);
}

// Creates a lobby
// @returns new updated lobby
export function createLobby(hostID: string, hostName: string): Lobby {
  const code = generateCode();
  const newLobby: Lobby = {
    code,
    players: [
      { id: hostID, name: hostName, score: 0, wins: 0, miniStatus: null },
    ],
    flashcards: [],
    flashcardID: "",
    flashcardName: "",
    status: "waiting",
    settings: {
      shuffle: true,
      fuzzyTolerance: true,
      answerByTerm: false,
      multipleChoice: true,
      roundTime: 10,
    }, // DEFAULT SETTINGS HERE WHEN CREATING LOBBY
    leader: hostID,
  };
  lobbies.set(code, newLobby);
  socketToLobby.set(hostID, code);
  return newLobby;
}

// Updates flashcards in a lobby
// @returns updated lobby
export function updateFlashcard(socketId: string, flashcards: Flashcard[], setName:string, setID:string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) {
    return false;
  }
  lobby.flashcards = flashcards;
  lobby.flashcardName = setName == " " ?  "Unnamed Set" : setName;
  lobby.flashcardID = setID == " " ?  "UNNAMED" : setID;
  return lobby;
}

// Updates settings in a lobby
// @returns updated lobby
export function updateSettings(socketId: string, settings: Settings) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) {
    return false;
  }
  lobby.settings = settings;
  return lobby;
}

// Adds player to lobby
// @returns updated lobby
export function addPlayerToLobby(code: string, id: string, name: string) {
  return addPlayer(code, id, name);
}

// Adds player to lobby
// @returns updated lobby, null if lobby is deleted
export function removePlayerFromLobby(socketId: string) {
  const lobby = removePlayer(socketId);

  if (lobby && lobby.players.length == 0) {
    deleteLobby(lobby.code);
    return null;
  }

  return lobby;
}

// Wipes miniStatus for all players in a lobby
export function wipeMiniStatus(lobbyCode: string) {
  const lobby = getLobbyByCode(lobbyCode);

  for (const player of lobby?.players || []) {
    player.miniStatus = null;
    player.isCorrect = false;
  }

  return lobby;
}

// Updates leader in a lobby
export function updateLeader(socketId: string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) {
    return;
  }
  lobby.leader = socketId;
  return lobby;
}

// Deletes a lobby
export function deleteLobby(code: string) {
  deleteCode(code);
  lobbies.delete(code);
}

// Returns lobby from code
export function getLobbyByCode(code: string) {
  return lobbies.get(code) || null;
}

// Returns lobby from socket
export function getLobbyBySocket(socketId: string): Lobby | null {
  const lobbyCode = socketToLobby.get(socketId);
  if (!lobbyCode) return null;
  return getLobbyByCode(lobbyCode);
}

// Gets list of all lobbies
export function getAllLobbies() {
  return Array.from(lobbies.values());
}

// Sorts players in lobby with metric
export function sortPlayersByMetric(lobby: Lobby): Player[] {
  const players = [...lobby.players];

  if (lobby.status === "waiting" || lobby.status === "finished") {
    return players.sort((a, b) => b.wins - a.wins);
  } else {
    return players.sort((a, b) => b.score - a.score);
  }
}
