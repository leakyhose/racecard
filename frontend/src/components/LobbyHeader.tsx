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

export function LobbyHeader({ code, isLeader, lobby }: LobbyHeaderProps) {
  const [showCopyMessage, setShowCopyMessage] = useState(false);

  const handleStartGame = () => {
    socket.emit("startGame");
  };

  const handleGenerateMultipleChoice = () => {
    socket.emit("generateMultipleChoice");
  };

  // Check if all flashcards have generated MC options
  const allCardsGenerated =
    lobby.flashcards.length > 0 &&
    lobby.flashcards.every((card) => card.isGenerated);

  const needsGeneration =
    lobby.settings.multipleChoice &&
    lobby.flashcards.length > 0 &&
    !allCardsGenerated;

  const isGenerating = lobby.distractorStatus === "generating";

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(`RaceCard.io/${code}`);
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="flex justify-between relative p-3 items-center bg-light-vanilla text-coffee">
      <div className="flex flex-col gap-0">
        <div
          onClick={handleCopyCode}
          className="font-bold shrink-0 w-72 text-2xl tracking-widest group cursor-pointer inline-block relative"
        >
          RaceCard.io/{code}
          <div className="leading-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-coffee text-vanilla font-bold tracking-wider text-xs pointer-events-none">
            {showCopyMessage ? "Copied!" : "Click to Copy"}
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-coffee">
        {isGenerating ? (
          <div className="font-bold text-lg tracking-wide text-terracotta flex flex-col items-center">
            <div>Generating multiple choices...</div>
            {lobby.generationProgress && (
              <div className="text-sm mt-0">{lobby.generationProgress}</div>
            )}
          </div>
        ) : isLeader ? (
          lobby.flashcards.length == 0 ? (
            <div className="font-bold text-lg tracking-wide">
              Upload or create Flashcards to start
            </div>
          ) : needsGeneration && lobby.status === "waiting" ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleGenerateMultipleChoice}
                disabled={isGenerating}
                className="bg-powder text-coffee px-6 py-1 font-bold hover:bg-coffee hover:text-vanilla transition-colors tracking-widest border-2 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Multiple Choice
              </button>
            </div>
          ) : lobby.distractorStatus === "error" ? (
            <div className="font-bold text-lg tracking-wide text-terracotta">
              Error occurred while generating choices
            </div>
          ) : lobby.status === "waiting" ? (
            <div className="flex gap-4">
              <button
                onClick={handleStartGame}
                disabled={isGenerating}
                className="bg-terracotta text-vanilla px-8 py-1 font-bold hover:bg-coffee hover:text-vanilla transition-colors tracking-widest border-2 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Game
              </button>
              {lobby.settings.multipleChoice && (
                <button
                  onClick={handleGenerateMultipleChoice}
                  disabled={isGenerating}
                  className="bg-powder text-coffee px-6 py-1 font-bold hover:bg-coffee hover:text-vanilla transition-colors tracking-widest border-2 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Again
                </button>
              )}
            </div>
          ) : lobby.status === "finished" ? (
            <div className="font-bold text-lg">Game Finished</div>
          ) : (
            <div className="text-terracotta font-bold">Game in Progress</div>
          )
        ) : lobby.flashcards.length == 0 ? (
          <div className="font-bold text-lg">
            Waiting for leader to upload...
          </div>
        ) : lobby.distractorStatus === "error" ? (
          <div className="font-bold text-lg tracking-wide text-terracotta">
            Error occurred while generating choices
          </div>
        ) : lobby.status === "ongoing" ? (
          <div className="text-terracotta font-bold">Game in progress...</div>
        ) : lobby.status === "finished" ? (
          <div className="font-bold text-lg">
            Waiting for leader to continue...
          </div>
        ) : (
          <div className="font-bold text-lg">
            Waiting for leader to start...
          </div>
        )}
      </div>

      <UserStatusHeader />
    </div>
  );
}
