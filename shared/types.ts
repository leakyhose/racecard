export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  trickTerms?: string[]; // 3 fake questions
  trickDefinitions?: string[]; // 3 fake answers
  isGenerated?: boolean; // Whether MC options have been generated
  termGenerated?: boolean;
  definitionGenerated?: boolean;
  distractors?: string[]; // 3 incorrect alternatives for answer
}

export interface Player {
  id: string;
  name: string;
  wins: number;
  score: number;
  miniStatus: number | string | null;
  isCorrect?: boolean;
  answerTimes: number[]; // List of time taken for each correct answer (in ms)
  totalAnswers: number; // Total number of answers attempted
  correctAnswers: number; // Total number of correct answers
}

export interface Settings {
  shuffle: boolean;
  fuzzyTolerance: boolean;
  answerByTerm: boolean;
  multipleChoice: boolean;
  roundTime: number; // Round duration in seconds (3-20)
  pointsToWin: number; // Points needed to win (10 - 5*flashcards.length)
}

export type GameStatus = "waiting" | "ongoing" | "finished" | "starting";

export interface Lobby {
  code: string;
  players: Player[];
  flashcards: Flashcard[];
  flashcardID: string;
  flashcardName: string;
  flashcardDescription?: string;
  flashcardAuthorId?: string;
  allowView?: boolean;
  allowSave?: boolean;
  status: GameStatus;
  settings: Settings;
  leader: string; // ID of leader
  distractorStatus?: "idle" | "generating" | "ready" | "error";
  generationProgress?: string | undefined; // Progress message
  endGameVotes: string[]; // List of player IDs who voted to end the game
  shuffledFlashcards?: Flashcard[]; // Current state of the deck (shuffled/remaining)
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
  cardsPlayed: number; // Track number of cards played in current game
}

export interface ServerToClientEvents {
  lobbyUpdated: (lobby: Lobby) => void;
  settingsUpdated: (settings: Settings) => void;
  flashcardsUpdated: (
    flashcards: Flashcard[],
    flashcardID: string,
    flashcardName: string,
    flashcardDescription?: string,
    allowView?: boolean,
    allowSave?: boolean,
    flashcardAuthorId?: string,
  ) => void;
  playersUpdated: (players: Player[]) => void;
  lobbyStatusUpdated: (status: GameStatus) => void;
  leaderUpdated: (leader: string) => void;
  distractorStatusUpdated: (
    status: "idle" | "generating" | "ready" | "error",
    progress?: string,
  ) => void;
  endGameVotesUpdated: (votes: string[]) => void;

  scoreUpdate: (players: Player[]) => void;
  chatMessage: (msg: { player: string; id: string; text: string }) => void;
  lobbyData: (lobby: Lobby | null) => void;
  startCountdown: (secondsRemaining: number | string) => void;
  generationProgress: (progress: string) => void;

  newFlashcard: (
    question: string,
    choices: string[] | null,
    cardsPlayed?: number,
  ) => void;
  endGuess: (answer: number, isCorrect: boolean) => void; // Time it took took for guess
  endFlashcard: (flashcardEnd: FlashcardEnd) => void;
}

export interface ClientToServerEvents {
  createLobby: (nickname: string) => void;
  joinLobby: (code: string, nickname: string) => void;
  updateFlashcard: (
    cards: Flashcard[],
    name: string,
    id: string,
    description?: string,
    allowView?: boolean,
    allowSave?: boolean,
    authorId?: string,
  ) => void;
  updateSettings: (settings: Settings) => void;
  updateLeader: (nextLeaderId: string) => void;
  startGame: () => void;
  continueGame: () => void;
  sendChat: (msg: string) => void;
  getLobby: (code: string) => void;
  requestCurrentQuestion: () => void;
  generateMultipleChoice: (mode: "term" | "definition" | "both") => void;

  answer: (text: string) => void;
  voteEndGame: () => void;
}
