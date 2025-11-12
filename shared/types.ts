export interface Flashcard {
  id: string
  question: string
  answer: string
}

export interface Player {
  id: string
  name: string
  score: number
}

export type GameStatus = 'waiting' | 'ongoing' | 'finished'

export interface Lobby {
  code: string
  hostID: string
  players: Player[]
  flashcards: Flashcard[]
  status: GameStatus
  settings: {
    shuffle: boolean
    fuzzyTolerance: boolean
  }
}

export interface ServerToClientEvents {
  lobbyUpdated: (lobby: Lobby) => void
  flashcardStart: (data: { question: string; duration: number }) => void
  flashcardEnd: (data: { correctAnswer: string }) => void
  scoreUpdate: (players: Player[]) => void
  chatMessage: (msg: { player: string; text: string }) => void
  gameOver: (finalScores: Player[]) => void
}

export interface ClientToServerEvents {
  createLobby: (nickname: string) => void
  joinLobby: (code: string, nickname: string) => void
  loadFlashcards: (cards: Flashcard[]) => void
  startGame: () => void
  answer: (text: string) => void
  sendChat: (msg: string) => void
}
