import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";
import { Players } from "../components/Players";
import { Chat } from "../components/Chat";
import { UploadFlashcard } from "../components/UploadFlashcard";
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
  const [countdown, setCountdown] = useState<number | string | null>(null);

  useCodeValidation(code);

  const lobby = useLobbyData(code);

  // Checks if player user is the leader
  useEffect(() => {
    if (lobby && lobby.players[0]?.id === socket.id) {
      setIsLeader(true);
    } else {
      setIsLeader(false);
    }
  }, [lobby]);

  useEffect(() => {
    const handleCountdown = (seconds: number | string) => {
      setCountdown(seconds);
    };

    socket.on("startCountdown", handleCountdown);

    return () => {
      socket.off("startCountdown", handleCountdown);
    };
  }, []);

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
      <LobbyHeader code={code!} nickname={nickname} isLeader={isLeader} lobby={lobby} />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r flex flex-col">
          <Players players={lobby.players} />
          <UploadFlashcard isLeader={isLeader} />
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {lobby.status === "starting" && countdown !== null ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-9xl font-bold">{countdown}</div>
            </div>
          ) : lobby.status === "ongoing" ? (
            <Game/>
          ) : (
            <FlashcardPreview flashcards={lobby.flashcards} />
          )}
        </div>

        <div className="w-80 border-l">
          <Chat />
        </div>
      </div>
    </div>
  );
}
