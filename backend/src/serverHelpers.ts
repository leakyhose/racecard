import type { Lobby, Player, Flashcard } from "@shared/types.js"
const lobbies = new Map<string, Lobby>()

export function createLobby(hostID: string, hostName: string): Lobby {
  const code = generateCode()
  const newLobby: Lobby = {
    code,
    hostID,
    players: [{ id: hostID, name: hostName, score: 0 }],
    flashcards: [],
    status: "waiting",
    settings: { shuffle: false, fuzzyTolerance: true},
  }
  lobbies.set(code, newLobby)
  return newLobby
}

function generateCode(length:number = 4){
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";

    for(let i = 0; i < length; i ++){
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
}

function getLobby(code:string){
    return lobbies.get(code);
}

export function addPlayer(code: string, id: string, name: string): Lobby | null {
  const lobby = lobbies.get(code)
  if (!lobby) return null
  if (lobby.players.find(p => p.id === id)) return lobby
  lobby.players.push({ id, name, score: 0 })
  return lobby
}

export function getAllLobbies() {
  return Array.from(lobbies.values())
}

