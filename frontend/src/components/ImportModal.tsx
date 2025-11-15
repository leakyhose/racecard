import { useState } from "react";
import {
  parseFlashcards,
  type TermDefinitionSeparator,
  type RowSeparator,
} from "../utils/flashcardUtils";
import type { Flashcard } from "@shared/types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (flashcards: Flashcard[]) => void;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [termSeparator, setTermSeparator] =
    useState<TermDefinitionSeparator>("tab");
  const [rowSeparator, setRowSeparator] = useState<RowSeparator>("newline");
  const [customTermSep, setCustomTermSep] = useState("");
  const [customRowSep, setCustomRowSep] = useState("");
  const [inputText, setInputText] = useState("");

  if (!isOpen) return null;

  const handleImport = () => {
    const flashcards = parseFlashcards(inputText, {
      termDefinitionSeparator: termSeparator,
      rowSeparator: rowSeparator,
      customTermSeparator: customTermSep,
      customRowSeparator: customRowSep,
    });

    if (flashcards.length === 0) {
      alert("No valid flashcards found. Check your formatting.");
      return;
    }

    onImport(flashcards);
    setInputText("");
    onClose();
  };

  return (
    <div onClick={onClose}>
      <div style={{ border: "1px solid black" }} onClick={(e) => e.stopPropagation()}>
        <div>
          <h2>Import flashcards</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div>
          <div>
            <h3>Between term and definition</h3>
            <div>
              <label>
                <input
                  type="radio"
                  checked={termSeparator === "tab"}
                  onChange={() => setTermSeparator("tab")}
                />
                Tab
              </label>
            </div>
            <div>
              <label>
                <input
                  type="radio"
                  checked={termSeparator === "comma"}
                  onChange={() => setTermSeparator("comma")}
                />
                Comma
              </label>
            </div>
            <div>
              <label>
                <input
                  type="radio"
                  checked={termSeparator === "custom"}
                  onChange={() => setTermSeparator("custom")}
                />
                <input
                  type="text"
                  placeholder="CUSTOM"
                  value={customTermSep}
                  onChange={(e) => setCustomTermSep(e.target.value)}
                  disabled={termSeparator !== "custom"}
                />
              </label>
            </div>
          </div>

          <div>
            <h3>Between rows</h3>
            <div>
              <label>
                <input
                  type="radio"
                  checked={rowSeparator === "newline"}
                  onChange={() => setRowSeparator("newline")}
                />
                New line
              </label>
            </div>
            <div>
              <label>
                <input
                  type="radio"
                  checked={rowSeparator === "semicolon"}
                  onChange={() => setRowSeparator("semicolon")}
                />
                Semicolon
              </label>
            </div>
            <div>
              <label>
                <input
                  type="radio"
                  checked={rowSeparator === "custom"}
                  onChange={() => setRowSeparator("custom")}
                />
                <input
                  type="text"
                  placeholder="CUSTOM"
                  value={customRowSep}
                  onChange={(e) => setCustomRowSep(e.target.value)}
                  disabled={rowSeparator !== "custom"}
                />
              </label>
            </div>
          </div>
        </div>

        <div>
          <textarea
            placeholder="Paste copied text here!"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>

        <div>
          <button onClick={handleImport}>Import</button>
        </div>
      </div>
    </div>
  );
}
