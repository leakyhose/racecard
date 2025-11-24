import { useState } from "react";
import { socket } from "../socket";
import { ImportModal } from "../components/ImportModal";
import type { Flashcard, Lobby } from "@shared/types";
import uploadIcon from "@shared/images/upload.svg";

interface UploadFlashcardProps {
  isLeader: boolean;
  lobby: Lobby | null;
}

export function UploadFlashcard({ isLeader, lobby }: UploadFlashcardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isGenerating = lobby?.distractorStatus === "generating";

  const handleImport = (flashcards: Flashcard[]) => {
    socket.emit("updateFlashcard", flashcards);
  };

  const handleClick = () => {
    if (isGenerating) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="relative">
      {isLeader && (
        <>
          <button
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`border-3 border-coffee p-2 transition-colors shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center ${
              shake
                ? "animate-shake bg-terracotta"
                : "bg-terracotta hover:bg-coffee"
            }`}
            title="Upload Flashcards"
          >
            <img
              className="h-8 w-8 filter invert brightness-0 sepia-[.2] saturate-[.2] hue-rotate-20"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(96%) sepia(6%) saturate(1184%) hue-rotate(316deg) brightness(103%) contrast(86%)",
              }} // Vanilla color approximation or just white
              src={uploadIcon}
              alt="Upload flashcards"
            />
          </button>
          {isGenerating && hovered && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-coffee text-vanilla px-3 py-1 text-sm font-bold whitespace-nowrap z-10">
              Generating choices...
            </div>
          )}
          <ImportModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onImport={handleImport}
          />
        </>
      )}
    </div>
  );
}
