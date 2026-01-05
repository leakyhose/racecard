import { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (model: string) => void;
}

export function GenerateModal({ isOpen, onClose, onGenerate }: GenerateModalProps) {
  const [selectedModel, setSelectedModel] = useState<"gemini" | "gpt" | "deepseek">("gemini");
  const mouseDownOnBackdrop = useRef(false);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      mouseDownOnBackdrop.current = true;
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownOnBackdrop.current = false;
  };

  const models = [
    { id: "gpt", label: "GPT-5-NANO" },
    { id: "gemini", label: "GEMINI-FLASH-2.5" },
    { id: "deepseek", label: "DEEPSEEK-CHAT" },
  ] as const;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-100 bg-coffee/50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className="bg-light-vanilla border-3 border-coffee p-8 max-w-md w-full mx-4 select-text">
        <h2 className="text-2xl font-bold tracking-widest border-b-3 border-coffee pb-4 mb-6">
          Select AI Model
        </h2>

        <div className="flex flex-col gap-3 mb-6">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`w-full p-4 border-2 font-bold transition-all duration-200 text-left flex justify-between items-center ${
                selectedModel === model.id
                  ? "border-coffee bg-coffee text-vanilla"
                  : "border-coffee/30 bg-vanilla text-coffee hover:border-coffee"
              }`}
            >
              <span className="tracking-wider">{model.label}</span>
              {selectedModel === model.id && <span>✓</span>}
            </button>
          ))}
        </div>

        <p className="text-xs text-center text-terracotta font-bold mb-6">
          Gemini is recommended, try other models only if it doesn't work.
        </p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(selectedModel)}
            className="flex-1 border-2 border-coffee bg-powder text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold"
          >
            Generate
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
