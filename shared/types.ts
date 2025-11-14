export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface Settings {
  shuffle: boolean;
  fuzzyTolerance: boolean;
}

export type GameStatus = "waiting" | "ongoing" | "finished";

export interface Lobby {
  code: string;
  hostID: string;
  players: Player[];
  flashcards: Flashcard[];
  status: GameStatus;
  settings: Settings;
}

export interface ServerToClientEvents {
  lobbyUpdated: (lobby: Lobby) => void;
  flashcardStart: (data: { question: string; duration: number }) => void;
  flashcardEnd: (data: { correctAnswer: string }) => void;
  scoreUpdate: (players: Player[]) => void;
  chatMessage: (msg: { player: string; text: string }) => void;
  gameOver: (finalScores: Player[]) => void;
  lobbyData: (lobby: Lobby | null) => void;
}

export interface ClientToServerEvents {
  createLobby: (nickname: string) => void;
  joinLobby: (code: string, nickname: string) => void;
  updateFlashcard: (cards: Flashcard[]) => void;
  updateSettings: (settings: Settings) => void;
  startGame: () => void;
  answer: (text: string) => void;
  sendChat: (msg: string) => void;
  getLobby: (code: string) => void;
}
