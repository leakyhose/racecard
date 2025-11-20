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
          <button 
            onClick={() => setIsModalOpen(true)}
            className="border-3 border-coffee bg-powder p-2 hover:bg-coffee hover:brightness-110 transition-all shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center group"
            title="Game Settings"
          >
            <img
              className="h-8 w-8 transition-all group-hover:invert group-hover:brightness-0 group-hover:sepia group-hover:saturate-50 group-hover:hue-rotate-15"
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
