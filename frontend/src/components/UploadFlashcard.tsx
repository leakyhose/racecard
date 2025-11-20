import { useState } from "react";
import { socket } from "../socket";
import { ImportModal } from "../components/ImportModal";
import type { Flashcard } from "@shared/types";
import uploadIcon from "@shared/images/upload.svg";

interface UploadFlashcardProps {
  isLeader: boolean;
}

export function UploadFlashcard({ isLeader }: UploadFlashcardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImport = (flashcards: Flashcard[]) => {
    socket.emit("updateFlashcard", flashcards);
  };

  return (
    <div>
      {isLeader && (
        <>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="border-3 border-coffee bg-terracotta p-2 hover:bg-coffee transition-colors shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center"
            title="Upload Flashcards"
          >
            <img
              className="h-8 w-8 filter invert brightness-0 sepia-[.2] saturate-[.2] hue-rotate-20" 
              style={{ filter: 'brightness(0) saturate(100%) invert(96%) sepia(6%) saturate(1184%) hue-rotate(316deg) brightness(103%) contrast(86%)' }} // Vanilla color approximation or just white
              src={uploadIcon}
              alt="Upload flashcards"
            />
          </button>
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
