import type { Flashcard, Lobby, Settings, Player } from "@shared/types.js";
import { generateCode, deleteCode } from "./codeGenerator.js";
import { addPlayer, removePlayer } from "./playerManager.js";

const lobbies = new Map<string, Lobby>();
const socketToLobby = new Map<string, string>();


export function trackSocket(socketId: string, code: string) {
  socketToLobby.set(socketId, code);
}

export function untrackSocket(socketId: string) {
  socketToLobby.delete(socketId);
}

export function createLobby(hostID: string, hostName: string): Lobby {
  const code = generateCode();
  const newLobby: Lobby = {
    code,
    players: [
      {
        id: hostID,
        name: hostName,
        score: 0,
        wins: 0,
        miniStatus: null,
        answerTimes: [],
        totalAnswers: 0,
        correctAnswers: 0,
      },
    ],
    flashcards: [],
    flashcardID: "",
    flashcardName: "",
    flashcardDescription: "",
    flashcardAuthorId: "",
    flashcardAuthorName: "",
    flashcardCreatedAt: "",
    flashcardUpdatedAt: "",
    status: "waiting",
    settings: {
      shuffle: true,
      fuzzyTolerance: true,
      answerByTerm: false,
      multipleChoice: true,
      roundTime: 15,
      pointsToWin: 100,
    },
    leader: hostID,
    endGameVotes: [],
    shuffledFlashcards: [],
  };
  lobbies.set(code, newLobby);
  socketToLobby.set(hostID, code);
  return newLobby;
}


export function updateFlashcard(
  socketId: string,
  flashcards: Flashcard[],
  setName: string,
  setID: string,
  description: string = "",
  allowView: boolean = true,
  allowSave: boolean = true,
  authorId: string = "",
  authorName: string = "",
  createdAt: string = "",
  updatedAt: string = "",
) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) {
    return false;
  }
  lobby.flashcards = flashcards;
  lobby.flashcardName = setName == " " ? "Unnamed Set" : setName;
  lobby.flashcardID = setID == " " ? "UNNAMED" : setID;
  lobby.flashcardDescription = description;
  lobby.allowView = allowView;
  lobby.allowSave = allowSave;
  lobby.flashcardAuthorId = authorId;
  lobby.flashcardAuthorName = authorName;
  lobby.flashcardCreatedAt = createdAt;
  lobby.flashcardUpdatedAt = updatedAt;
  lobby.shuffledFlashcards = [];

  const maxPoints = flashcards.length * 10;
  if (maxPoints <= 750) {
    lobby.settings.pointsToWin = maxPoints;
  } else {
    lobby.settings.pointsToWin = 100;
  }
  lobby.settings.roundTime = 15;

  resetPlayerStats(lobby.code);
  return lobby;
}


export function resetPlayerStats(code: string) {
  const lobby = lobbies.get(code);
  if (!lobby) return;

  lobby.players.forEach((player) => {
    player.score = 0;
    player.wins = 0;
    player.miniStatus = null;
    player.answerTimes = [];
    player.totalAnswers = 0;
    player.correctAnswers = 0;
    delete player.isCorrect;
  });

  lobby.endGameVotes = [];
  return lobby;
}

export function updateSettings(socketId: string, settings: Settings) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) {
    return false;
  }
  lobby.settings = settings;
  return lobby;
}

export function addPlayerToLobby(code: string, id: string, name: string) {
  return addPlayer(code, id, name);
}

export function removePlayerFromLobby(socketId: string) {
  const lobby = removePlayer(socketId);

  if (lobby && lobby.players.length == 0) {
    deleteLobby(lobby.code);
    return null;
  }

  return lobby;
}

export function wipeMiniStatus(lobbyCode: string) {
  const lobby = getLobbyByCode(lobbyCode);

  for (const player of lobby?.players || []) {
    player.miniStatus = null;
    player.isCorrect = false;
  }

  return lobby;
}

export function updateLeader(socketId: string) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) {
    return;
  }
  lobby.leader = socketId;
  return lobby;
}


export function deleteLobby(code: string) {
  deleteCode(code);
  lobbies.delete(code);
}

export function getLobbyByCode(code: string) {
  return lobbies.get(code) || null;
}


export function getLobbyBySocket(socketId: string): Lobby | null {
  const lobbyCode = socketToLobby.get(socketId);
  if (!lobbyCode) return null;
  return getLobbyByCode(lobbyCode);
}

export function getAllLobbies() {
  return Array.from(lobbies.values());
}

export function sortPlayersByMetric(lobby: Lobby): Player[] {
  const players = [...lobby.players];

  if (lobby.status === "waiting" || lobby.status === "finished") {
    return players.sort((a, b) => b.wins - a.wins);
  } else {
    return players.sort((a, b) => b.score - a.score);
  }
}
