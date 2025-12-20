import { useState } from "react";
import type { Settings, Flashcard, Lobby } from "@shared/types";
import { ImportModal } from "./ImportModal";
import { socket } from "../socket";

interface GameSettingsProps {
  isLeader: boolean;
  currentSettings: Settings;
  onUpdate: (settings: Settings) => void;
  lobby: Lobby | null;
}

const CustomCheckbox = ({ checked, onChange, disabled }: { checked: boolean; onChange?: (checked: boolean) => void; disabled: boolean }) => (
  <label className={`relative inline-block w-4 h-4 border-2 border-coffee rounded ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`} onClick={(e) => e.stopPropagation()}>
    <input
      type="checkbox"
      className="peer sr-only"
      checked={checked}
      onChange={(e) => onChange && onChange(e.target.checked)}
      disabled={disabled}
    />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-terracotta rounded-[1px] opacity-0 peer-checked:opacity-100 transition-opacity" />
  </label>
);

export function GameSettings({
  isLeader,
  currentSettings,
  onUpdate,
  lobby,
}: GameSettingsProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [shake, setShake] = useState(false);

  const isGenerating = lobby?.distractorStatus === "generating";
  const canEdit = isLeader && lobby?.status === "waiting";

  const handleChange = (
    key: keyof Settings,
    value: Settings[keyof Settings],
  ) => {
    if (!canEdit) return;
    const updatedSettings = { ...currentSettings, [key]: value };
    onUpdate(updatedSettings);
  };

  const handleImport = (flashcards: Flashcard[]) => {
    socket.emit("updateFlashcard", flashcards, " ", " ");
  };

  const handleUploadClick = () => {
    if (isGenerating) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      setIsImportModalOpen(true);
    }
  };

  return (
    <div className={`flex flex-col gap-2 w-full transition-all duration-300 ${!canEdit ? "opacity-60 blur-[0.5px] cursor-not-allowed" : ""}`}>
      <div 
        className={`flex items-center justify-between ${canEdit ? "cursor-pointer" : "pointer-events-none"}`}
        onClick={() => canEdit && handleChange("shuffle", !currentSettings.shuffle)}
      >
        <label className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.shuffle ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit ? "cursor-pointer" : "cursor-not-allowed"}`}>
            Shuffle Flashcards
        </label>
        <CustomCheckbox
          checked={!!currentSettings.shuffle}
          onChange={(checked) => handleChange("shuffle", checked)}
          disabled={!canEdit}
        />
      </div>

      <div 
        className={`flex items-center justify-between ${canEdit ? "cursor-pointer" : "pointer-events-none"}`}
        onClick={() => canEdit && handleChange("fuzzyTolerance", !currentSettings.fuzzyTolerance)}
      >
        <label className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.fuzzyTolerance ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit ? "cursor-pointer" : "cursor-not-allowed"}`}>
            Fuzzy Tolerance
        </label>
        <CustomCheckbox
          checked={!!currentSettings.fuzzyTolerance}
          onChange={(checked) => handleChange("fuzzyTolerance", checked)}
          disabled={!canEdit}
        />
      </div>

      <div className="flex justify-between items-center py-1">
         <div className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "pointer-events-none"}`} onClick={() => canEdit && handleChange("answerByTerm", !currentSettings.answerByTerm)}>
            <label className={`font-bold text-xs text-coffee transition-all duration-300 ${!currentSettings.answerByTerm ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit ? "cursor-pointer" : "cursor-not-allowed"}`}>
                Use Definition
            </label>
            <CustomCheckbox
                checked={!currentSettings.answerByTerm}
                disabled={!canEdit}
                onChange={() => canEdit && handleChange("answerByTerm", !currentSettings.answerByTerm)}
            />
         </div>

         <div className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "pointer-events-none"}`} onClick={() => canEdit && handleChange("answerByTerm", !currentSettings.answerByTerm)}>
            <label className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.answerByTerm ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit ? "cursor-pointer" : "cursor-not-allowed"}`}>
                Use Term
            </label>
            <CustomCheckbox
                checked={!!currentSettings.answerByTerm}
                disabled={!canEdit}
                onChange={() => canEdit && handleChange("answerByTerm", !currentSettings.answerByTerm)}
            />
         </div>
      </div>

      <div className="flex justify-between items-center py-1">
         <div className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "pointer-events-none"}`} onClick={() => canEdit && handleChange("multipleChoice", !currentSettings.multipleChoice)}>
            <label className={`font-bold text-xs text-coffee transition-all duration-300 ${!currentSettings.multipleChoice ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit ? "cursor-pointer" : "cursor-not-allowed"}`}>
                Written
            </label>
            <CustomCheckbox
                checked={!currentSettings.multipleChoice}
                disabled={!canEdit}
                onChange={() => canEdit && handleChange("multipleChoice", !currentSettings.multipleChoice)}
            />
         </div>

         <div className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "pointer-events-none"}`} onClick={() => canEdit && handleChange("multipleChoice", !currentSettings.multipleChoice)}>
            <label className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.multipleChoice ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit ? "cursor-pointer" : "cursor-not-allowed"}`}>
                Multiple Choice
            </label>
            <CustomCheckbox
                checked={!!currentSettings.multipleChoice}
                disabled={!canEdit}
                onChange={() => canEdit && handleChange("multipleChoice", !currentSettings.multipleChoice)}
            />
         </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between items-center">
            <label className="font-bold text-xs text-coffee">Round Time</label>
            <span className="font-bold text-coffee text-xs">
                {Number(currentSettings.roundTime) || 10}s
            </span>
        </div>
        <input
          type="range"
          min={3}
          max={20}
          step={1}
          value={Number(currentSettings.roundTime) || 10}
          onChange={(e) => handleChange("roundTime", Number(e.target.value))}
          disabled={!canEdit}
          className="w-full h-1.5 bg-coffee/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-terracotta [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-coffee [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-terracotta [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-coffee [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {canEdit && (
        <>
          <button
            onClick={handleUploadClick}
            className={`w-full border-2 border-coffee px-2 py-2 font-bold text-sm transition-colors mt-1 ${
              shake
                ? "animate-shake bg-red-500 text-vanilla"
                : "bg-powder text-coffee hover:bg-coffee hover:text-vanilla"
            }`}
          >
            Upload Flashcards
          </button>
          {isGenerating && (
            <div className="text-center text-[10px] font-bold text-coffee/60 mt-0.5">
              Generating choices...
            </div>
          )}
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImport}
          />
        </>
      )}
    </div>
  );
}
