import { useState } from "react";
import {
  parseFlashcards,
  type TermDefinitionSeparator,
  type RowSeparator,
} from "../utils/flashcardUtils";
import type { Flashcard } from "@shared/types";
import step1Image from "@shared/images/step1.png";
import step2Image from "@shared/images/step2.png";

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
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-coffee/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-3 border-coffee bg-vanilla p-6 max-w-5xl w-full h-[80vh] flex flex-col shadow-[8px_8px_0px_0px_#644536]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b-3 border-coffee pb-2">
          <h2 className="text-2xl font-bold uppercase tracking-wide text-coffee">
            Import Flashcards
          </h2>
          <button
            onClick={onClose}
            className="text-xl font-bold px-2 text-coffee hover:text-terracotta transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 gap-8 overflow-hidden text-coffee">
          {/* Left Column */}
          <div className="w-3/7 border-r-3 border-coffee pr-6 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4 uppercase">
              How to Import From Quizlet
            </h3>
            <div className="space-y-4 text-sm font-bold">
              <div>
                <p className="mb-8">
                  1. Make sure that the set you want to import is{" "}
                  <span className="font-bold">in your own library</span>. If it
                  isn't, click the "Make a copy" then "Create".
                </p>
                <img
                  src={step1Image}
                  alt="Step 1: Make a copy"
                  className="w-full border-2 border-coffee mb-4"
                />
              </div>
              <div>
                <p className="mb-8">
                  2. Click the three dot menu button the flashcard set, then
                  click "Export".
                </p>
                <img
                  src={step2Image}
                  alt="Step 2: Export flashcards"
                  className="w-full border-2 border-coffee mb-4"
                />
              </div>
              <p>3. Copy the text over and import!</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-4/7 flex flex-col overflow-hidden">
            <div className="flex gap-8 mb-6 shrink-0">
              <div>
                <h3 className="font-bold mb-2 uppercase">
                  Between term and definition
                </h3>
                <div className="space-y-1 font-bold">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-terracotta transition-colors">
                    <input
                      type="radio"
                      checked={termSeparator === "tab"}
                      onChange={() => setTermSeparator("tab")}
                      className="accent-terracotta"
                    />
                    Tab
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-terracotta transition-colors">
                    <input
                      type="radio"
                      checked={termSeparator === "comma"}
                      onChange={() => setTermSeparator("comma")}
                      className="accent-terracotta"
                    />
                    Comma
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-terracotta transition-colors">
                    <input
                      type="radio"
                      checked={termSeparator === "custom"}
                      onChange={() => setTermSeparator("custom")}
                      className="accent-terracotta"
                    />
                    <span className="mr-1">Custom:</span>
                    <input
                      type="text"
                      className="border-2 border-coffee bg-transparent px-1 w-16 focus:outline-none focus:bg-white/20"
                      value={customTermSep}
                      onChange={(e) => setCustomTermSep(e.target.value)}
                      disabled={termSeparator !== "custom"}
                    />
                  </label>
                </div>
              </div>

              {/* Row Separator */}
              <div>
                <h3 className="font-bold mb-2 uppercase">Between rows</h3>
                <div className="space-y-1 font-bold">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-terracotta transition-colors">
                    <input
                      type="radio"
                      checked={rowSeparator === "newline"}
                      onChange={() => setRowSeparator("newline")}
                      className="accent-terracotta"
                    />
                    New line
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-terracotta transition-colors">
                    <input
                      type="radio"
                      checked={rowSeparator === "semicolon"}
                      onChange={() => setRowSeparator("semicolon")}
                      className="accent-terracotta"
                    />
                    Semicolon
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-terracotta transition-colors">
                    <input
                      type="radio"
                      checked={rowSeparator === "custom"}
                      onChange={() => setRowSeparator("custom")}
                      className="accent-terracotta"
                    />
                    <span className="mr-1">Custom:</span>
                    <input
                      type="text"
                      className="border-2 border-coffee bg-transparent px-1 w-16 focus:outline-none focus:bg-white/20"
                      value={customRowSep}
                      onChange={(e) => setCustomRowSep(e.target.value)}
                      disabled={rowSeparator !== "custom"}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                className="flex-1 border-2 border-coffee bg-white/50 p-3 resize-none font-mono text-sm focus:outline-none focus:bg-white text-coffee placeholder-coffee/50"
                placeholder="Paste copied text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end shrink-0">
              <button
                onClick={handleImport}
                className="border-2 border-coffee bg-terracotta text-vanilla px-6 py-2 font-bold hover:bg-coffee hover:text-vanilla transition-colors uppercase shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                Import Flashcards
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
