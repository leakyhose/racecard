import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";
import { useAuth } from "../hooks/useAuth";
import { Players } from "../components/Players";
import { Chat } from "../components/Chat";
import { UploadFlashcard } from "../components/UploadFlashcard";
import { ChangeSettings } from "../components/ChangeSettings";
import { LobbyHeader } from "../components/LobbyHeader";
import { FlashcardPreview } from "../components/FlashcardPreview";
import { Game } from "../components/Game";
import { SaveFlashcardsModal } from "../components/SaveFlashcardsModal";
import { LoadFlashcardsModal } from "../components/LoadFlashcardsModal";

export default function Lobby() {
  const { code } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [nickname, setNickname] = useState<string>(
    location.state?.nickname || "",
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadHovered, setLoadHovered] = useState(false);
  const [saveHovered, setSaveHovered] = useState(false);
  const [loadShake, setLoadShake] = useState(false);
  const [saveShake, setSaveShake] = useState(false);

  useCodeValidation(code);

  const lobby = useLobbyData(code);

  // Update page title with lobby code
  useEffect(() => {
    if (code) {
      document.title = `RaceCard: ${code.toUpperCase()}`;
    }
    return () => {
      document.title = "RaceCard";
    };
  }, [code]);

  // Checks if player user is the leader
  useEffect(() => {
    setIsLeader(lobby?.leader === socket.id);
  }, [lobby]);

  const handleJoinLobby = () => {
    if (!nicknameInput.trim()) return;
    setNickname(nicknameInput);
    socket.emit("joinLobby", code!, nicknameInput);
  };

  if (lobby === undefined) {
    return <div>Loading lobby...</div>;
  }

  if (lobby === null) {
    return null;
  }

  const isInLobby = lobby.players.some((player) => player.id === socket.id);

  if (!nickname || !isInLobby) {
    return (
      <div>
        <h2>Join Lobby: {lobby.code}</h2>
        <p>Please enter your nickname to join:</p>
        <input
          maxLength={15}
          type="text"
          placeholder="Your nickname"
          value={nicknameInput}
          onChange={(e) => setNicknameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJoinLobby();
          }}
          autoFocus
        />
        <button onClick={handleJoinLobby}>Join</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-vanilla text-coffee font-executive overflow-hidden">
      <LobbyHeader
        code={code!}
        nickname={nickname}
        isLeader={isLeader}
        lobby={lobby}
      />

      <div className="flex flex-1 overflow-hidden border-t-3 border-coffee">
        <div className="w-65 flex flex-col border-r-3 border-coffee bg-vanilla">
          <Players
            players={lobby.players}
            gameStatus={lobby.status}
            isLeader={isLeader}
            leader={lobby.leader}
          />

          {isLeader && lobby.status === "waiting" && (
            <div className="p-4 border-t-3 border-coffee flex flex-col gap-4 bg-vanilla">
              <div className="flex flex-row justify-center gap-15">
                <ChangeSettings
                  isLeader={isLeader}
                  currentSettings={lobby.settings}
                />
                <UploadFlashcard isLeader={isLeader} lobby={lobby} />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (user) {
                      setShowLoadModal(true);
                    } else {
                      setLoadShake(true);
                      setTimeout(() => setLoadShake(false), 500);
                    }
                  }}
                  onMouseEnter={() => setLoadHovered(true)}
                  onMouseLeave={() => setLoadHovered(false)}
                  className={`w-full border-2 border-coffee px-2 py-3 uppercase font-bold transition-colors ${
                    loadShake
                      ? "animate-shake bg-red-500 text-vanilla"
                      : "bg-powder text-coffee hover:bg-coffee hover:text-vanilla"
                  }`}
                >
                  {!user && loadHovered ? "Log In to Load" : "Load Flashcards"}
                </button>
                {lobby.flashcards.length > 0 && (
                  <button
                    onClick={() => {
                      if (user) {
                        setShowSaveModal(true);
                      } else {
                        setSaveShake(true);
                        setTimeout(() => setSaveShake(false), 500);
                      }
                    }}
                    onMouseEnter={() => setSaveHovered(true)}
                    onMouseLeave={() => setSaveHovered(false)}
                    className={`w-full border-2 border-coffee px-4 py-3 uppercase font-bold transition-colors ${
                      saveShake
                        ? "animate-shake bg-red-500 text-vanilla"
                        : "bg-thistle text-coffee hover:bg-coffee hover:text-vanilla"
                    }`}
                  >
                    {!user && saveHovered
                      ? "Log In to Save"
                      : "Save Flashcards"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-0 overflow-y-auto overflow-x-hidden bg-light-vanilla relative">
          {lobby.status === "starting" ||
          lobby.status === "ongoing" ||
          lobby.status === "finished" ? (
            <Game />
          ) : (
            <div className="h-full p-8 bg-light-vanilla overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-light-vanilla [&::-webkit-scrollbar-thumb]:bg-coffee [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-light-vanilla">
              <FlashcardPreview
                flashcards={lobby.flashcards}
                answerByTerm={lobby.settings.answerByTerm}
              />
            </div>
          )}
        </div>

        <div className="w-65 border-l-3 border-coffee bg-vanilla">
          <Chat />
        </div>
      </div>

      <SaveFlashcardsModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        flashcards={lobby.flashcards}
      />

      <LoadFlashcardsModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
      />
    </div>
  );
}
