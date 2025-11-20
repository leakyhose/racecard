import { useState } from "react";
import { socket } from "../socket";
import { SettingsModal } from "../components/SettingsModal";
import type { Settings } from "@shared/types";
import uploadIcon from "@shared/images/settings.svg";

interface ChangeSettingsProps {
  isLeader: boolean;
  currentSettings?: Settings;
}

export function ChangeSettings({ isLeader, currentSettings }: ChangeSettingsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChange = (settings: Settings) => {
    socket.emit("updateSettings", settings);
  };

  // Default settings if undefined
  const settingsToUse = currentSettings || { shuffle: true, fuzzyTolerance: true, answerByTerm: false };

  return (
    <div>
      {isLeader && (
        <>
          <button onClick={() => setIsModalOpen(true)}>
            <img
              className="h-10 p-1"
              src={uploadIcon}
              alt="Change settings"
            />
          </button>
          <SettingsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUpdate={handleChange}
            currentSettings={settingsToUse}
          />
        </>
)}
    </div>
  );
}
