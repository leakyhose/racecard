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
    if (!nickname.trim()) {
      alert("Missing nickname");
      return;
    }

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
    if (!nickname.trim() || !codeInput.trim()) {
      alert("Missing nickname or lobby code");
      return;
    }

    const handleLobbyData = (lobby: Lobby | null) => {
      if (lobby === null) {
        alert("Lobby invalid");
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-vanilla text-coffee font-executive p-4">
      {notFound && <div className="mb-4 text-terracotta font-bold text-xl uppercase">That lobby doesnt exist!</div>}
      <div className="w-full max-w-md border-4 border-coffee p-8 bg-vanilla shadow-[8px_8px_0px_0px_#644536]">
        <h1 className="text-4xl mb-8 text-center uppercase tracking-widest border-b-4 border-coffee pb-4">Flashcard</h1>
        
        <div className="mb-8 flex flex-col gap-4">
          <label className="text-sm uppercase tracking-wide font-bold">Create New Lobby</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border-2 border-coffee bg-transparent p-3 placeholder-coffee/50 focus:outline-none focus:bg-white/20 uppercase"
              maxLength={15}
              placeholder="YOUR NICKNAME"
              value={nickname}
              onChange={(name) => setNickname(name.target.value)}
            />
            <button 
              className="border-2 border-coffee bg-terracotta text-vanilla px-6 py-3 hover:bg-coffee hover:text-vanilla transition-colors uppercase font-bold cursor-pointer"
              onClick={handleCreateLobby}
            >
              Create
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm uppercase tracking-wide font-bold">Join Existing Lobby</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border-2 border-coffee bg-transparent p-3 placeholder-coffee/50 focus:outline-none focus:bg-white/20 uppercase"
              maxLength={4}
              placeholder="LOBBY CODE"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            />
            <button 
              className="border-2 border-coffee bg-powder text-coffee px-6 py-3 hover:bg-coffee hover:text-vanilla transition-colors uppercase font-bold cursor-pointer"
              onClick={handleJoinLobby}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
