import { useState } from "react";
import type { Settings, Flashcard, Lobby } from "@shared/types";
import { ImportModal } from "./ImportModal";
import { socket } from "../socket";

interface GameSettingsProps {
  isLeader: boolean;
  currentSettings: Settings;
  onUpdate: (settings: Settings) => void;
  lobby: Lobby | null;
  lockedSettings?: Partial<Settings>;
  onPrivateSetLoaded?: (saved?: boolean) => void;
}

const CustomCheckbox = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled: boolean;
}) => (
  <label
    className={`relative inline-block w-4 h-4 border-2 border-coffee rounded ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    onClick={(e) => {
      if (disabled) return;
      e.stopPropagation();
    }}
  >
    <input
      type="checkbox"
      className="peer sr-only"
      checked={checked}
      onChange={(e) => !disabled && onChange && onChange(e.target.checked)}
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
  lockedSettings = {},
  onPrivateSetLoaded,
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
    if (lockedSettings[key] !== undefined) return; // Prevent changing locked settings
    const updatedSettings = { ...currentSettings, [key]: value };
    onUpdate(updatedSettings);
  };

  const handleImport = (flashcards: Flashcard[]) => {
    socket.emit("updateFlashcard", flashcards, " ", " ", "Unsaved set");
    onPrivateSetLoaded?.(false);
  };

  const handleUploadClick = () => {
    if (isGenerating) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      setIsImportModalOpen(true);
    }
  };

  const isLocked = (key: keyof Settings) => lockedSettings[key] !== undefined;

  return (
    <div
      className={`flex flex-col gap-2 w-full transition-all duration-300 ${!canEdit ? "opacity-60 blur-[0.5px] cursor-not-allowed" : ""}`}
    >
      {lobby && lobby.flashcards.length > 0 && (
        <>
          <div
            className={`flex items-center justify-between ${canEdit && !isLocked("shuffle") ? "cursor-pointer" : "cursor-not-allowed"} ${isLocked("shuffle") ? "opacity-60 blur-[0.5px]" : ""}`}
            onClick={() =>
              canEdit &&
              !isLocked("shuffle") &&
              handleChange("shuffle", !currentSettings.shuffle)
            }
          >
            <label
              className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.shuffle ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit && !isLocked("shuffle") ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              Shuffle Flashcards
            </label>
            <CustomCheckbox
              checked={!!currentSettings.shuffle}
              onChange={(checked) => handleChange("shuffle", checked)}
              disabled={!canEdit || isLocked("shuffle")}
            />
          </div>

          {!currentSettings.multipleChoice && (
            <div
              className={`flex items-center justify-between ${canEdit && !isLocked("fuzzyTolerance") ? "cursor-pointer" : "cursor-not-allowed"} ${isLocked("fuzzyTolerance") ? "opacity-60 blur-[0.5px]" : ""}`}
              onClick={() =>
                canEdit &&
                !isLocked("fuzzyTolerance") &&
                handleChange("fuzzyTolerance", !currentSettings.fuzzyTolerance)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.fuzzyTolerance ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit && !isLocked("fuzzyTolerance") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Fuzzy Tolerance
              </label>
              <CustomCheckbox
                checked={!!currentSettings.fuzzyTolerance}
                onChange={(checked) => handleChange("fuzzyTolerance", checked)}
                disabled={!canEdit || isLocked("fuzzyTolerance")}
              />
            </div>
          )}

          <div
            className={`flex justify-between items-center py-1 ${isLocked("answerByTerm") ? "opacity-60 blur-[0.5px] cursor-not-allowed" : ""}`}
          >
            <div
              className={`flex items-center gap-2 ${canEdit && !isLocked("answerByTerm") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canEdit &&
                !isLocked("answerByTerm") &&
                handleChange("answerByTerm", !currentSettings.answerByTerm)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${!currentSettings.answerByTerm ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit && !isLocked("answerByTerm") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Use Definition
              </label>
              <CustomCheckbox
                checked={!currentSettings.answerByTerm}
                disabled={!canEdit || isLocked("answerByTerm")}
                onChange={() =>
                  canEdit &&
                  !isLocked("answerByTerm") &&
                  handleChange("answerByTerm", !currentSettings.answerByTerm)
                }
              />
            </div>

            <div
              className={`flex items-center gap-2 ${canEdit && !isLocked("answerByTerm") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canEdit &&
                !isLocked("answerByTerm") &&
                handleChange("answerByTerm", !currentSettings.answerByTerm)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.answerByTerm ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit && !isLocked("answerByTerm") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Use Term
              </label>
              <CustomCheckbox
                checked={!!currentSettings.answerByTerm}
                disabled={!canEdit || isLocked("answerByTerm")}
                onChange={() =>
                  canEdit &&
                  !isLocked("answerByTerm") &&
                  handleChange("answerByTerm", !currentSettings.answerByTerm)
                }
              />
            </div>
          </div>

          <div
            className={`flex justify-between items-center py-1 ${isLocked("multipleChoice") ? "opacity-60 blur-[0.5px] cursor-not-allowed" : ""}`}
          >
            <div
              className={`flex items-center gap-2 ${canEdit && !isLocked("multipleChoice") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canEdit &&
                !isLocked("multipleChoice") &&
                handleChange("multipleChoice", !currentSettings.multipleChoice)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${!currentSettings.multipleChoice ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit && !isLocked("multipleChoice") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Written
              </label>
              <CustomCheckbox
                checked={!currentSettings.multipleChoice}
                disabled={!canEdit || isLocked("multipleChoice")}
                onChange={() =>
                  canEdit &&
                  !isLocked("multipleChoice") &&
                  handleChange(
                    "multipleChoice",
                    !currentSettings.multipleChoice,
                  )
                }
              />
            </div>

            <div
              className={`flex items-center gap-2 ${canEdit && !isLocked("multipleChoice") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canEdit &&
                !isLocked("multipleChoice") &&
                handleChange("multipleChoice", !currentSettings.multipleChoice)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.multipleChoice ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canEdit && !isLocked("multipleChoice") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Multiple Choice
              </label>
              <CustomCheckbox
                checked={!!currentSettings.multipleChoice}
                disabled={!canEdit || isLocked("multipleChoice")}
                onChange={() =>
                  canEdit &&
                  !isLocked("multipleChoice") &&
                  handleChange(
                    "multipleChoice",
                    !currentSettings.multipleChoice,
                  )
                }
              />
            </div>
          </div>

          <div
            className={`flex flex-col gap-0.5 ${isLocked("roundTime") ? "opacity-60 blur-[0.5px] cursor-not-allowed" : ""}`}
          >
            <div className="flex justify-between items-center">
              <label className="font-bold text-xs text-coffee">
                Round Time
              </label>
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
              onChange={(e) =>
                handleChange("roundTime", Number(e.target.value))
              }
              disabled={!canEdit || isLocked("roundTime")}
              className="w-full h-1.5 bg-coffee/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-terracotta [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-coffee [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-terracotta [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-coffee [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <label className="font-bold text-xs text-coffee">
                Points to Win
              </label>
              <span className="font-bold text-coffee text-xs">
                {currentSettings.pointsToWin >= 500
                  ? "Play all cards"
                  : currentSettings.pointsToWin || 100}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={currentSettings.pointsToWin || 100}
              onChange={(e) =>
                handleChange("pointsToWin", Number(e.target.value))
              }
              disabled={!canEdit}
              className="w-full h-1.5 bg-coffee/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-terracotta [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-coffee [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-terracotta [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-coffee [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </>
      )}

      {canEdit && (
        <>
          <button
            onClick={handleUploadClick}
            className={` group relative w-full rounded-xl bg-coffee border-none p-0 cursor-pointer outline-none mt-3 ${
              shake ? "animate-shake" : ""
            }`}
          >
            <span
              className={`block w-full h-full rounded-xl border-2 border-coffee px-2 py-2 font-bold text-sm -translate-y-[0.1rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.2rem] group-active:translate-y-0 ${
                shake
                  ? "bg-red-500 text-vanilla"
                  : "bg-powder text-coffee"
              }`}
            >
              Upload Flashcards
            </span>
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
