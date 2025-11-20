import type { Lobby } from "@shared/types";
import { socket } from "../socket";

interface LobbyHeaderProps {
  code: string;
  nickname: string;
  isLeader: boolean;
  lobby: Lobby;
}

export function LobbyHeader({
  code,
  nickname,
  isLeader,
  lobby,
}: LobbyHeaderProps) {
  const handleStartGame = () => {
    socket.emit("startGame");
  };

  return (
    <div className="flex p-4 items-center bg-vanilla text-coffee">
      <div className="font-bold shrink-0 w-72 text-2xl tracking-widest uppercase">LOBBY: {code}</div>
      <div className="flex-1 flex justify-center text-coffee">
        {isLeader ? (
          lobby.flashcards.length == 0 ? (
            <div className="font-bold text-lg uppercase tracking-wide">Upload or create Flashcards to start</div>
          ) : lobby.status === "waiting" ? (
            <button 
              onClick={handleStartGame}
              className="bg-terracotta text-vanilla px-8 py-3 font-bold hover:bg-coffee hover:text-vanilla transition-colors uppercase tracking-widest border-2 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Start Game
            </button>
          ) : lobby.status === "finished" ? (
            <div className="font-bold text-lg uppercase">Game Finished</div>
          ) : (
            <div className="text-terracotta font-bold uppercase animate-pulse">Game in Progress</div>
          )
        ) : lobby.flashcards.length == 0 ? (
          <div className="font-bold text-lg uppercase">Waiting for leader to upload...</div>
        ) : lobby.status === "ongoing" ? (
          <div className="text-terracotta font-bold uppercase animate-pulse">Game in progress...</div>
        ) : lobby.status === "finished" ? (
          <div className="font-bold text-lg uppercase">Waiting for leader to continue...</div>
        ) : (
          <div className="font-bold text-lg uppercase">Waiting for leader to start...</div>
        )}
      </div>
      <div className="font-bold shrink-0 w-80 text-right text-coffee uppercase">
        <span className="text-coffee/70 mr-2">PLAYER:</span> {nickname}
      </div>
    </div>
  );
}
