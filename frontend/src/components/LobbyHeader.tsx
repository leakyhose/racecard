import type { Lobby } from "@shared/types";
import { socket } from "../socket";
import { useState, useEffect, useRef } from "react";
import { UserStatusHeader } from "./UserStatusHeader";

interface LobbyHeaderProps {
  code: string;
  nickname: string;
  isLeader: boolean;
  lobby: Lobby;
  isPublicSet?: boolean;
  userId?: string;
  isSetLoading?: boolean;
}

export function LobbyHeader({
  code,
  isLeader,
  lobby,
  isPublicSet,
  userId,
  isSetLoading,
}: LobbyHeaderProps) {
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleNewFlashcard = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(lobby.settings.roundTime);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleEndFlashcard = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(null);
    };

    socket.on("newFlashcard", handleNewFlashcard);
    socket.on("endFlashcard", handleEndFlashcard);

    return () => {
      socket.off("newFlashcard", handleNewFlashcard);
      socket.off("endFlashcard", handleEndFlashcard);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lobby.settings.roundTime]);

  const handleStartGame = () => {
    socket.emit("startGame");
  };

  const handleGenerateMultipleChoice = () => {
    const mode = lobby.settings.answerByTerm ? "term" : "definition";
    socket.emit("generateMultipleChoice", mode);
  };

  // Check if all flashcards have generated MC options
  const allCardsGenerated =
    lobby.flashcards.length > 0 &&
    lobby.flashcards.every((card) =>
      lobby.settings.answerByTerm
        ? card.termGenerated
        : card.definitionGenerated,
    );

  const needsGeneration =
    lobby.settings.multipleChoice &&
    lobby.flashcards.length > 0 &&
    !allCardsGenerated;

  const isGenerating = lobby.distractorStatus === "generating";

  const isPrivilegedUser = userId === "d0c1b157-eb1f-42a9-bf67-c6384b7ca278";
  const isLargeSet = lobby.flashcards.length >= 200;
  const canGenerate = !isLargeSet || isPrivilegedUser;

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
    <div className="flex justify-between relative px-4 py-3 items-center bg-light-vanilla text-coffee">
      <div className="flex flex-row items-center">
        <div
          onClick={handleCopyCode}
          className="font-bold text-2xl tracking-widest cursor-pointer flex items-center gap-2 group relative select-none"
          title="Click to copy link"
        >
          <span>RaceCard.io/{code}</span>
          <div className="relative flex items-center justify-center w-5 h-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`absolute inset-0 w-5 h-5 text-terracotta transition-opacity duration-300 ${
                showCopyMessage ? "opacity-100" : "opacity-0"
              }`}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`absolute inset-0 w-5 h-5 transition-opacity duration-300 ${
                showCopyMessage
                  ? "opacity-0"
                  : "opacity-0 group-hover:opacity-50"
              }`}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-coffee">
        {isGenerating ? (
          <div className="font-bold text-lg tracking-wide text-terracotta flex flex-col items-center">
            {lobby.generationProgress && (
              <div className="text-sm mt-0">{lobby.generationProgress}</div>
            )}
          </div>
        ) : isLeader ? (
          lobby.flashcards.length == 0 ? (
            <div className="font-bold text-lg tracking-wide">
              Upload or Create RaceCards to Start
            </div>
          ) : needsGeneration && lobby.status === "waiting" && !isPublicSet ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={canGenerate ? handleGenerateMultipleChoice : undefined}
                disabled={isGenerating || !canGenerate || isSetLoading}
                className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="block w-full h-full rounded-md border-2 border-coffee px-6 py-1 font-bold text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 tracking-widest">
                  {canGenerate
                    ? "Generate Multiple Choice"
                    : "Max 200 flashcards for generation"}
                </span>
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
                disabled={isGenerating || isSetLoading}
                className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="block w-full h-full rounded-md border-2 border-coffee px-8 py-1 font-bold text-vanilla bg-terracotta -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 tracking-widest">
                  Start Game
                </span>
              </button>
              {lobby.settings.multipleChoice && !isPublicSet && (
                <button
                  onClick={
                    canGenerate ? handleGenerateMultipleChoice : undefined
                  }
                  disabled={isGenerating || !canGenerate || isSetLoading}
                  className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="block w-full h-full rounded-md border-2 border-coffee px-6 py-1 font-bold text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 tracking-widest">
                    {canGenerate
                      ? "Generate Again"
                      : "Max 200 flashcards for generation"}
                  </span>
                </button>
              )}
            </div>
          ) : lobby.status === "finished" ? (
            <div className="font-bold text-lg">Game Finished</div>
          ) : (
            <div className="text-coffee font-bold">
              {timeLeft !== null ? `${timeLeft}` : ""}
            </div>
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
          <div className="text-terracotta font-bold">
            {timeLeft !== null ? `Time Left: ${timeLeft}s` : ""}
          </div>
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
