import { useState, useRef } from "react";
import {
  parseFlashcards,
  parseAdvancedFlashcards,
  type TermDefinitionSeparator,
  type RowSeparator,
} from "../utils/flashcardUtils";
import type { Flashcard } from "@shared/types";

const step1Image = "/images/step1.png";
const step2Image = "/images/step2.png";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (flashcards: Flashcard[]) => void;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [termSeparator, setTermSeparator] =
    useState<TermDefinitionSeparator>("tab");
  const [rowSeparator, setRowSeparator] = useState<RowSeparator>("newline");
  const [customTermSep, setCustomTermSep] = useState("");
  const [customRowSep, setCustomRowSep] = useState("");
  const [inputText, setInputText] = useState("");
  const mouseDownOnBackdrop = useRef(false);

  if (!isOpen) return null;

  const handleImport = () => {
    let flashcards: Flashcard[] = [];

    if (mode === "simple") {
      flashcards = parseFlashcards(inputText, {
        termDefinitionSeparator: termSeparator,
        rowSeparator: rowSeparator,
        customTermSeparator: customTermSep,
        customRowSeparator: customRowSep,
      });
    } else {
      flashcards = parseAdvancedFlashcards(inputText, {
        termDefinitionSeparator: termSeparator,
        rowSeparator: rowSeparator,
        customTermSeparator: customTermSep,
        customRowSeparator: customRowSep,
      });
    }

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
      className="fixed inset-0 flex items-center justify-center z-50 bg-coffee/50 cursor-not-allowed"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          mouseDownOnBackdrop.current = true;
        }
      }}
      onClick={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        className="bg-vanilla border-3 border-coffee p-6 max-w-5xl w-full h-[80vh] flex flex-col select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b-3 border-coffee pb-2">
          <div>
            <h2 className="text-2xl font-bold tracking-wide text-coffee">
              Import Flashcards
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xl font-bold px-2 text-coffee hover:text-terracotta transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 gap-8 overflow-hidden text-coffee">
          {/* Left Column - Only in Simple Mode */}
          {mode === "simple" && (
            <div className="w-3/7 border-r-3 border-coffee pr-6 overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">
                How to Import From Quizlet
              </h3>
              <div className="space-y-4 text-sm font-bold">
                <div>
                  <p className="mb-3">
                    1. Download{" "}
                    <a
                      href="https://chromewebstore.google.com/detail/quizlet-exporter-export-f/lkoaedeomnobdibjfdfggjhoiiabpgkl"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-terracotta hover:text-coffee transition-colors"
                    >
                      Quizlet Exporter
                    </a>{" "}
                    from Chrome Web Store
                  </p>
                  <img
                    src={step1Image}
                    alt="Step 1: Make a copy"
                    className="w-full border-2 border-coffee mb-2"
                  />
                </div>
                <div>
                  <p className="mb-3">
                    2. Click on Quizlet Exporter extension while viewing a
                    Quizlet flashcard set.
                  </p>
                  <img
                    src={step2Image}
                    alt="Step 2: Export flashcards"
                    className="w-full border-2 border-coffee mb-4"
                  />
                </div>
                <p>3. Click copy and paste it here!</p>
              </div>
            </div>
          )}

          {/* Right Column / Full Width */}
          <div
            className={`${mode === "simple" ? "w-4/7" : "w-full"} flex flex-col overflow-hidden`}
          >
            <div className="flex gap-8 mb-6 shrink-0">
              <div>
                <h3 className="font-bold mb-2">Between term and definition</h3>
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
                <h3 className="font-bold mb-2">Between rows</h3>
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

              {/* Advanced Mode Instructions */}
              {mode === "advanced" && (
                <div className="flex-1 flex flex-col justify-center text-sm font-bold text-coffee">
                  <p className="mb-2">
                    Each row has 5 values separated by your chosen separator:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mb-2">
                    <li>Question</li>
                    <li>Correct Answer</li>
                    <li>Wrong Answer 1</li>
                    <li>Wrong Answer 2</li>
                    <li>Wrong Answer 3</li>
                  </ul>
                  <p className="mb-0">
                    NOTE: Number of Wrong Answers must be at least 1, and no
                    more than 3.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mb-2">
              <button
                onClick={() =>
                  setMode(mode === "simple" ? "advanced" : "simple")
                }
                className="text-xs font-bold text-coffee hover:text-coffee underline decoration-2 underline-offset-2 transition-colors"
              >
                {mode === "simple"
                  ? "Add multiple choice too (advanced)"
                  : "Input only term and definition"}
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                className="flex-1 border-2 border-coffee bg-white/50 p-3 resize-none font-mono text-sm focus:outline-none focus:bg-white text-coffee placeholder-coffee/50"
                placeholder={
                  mode === "simple"
                    ? "Paste copied text here..."
                    : "Question\tAnswer\tWrong1\tWrong2\tWrong3"
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const newValue =
                      inputText.substring(0, start) +
                      "\t" +
                      inputText.substring(end);
                    setInputText(newValue);
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 1;
                    }, 0);
                  }
                }}
              />
            </div>

            <div className="mt-4 flex justify-end shrink-0">
              <button
                onClick={handleImport}
                className="border-2 border-coffee bg-terracotta text-vanilla px-6 py-2 font-bold hover:bg-coffee hover:text-vanilla transition-colors shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
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
