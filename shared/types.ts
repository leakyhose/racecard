export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  wins: number;
  miniStatus: number | string | null;
}

export interface Settings {
  shuffle: boolean;
  fuzzyTolerance: boolean;
}

export type GameStatus = "waiting" | "ongoing" | "finished" | "starting";

export interface Lobby {
  code: string;
  hostID: string;
  players: Player[];
  flashcards: Flashcard[];
  status: GameStatus;
  settings: Settings;
  leader: string; // ID of leader
}

export interface FlashcardEnd {
  Answer: string;
  fastestPlayers: { player: string; time: number }[];
  wrongAnswers: { player: string; answer: string[] }[];
}

export interface Gamestate {
  flashcards: Flashcard[];
  roundStart: number;
  wrongAnswers: { player: string; answer: string[] }[];
  correctAnswers: { player: string; time: number }[];
}

export interface ServerToClientEvents {
  lobbyUpdated: (lobby: Lobby) => void;
  scoreUpdate: (players: Player[]) => void;
  chatMessage: (msg: { player: string; text: string }) => void;
  lobbyData: (lobby: Lobby | null) => void;
  startCountdown: (secondsRemaining: number | string) => void;

  newFlashcard: (question: string) => void;
  correctGuess: (answer: number) => void; // Time it took to answer correctly
  endFlashcard: (flashcardEnd: FlashcardEnd) => void;
}

export interface ClientToServerEvents {
  createLobby: (nickname: string) => void;
  joinLobby: (code: string, nickname: string) => void;
  updateFlashcard: (cards: Flashcard[]) => void;
  updateSettings: (settings: Settings) => void;
  updateLeader: (nextLeaderId: string) => void;
  startGame: () => void;
  sendChat: (msg: string) => void;
  getLobby: (code: string) => void;
  requestCurrentQuestion: () => void;

  answer: (text: string) => void;
}
