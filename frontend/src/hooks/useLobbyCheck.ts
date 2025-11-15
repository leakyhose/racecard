import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type { Lobby } from "@shared/types";

export function useHandleLobby(code: string | undefined) {
  const navigate = useNavigate();
  const [lobby, setLobby] = useState<Lobby | null | undefined>(undefined);

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true, state: { notFound: true } });
      return;
    }

    const normalizedCode = code.toUpperCase();
    const isValidFormat = /^[A-Za-z]{4}$/.test(code);

    if (!isValidFormat) {
      navigate("/", { replace: true, state: { notFound: true } });
      return;
    }

    if (code !== normalizedCode) {
      navigate(`/${normalizedCode}`, { replace: true });
      return;
    }

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
