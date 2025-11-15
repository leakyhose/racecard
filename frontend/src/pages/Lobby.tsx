import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";
import { Tabs } from "../components/Tabs";
import { Players } from "../components/Players";
import { Chat } from "../components/Chat";
import { UploadFlashcard } from "../components/UploadFlashcard";

export default function Lobby() {
  const { code } = useParams();
  const location = useLocation();
  const [nickname, setNickname] = useState<string>(
    location.state?.nickname || "",
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [tabNum, setTabNum] = useState(0);
  const [isLeader, setIsLeader] = useState(false);

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
    <div>
      <h2>Lobby Code: {lobby.code}</h2>
      <h2>Your name: {nickname}</h2>
      <Tabs tabNum={tabNum} setTabNum={setTabNum} />
      <div>{tabNum === 0 ? <Chat /> : <Players players={lobby.players} />}</div>
      <UploadFlashcard isLeader={isLeader} />
    </div>
  );
}
