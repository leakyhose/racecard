import { useState } from "react";
import type { Settings, Lobby } from "@shared/types";

interface GameSettingsProps {
  isLeader: boolean;
  currentSettings: Settings;
  onUpdate: (settings: Settings) => void;
  lobby: Lobby;
  lockedSettings?: Partial<Settings>;
  isLoading?: boolean;
  onUploadClick?: () => void;
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
  isLoading = false,
  onUploadClick,
}: GameSettingsProps) {
  const [shake, setShake] = useState(false);

  const isGenerating = lobby?.distractorStatus === "generating";
  const canEdit = isLeader && lobby?.status === "waiting";
  const canInteractWithSettings = canEdit && !isGenerating && !isLoading;

  const handleChange = (
    key: keyof Settings,
    value: Settings[keyof Settings],
  ) => {
    if (!canInteractWithSettings) return;
    if (lockedSettings[key] !== undefined) return; // Prevent changing locked settings
    const updatedSettings = { ...currentSettings, [key]: value };
    onUpdate(updatedSettings);
  };

  const handleUploadClick = () => {
    if (isGenerating || isLoading) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      onUploadClick?.();
    }
  };

  const isLocked = (key: keyof Settings) => lockedSettings[key] !== undefined;

  return (
    <div
      className={`flex flex-col gap-2 w-full transition-all duration-300 ${!canInteractWithSettings ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {lobby && lobby.flashcards.length > 0 && (
        <>
          <div
            className={`flex items-center justify-between ${canInteractWithSettings && !isLocked("shuffle") ? "cursor-pointer" : "cursor-not-allowed"} ${isLocked("shuffle") ? "opacity-60" : ""}`}
            onClick={() =>
              canInteractWithSettings &&
              !isLocked("shuffle") &&
              handleChange("shuffle", !currentSettings.shuffle)
            }
          >
            <label
              className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.shuffle ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canInteractWithSettings && !isLocked("shuffle") ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              Shuffle Flashcards
            </label>
            <CustomCheckbox
              checked={!!currentSettings.shuffle}
              onChange={(checked) => handleChange("shuffle", checked)}
              disabled={!canInteractWithSettings || isLocked("shuffle")}
            />
          </div>

          {!currentSettings.multipleChoice && (
            <div
              className={`flex items-center justify-between ${canInteractWithSettings && !isLocked("fuzzyTolerance") ? "cursor-pointer" : "cursor-not-allowed"} ${isLocked("fuzzyTolerance") ? "opacity-60" : ""}`}
              onClick={() =>
                canInteractWithSettings &&
                !isLocked("fuzzyTolerance") &&
                handleChange("fuzzyTolerance", !currentSettings.fuzzyTolerance)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.fuzzyTolerance ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canInteractWithSettings && !isLocked("fuzzyTolerance") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Fuzzy Tolerance
              </label>
              <CustomCheckbox
                checked={!!currentSettings.fuzzyTolerance}
                onChange={(checked) => handleChange("fuzzyTolerance", checked)}
                disabled={!canInteractWithSettings || isLocked("fuzzyTolerance")}
              />
            </div>
          )}

          <div
            className={`flex justify-between items-center py-1 ${isLocked("answerByTerm") ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div
              className={`flex items-center gap-2 ${canInteractWithSettings && !isLocked("answerByTerm") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canInteractWithSettings &&
                !isLocked("answerByTerm") &&
                handleChange("answerByTerm", !currentSettings.answerByTerm)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${!currentSettings.answerByTerm ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canInteractWithSettings && !isLocked("answerByTerm") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Use Definition
              </label>
              <CustomCheckbox
                checked={!currentSettings.answerByTerm}
                disabled={!canInteractWithSettings || isLocked("answerByTerm")}
                onChange={() =>
                  canInteractWithSettings &&
                  !isLocked("answerByTerm") &&
                  handleChange("answerByTerm", !currentSettings.answerByTerm)
                }
              />
            </div>

            <div
              className={`flex items-center gap-2 ${canInteractWithSettings && !isLocked("answerByTerm") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canInteractWithSettings &&
                !isLocked("answerByTerm") &&
                handleChange("answerByTerm", !currentSettings.answerByTerm)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.answerByTerm ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canInteractWithSettings && !isLocked("answerByTerm") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Use Term
              </label>
              <CustomCheckbox
                checked={!!currentSettings.answerByTerm}
                disabled={!canInteractWithSettings || isLocked("answerByTerm")}
                onChange={() =>
                  canInteractWithSettings &&
                  !isLocked("answerByTerm") &&
                  handleChange("answerByTerm", !currentSettings.answerByTerm)
                }
              />
            </div>
          </div>

          <div
            className={`flex justify-between items-center py-1 ${isLocked("multipleChoice") ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div
              className={`flex items-center gap-2 ${canInteractWithSettings && !isLocked("multipleChoice") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canInteractWithSettings &&
                !isLocked("multipleChoice") &&
                handleChange("multipleChoice", !currentSettings.multipleChoice)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${!currentSettings.multipleChoice ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canInteractWithSettings && !isLocked("multipleChoice") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Written
              </label>
              <CustomCheckbox
                checked={!currentSettings.multipleChoice}
                disabled={!canInteractWithSettings || isLocked("multipleChoice")}
                onChange={() =>
                  canInteractWithSettings &&
                  !isLocked("multipleChoice") &&
                  handleChange(
                    "multipleChoice",
                    !currentSettings.multipleChoice,
                  )
                }
              />
            </div>

            <div
              className={`flex items-center gap-2 ${canInteractWithSettings && !isLocked("multipleChoice") ? "cursor-pointer" : "pointer-events-none"}`}
              onClick={() =>
                canInteractWithSettings &&
                !isLocked("multipleChoice") &&
                handleChange("multipleChoice", !currentSettings.multipleChoice)
              }
            >
              <label
                className={`font-bold text-xs text-coffee transition-all duration-300 ${currentSettings.multipleChoice ? "underline decoration-2 underline-offset-2 opacity-100" : "opacity-60"} ${canInteractWithSettings && !isLocked("multipleChoice") ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                Multiple Choice
              </label>
              <CustomCheckbox
                checked={!!currentSettings.multipleChoice}
                disabled={!canInteractWithSettings || isLocked("multipleChoice")}
                onChange={() =>
                  canInteractWithSettings &&
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
            className={`flex flex-col gap-0.5 ${isLocked("roundTime") ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="flex justify-between items-center">
              <label className="font-bold text-xs text-coffee">
                Round Time
              </label>
              <span className="font-bold text-coffee text-xs">
                {Number(currentSettings.roundTime) || 15}s
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={20}
              step={1}
              value={Number(currentSettings.roundTime) || 15}
              onChange={(e) =>
                handleChange("roundTime", Number(e.target.value))
              }
              disabled={!canInteractWithSettings || isLocked("roundTime")}
              className="w-full h-1.5 bg-coffee/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-terracotta [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-coffee [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-terracotta [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-coffee [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <label className="font-bold text-xs text-coffee">
                Points to Win
              </label>
              <span className="font-bold text-coffee text-xs">
                {currentSettings.pointsToWin >=
                Math.min(500, lobby.flashcards.length * 10)
                  ? "Play all cards"
                  : currentSettings.pointsToWin || 100}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={Math.min(500, lobby.flashcards.length * 10)}
              step={10}
              value={
                currentSettings.pointsToWin > 500
                  ? Math.min(500, lobby.flashcards.length * 10)
                  : currentSettings.pointsToWin || 100
              }
              onChange={(e) => {
                const val = Number(e.target.value);
                const maxVal = Math.min(500, lobby.flashcards.length * 10);
                if (val === maxVal) {
                  handleChange("pointsToWin", lobby.flashcards.length * 10);
                } else {
                  handleChange("pointsToWin", val);
                }
              }}
              disabled={!canInteractWithSettings}
              className="w-full h-1.5 bg-coffee/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-terracotta [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-coffee [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-terracotta [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-coffee [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </>
      )}

      {canEdit && (
        <>
          <button
            onClick={handleUploadClick}
            disabled={isGenerating || isLoading}
            className={` group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none mt-3 disabled:opacity-50 disabled:cursor-not-allowed ${
              shake ? "animate-shake" : ""
            }`}
          >
            <span
              className={`block w-full h-full rounded-md border-2 border-coffee px-2 py-2 font-bold text-sm -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 ${
                shake
                  ? "bg-red-500 text-vanilla"
                  : "bg-powder text-coffee"
              }`}
            >
              Upload Flashcards
            </span>
          </button>
        </>
      )}
    </div>
  );
}
