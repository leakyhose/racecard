import { useState, useEffect } from "react";
import type { Settings } from "@shared/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (settings: Settings) => void;
  currentSettings: Settings;
}

interface SettingDefinition {
  key: keyof Settings;
  label: string;
  type: "boolean" | "choice"; // Extended to support choice between two options
  choices?: { value: boolean; label: string }[]; // For choice type
}

const SETTINGS_DEFINITIONS: SettingDefinition[] = [
  { key: "shuffle", label: "Shuffle Flashcards", type: "boolean" },
  { key: "fuzzyTolerance", label: "Fuzzy Tolerance", type: "boolean" },
  {
    key: "answerByTerm",
    label: "Answer By:",
    type: "choice",
    choices: [
      { value: false, label: "Definition" },
      { value: true, label: "Term" },
    ],
  },
  {
    key: "multipleChoice",
    label: "Answer Format:",
    type: "choice",
    choices: [
      { value: true, label: "Multiple Choice" },
      { value: false, label: "Written" },
    ],
  },
];

export function SettingsModal({
  isOpen,
  onClose,
  onUpdate,
  currentSettings,
}: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const handleChange = (
    key: keyof Settings,
    value: Settings[keyof Settings],
  ) => {
    setSettings((prev) => {
      const updatedSettings = { ...prev, [key]: value };
      onUpdate(updatedSettings);
      return updatedSettings;
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-coffee/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="border-3 border-coffee bg-vanilla p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b-3 border-coffee pb-2">
          <h2 className="text-xl font-bold uppercase tracking-wide text-coffee">
            Game Settings
          </h2>
          <button
            onClick={handleClose}
            className="text-xl font-bold text-coffee hover:text-terracotta transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-coffee">
          {SETTINGS_DEFINITIONS.map((def) => (
            <div key={def.key} className="flex items-center justify-between">
              <label className="font-bold uppercase text-sm">{def.label}</label>
              {def.type === "boolean" && (
                <input
                  type="checkbox"
                  checked={!!settings[def.key]}
                  onChange={(e) => handleChange(def.key, e.target.checked)}
                  className="h-6 w-6 accent-terracotta border-2 border-coffee rounded-none focus:ring-0 cursor-pointer"
                />
              )}
              {def.type === "choice" && def.choices && (
                <div className="flex gap-2">
                  {def.choices.map((choice) => {
                    const currentValue = settings[def.key];
                    const isSelected =
                      currentValue !== undefined
                        ? currentValue === choice.value
                        : choice.value === false; // Default to false (Written/Definition)

                    return (
                      <button
                        key={String(choice.value)}
                        onClick={() => handleChange(def.key, choice.value)}
                        className={`px-3 py-2 font-bold uppercase text-sm border-3 border-coffee transition-all transform ${
                          isSelected
                            ? "bg-terracotta text-vanilla scale-105"
                            : "bg-vanilla text-coffee hover:bg-coffee/10"
                        }`}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
