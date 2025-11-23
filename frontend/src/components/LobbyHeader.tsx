import type { Lobby } from "@shared/types";
import { socket } from "../socket";
import { useState } from "react";
import { UserStatusHeader } from "./UserStatusHeader";

interface LobbyHeaderProps {
  code: string;
  nickname: string;
  isLeader: boolean;
  lobby: Lobby;
}

export function LobbyHeader({
  code,
  isLeader,
  lobby,
}: LobbyHeaderProps) {
  const [showCopyMessage, setShowCopyMessage] = useState(false);

  const handleStartGame = () => {
    socket.emit("startGame");
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="flex justify-between relative p-3 items-center bg-vanilla text-coffee">
      <div className = "flex flex-col gap-0">
        <div
          onClick={handleCopyCode}
          className="font-bold shrink-0 w-72 text-2xl tracking-widest uppercase group cursor-pointer inline-block relative"
        >
          LOBBY: {code}
          <div className="leading-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-coffee text-vanilla font-bold uppercase tracking-wider text-xs pointer-events-none">
            {showCopyMessage ? "Copied!" : "Click to Copy"}
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-coffee">
        {isLeader ? (
          lobby.flashcards.length == 0 ? (
            <div className="font-bold text-lg uppercase tracking-wide">
              Upload or create Flashcards to start
            </div>
          ) : lobby.status === "waiting" ? (
            <button
              onClick={handleStartGame}
              className="bg-terracotta text-vanilla px-8 py-1 font-bold hover:bg-coffee hover:text-vanilla transition-colors uppercase tracking-widest border-2 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Start Game
            </button>
          ) : lobby.status === "finished" ? (
            <div className="font-bold text-lg uppercase">Game Finished</div>
          ) : (
            <div className="text-terracotta font-bold uppercase">
              Game in Progress
            </div>
          )
        ) : lobby.flashcards.length == 0 ? (
          <div className="font-bold text-lg uppercase">
            Waiting for leader to upload...
          </div>
        ) : lobby.status === "ongoing" ? (
          <div className="text-terracotta font-bold uppercase">
            Game in progress...
          </div>
        ) : lobby.status === "finished" ? (
          <div className="font-bold text-lg uppercase">
            Waiting for leader to continue...
          </div>
        ) : (
          <div className="font-bold text-lg uppercase">
            Waiting for leader to start...
          </div>
        )}
      </div>

      <UserStatusHeader />
    </div>
  );
}
