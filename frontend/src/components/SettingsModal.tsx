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
  type: "boolean"; // Can be extended to text and number in the future
}

const SETTINGS_DEFINITIONS: SettingDefinition[] = [
  { key: "shuffle", label: "Shuffle Flashcards", type: "boolean" },
  { key: "fuzzyTolerance", label: "Fuzzy Tolerance", type: "boolean" },
  { key: "answerByTerm", label: "Use term for answer?", type: "boolean" },
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

  const handleChange = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setSettings((prev) => {
      const updatedSettings = { ...prev, [key]: value };
      onUpdate(updatedSettings);
      return updatedSettings;
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="border border-black bg-white p-4 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Game Settings</h2>
          <button onClick={handleClose} className="text-xl font-bold">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {SETTINGS_DEFINITIONS.map((def) => (
            <div key={def.key} className="flex items-center justify-between">
              <label className="font-medium">{def.label}</label>
              {def.type === "boolean" && (
                <input
                  type="checkbox"
                  checked={!!settings[def.key]}
                  onChange={(e) => handleChange(def.key, e.target.checked)}
                  className="h-5 w-5"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
