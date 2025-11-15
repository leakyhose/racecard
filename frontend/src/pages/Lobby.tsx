import { useParams, useLocation } from "react-router-dom";
import { useState } from "react";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";
import { Tabs } from "./Tabs";
import { Players } from "./Players";
import { Chat } from "./Chat";

export default function Lobby() {
  const { code } = useParams();
  const location = useLocation();
  const [nickname, setNickname] = useState<string>(
    location.state?.nickname || "",
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [tabNum, setTabNum] = useState(0);

  useCodeValidation(code);

  const lobby = useLobbyData(code);

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
    </div>
  );
}
