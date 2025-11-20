import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";
import { Players } from "../components/Players";
import { Chat } from "../components/Chat";
import { UploadFlashcard } from "../components/UploadFlashcard";
import { ChangeSettings } from "../components/ChangeSettings";
import { LobbyHeader } from "../components/LobbyHeader";
import { FlashcardPreview } from "../components/FlashcardPreview";
import { Game } from "../components/Game";

export default function Lobby() {
  const { code } = useParams();
  const location = useLocation();
  const [nickname, setNickname] = useState<string>(
    location.state?.nickname || "",
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [isLeader, setIsLeader] = useState(false);

  useCodeValidation(code);

  const lobby = useLobbyData(code);

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
    <div className="flex flex-col h-screen">
      <LobbyHeader
        code={code!}
        nickname={nickname}
        isLeader={isLeader}
        lobby={lobby}
      />

      <div className="flex flex-1 overflow-hidden ">
        <div className="w-64 flex flex-col">
          <Players
            players={lobby.players}
            gameStatus={lobby.status}
            isLeader={isLeader}
            leader={lobby.leader}
          />

          {isLeader && lobby.status === "waiting" && (
            <div>
            <ChangeSettings isLeader={isLeader} currentSettings={lobby.settings} />
            <UploadFlashcard isLeader={isLeader} />
          </div>)}
          
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {lobby.status === "starting" || lobby.status === "ongoing" || lobby.status === "finished" ? (
            <Game />
          ) : (
            <FlashcardPreview flashcards={lobby.flashcards} answerByTerm={lobby.settings.answerByTerm} />
          )}
        </div>

        <div className="w-80 border-l">
          <Chat />
        </div>
      </div>
    </div>
  );
}
