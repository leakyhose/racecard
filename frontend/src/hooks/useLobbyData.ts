import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type { Lobby } from "@shared/types";

// Keeps lobby instnance updated, redirecting to home if lobby ever doesnt exist
export function useLobbyData(code: string | undefined) {
  const navigate = useNavigate();
  const [lobby, setLobby] = useState<Lobby | null | undefined>(undefined);

  useEffect(() => {
    if (!code) return;

    // Ensure code is uppercase before fetching
    const normalizedCode = code.toUpperCase();
    if (code !== normalizedCode) return; // Fixes race condition

    const handleLobbyData = (lobbyData: Lobby | null) => {
      setLobby(lobbyData);
      if (lobbyData === null) {
        navigate("/", { replace: true, state: { notFound: true } });
      }
    };

    const handleLobbyUpdated = (updatedLobby: Lobby) => {
      if (!updatedLobby) {
        navigate("/", { replace: true, state: { notFound: true } });
      } else {
        setLobby(updatedLobby);
      }
    };

    socket.emit("getLobby", code);
    socket.on("lobbyData", handleLobbyData);
    socket.on("lobbyUpdated", handleLobbyUpdated);

    return () => {
      socket.off("lobbyData", handleLobbyData);
      socket.off("lobbyUpdated", handleLobbyUpdated);
    };
  }, [code, navigate]);

  return lobby;
}
