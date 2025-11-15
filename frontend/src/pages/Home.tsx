import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type { Lobby } from "@shared/types";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState("");
  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    if (location.state?.notFound) {
      setNotFound(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleCreateLobby = () => {
    if (!nickname.trim()) return;

    const handleLobbyUpdated = (lobby: Lobby) => {
      socket.off("lobbyUpdated", handleLobbyUpdated);
      navigate(`/${lobby.code}`, {
        replace: true,
        state: { nickname },
      });
    };

    socket.on("lobbyUpdated", handleLobbyUpdated);
    socket.emit("createLobby", nickname);
  };

  const handleJoinLobby = () => {
    if (!nickname.trim() || !codeInput.trim()) return;

    const handleLobbyData = (lobby: Lobby | null) => {
      if (lobby === null) {
        alert("Lobby not found! Please check the code.");
      } else {
        socket.emit("joinLobby", lobby.code, nickname);
      }
    };

    const handleLobbyUpdated = (lobby: Lobby) => {
      socket.off("lobbyData", handleLobbyData);
      socket.off("lobbyUpdated", handleLobbyUpdated);
      navigate(`/${lobby.code}`, {
        replace: true,
        state: { nickname },
      });
    };

    socket.on("lobbyData", handleLobbyData);
    socket.on("lobbyUpdated", handleLobbyUpdated);
    socket.emit("getLobby", codeInput);
  };

  return (
    <>
      {notFound && <div>That lobby doesnt exist!</div>}
      <div>
        <h1>Flashcard</h1>

        <input
          value={nickname}
          onChange={(name) => setNickname(name.target.value)}
        />

        <div>
          <button onClick={handleCreateLobby}>Create Lobby</button>
        </div>

        <div>
          <input
            placeholder="Lobby code"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          />
          <button onClick={handleJoinLobby}>Join Lobby</button>
        </div>
      </div>
    </>
  );
}
