export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  trickTerms?: string[]; // 3 fake questions
  trickDefinitions?: string[]; // 3 fake answers
  isGenerated?: boolean; // Whether MC options have been generated
  distractors?: string[]; // 3 incorrect alternatives for answer
}

export interface Player {
  id: string;
  name: string;
  wins: number;
  score: number;
  miniStatus: number | string | null;
  isCorrect?: boolean;
}

export interface Settings {
  shuffle: boolean;
  fuzzyTolerance: boolean;
  answerByTerm: boolean;
  multipleChoice: boolean;
  roundTime: number; // Round duration in seconds (3-20)
}

export type GameStatus = "waiting" | "ongoing" | "finished" | "starting";

export interface Lobby {
  code: string;
  players: Player[];
  flashcards: Flashcard[];
  flashcardID: string;
  flashcardName: string;
  status: GameStatus;
  settings: Settings;
  leader: string; // ID of leader
  distractorStatus?: "idle" | "generating" | "ready" | "error";
  generationProgress?: string | undefined; // Progress message
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
  submittedPlayers: string[];
}

export interface ServerToClientEvents {
  lobbyUpdated: (lobby: Lobby) => void;
  scoreUpdate: (players: Player[]) => void;
  chatMessage: (msg: { player: string; id: string; text: string }) => void;
  lobbyData: (lobby: Lobby | null) => void;
  startCountdown: (secondsRemaining: number | string) => void;
  generationProgress: (progress: string) => void;

  newFlashcard: (question: string, choices: string[] | null) => void;
  endGuess: (answer: number, isCorrect: boolean) => void; // Time it took took for guess
  endFlashcard: (flashcardEnd: FlashcardEnd) => void;
}

export interface ClientToServerEvents {
  createLobby: (nickname: string) => void;
  joinLobby: (code: string, nickname: string) => void;
  updateFlashcard: (cards: Flashcard[], name: string, id: string) => void;
  updateSettings: (settings: Settings) => void;
  updateLeader: (nextLeaderId: string) => void;
  startGame: () => void;
  continueGame: () => void;
  sendChat: (msg: string) => void;
  getLobby: (code: string) => void;
  requestCurrentQuestion: () => void;
  generateMultipleChoice: () => void;

  answer: (text: string) => void;
}
