import { useState } from "react";
import { socket } from "../socket";
import { ImportModal } from "../components/ImportModal";
import type { Flashcard } from "@shared/types";

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
      {isLeader ? (
        <>
          <button onClick={() => setIsModalOpen(true)}>
            Upload Flashcards
          </button>
          <ImportModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onImport={handleImport}
          />
        </>
      ) : (
        <div>Waiting for the leader to upload flashcards...</div>
      )}
    </div>
  );
}
