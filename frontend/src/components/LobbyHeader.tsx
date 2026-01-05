import type { Lobby } from "@shared/types";
import { socket } from "../socket";
import { supabase } from "../supabaseClient";
import { loadPublicSet } from "../utils/loadPublicSet";
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
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  setSubmittedQuery?: (query: string) => void;
  activeTab?: "personal" | "community";
}

export function LobbyHeader({
  code,
  isLeader,
  lobby,
  isPublicSet,
  userId,
  isSetLoading,
  searchQuery,
  setSearchQuery,
  setSubmittedQuery,
  activeTab,
}: LobbyHeaderProps) {
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const LOADING_PHRASES = [
    "Analyzing terms and definitions...",
    "Contextualizing knowledge base...",
    "Crafting plausible distractors...",
    "Optimizing difficulty levels...",
    "Polishing multiple choice options...",
  ];

  const isGenerating = lobby.distractorStatus === "generating";

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setLoadingTextIndex(0);
    }
  }, [isGenerating]);

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

  const handleRandomSet = async () => {
    if (isLoadingRandom || isSetLoading) return;
    setIsLoadingRandom(true);
    
    try {
      const { count, error: countError } = await supabase
        .from("public_flashcard_sets")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      
      if (count) {
        const randomOffset = Math.floor(Math.random() * count);
        const { data, error: fetchError } = await supabase
          .from("public_flashcard_sets")
          .select("id")
          .range(randomOffset, randomOffset)
          .limit(1)
          .single();

        if (fetchError) throw fetchError;
        
        if (data) {
          await loadPublicSet(data.id);
        }
      }
    } catch (err) {
      console.error("Failed to load random set:", err);
    } finally {
      setIsLoadingRandom(false);
    }
  };

  return (
    <div className="flex justify-between relative px-4 py-3 items-center text-coffee">
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
          <div className="font-bold text-lg tracking-wide flex flex-col items-center gap-2">
            {(!lobby.generationProgress ||
              !lobby.generationProgress.toLowerCase().includes("batch")) ? (
              <div className="text-coffee">
                {LOADING_PHRASES[loadingTextIndex]}
              </div>
            ) : (
              <div className="text-coffee">
                {lobby.generationProgress.replace("batches complete", "Batches Generated")}
              </div>
            )}
          </div>
        ) : isLeader ? (
          lobby.flashcards.length == 0 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmittedQuery?.(searchQuery || "");
              }}
              className="w-full flex justify-center"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery?.(e.target.value)}
                placeholder={activeTab === "personal" ? "Search private sets..." : "Search public sets..."}
                className="w-64 px-4 py-2 bg-vanilla border-2 border-coffee rounded-md text-coffee placeholder:text-coffee/30 -translate-y-0.5 transition-transform duration-100 ease-out hover:-translate-y-1 focus:-translate-y-1 font-bold text-sm outline-none focus:shadow-[inset_0_0_0_1px_var(--color-powder)] select-text text-center"
              />
            </form>
          ) : needsGeneration && lobby.status === "waiting" && !isPublicSet ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={canGenerate ? handleGenerateMultipleChoice : undefined}
                disabled={isGenerating || !canGenerate || isSetLoading}
                className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="block w-full h-full rounded-md border-2 border-coffee px-6 py-1 font-bold text-coffee bg-gradient-to-r from-[#b4cded] via-[#e7c8dd] to-[#b4cded] bg-[length:200%_200%] animate-gradient-shift -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 tracking-widest">
                  {canGenerate
                    ? "Generate Multiple Choice with AI"
                    : "Max 200 flashcards for generation"}
                </span>
              </button>
            </div>
          ) : lobby.distractorStatus === "error" ? (
            <div className="font-bold text-lg tracking-wide text-terracotta">
              Error occurred while generating choices
            </div>
          ) : lobby.status === "waiting" ? (
            <div className="flex gap-4 items-center">
              <button
                onClick={handleStartGame}
                disabled={isGenerating || isSetLoading}
                className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span className="block w-full h-full rounded-md border-2 border-coffee px-8 py-1 font-bold text-vanilla bg-terracotta -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 tracking-widest">
                  Start Game
                </span>
              </button>
              {isPublicSet && (
                <button
                  onClick={handleRandomSet}
                  disabled={isGenerating || isSetLoading || isLoadingRandom}
                  className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <span className="block w-full h-full rounded-md border-2 border-coffee px-6 py-1 font-bold text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 tracking-widest">
                    Random Set
                  </span>
                </button>
              )}
              {lobby.settings.multipleChoice && !isPublicSet && (
                <button
                  onClick={
                    canGenerate ? handleGenerateMultipleChoice : undefined
                  }
                  disabled={isGenerating || !canGenerate || isSetLoading}
                  className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <span className="block w-full h-full rounded-md border-2 border-coffee px-6 py-1 font-bold text-coffee bg-gradient-to-r from-[#b4cded] via-[#e7c8dd] to-[#b4cded] bg-[length:200%_200%] animate-gradient-shift -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 tracking-widest">
                    {canGenerate
                      ? "Regenerate Multiple Choice"
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
          <div className="text-coffee font-bold">
            {timeLeft !== null ? `${timeLeft}` : ""}
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
