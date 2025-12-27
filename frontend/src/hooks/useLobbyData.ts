import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type {
  Lobby,
  Player,
  Settings,
  Flashcard,
  GameStatus,
} from "@shared/types";

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

    const handlePlayersUpdated = (players: Player[]) => {
      setLobby((prev) => {
        if (!prev) return prev;
        return { ...prev, players };
      });
    };

    const handleSettingsUpdated = (settings: Settings) => {
      setLobby((prev) => (prev ? { ...prev, settings } : prev));
    };

    const handleFlashcardsUpdated = (
      flashcards: Flashcard[],
      flashcardID: string,
      flashcardName: string,
    ) => {
      setLobby((prev) =>
        prev ? { ...prev, flashcards, flashcardID, flashcardName } : prev,
      );
    };

    const handleLobbyStatusUpdated = (status: GameStatus) => {
      setLobby((prev) => (prev ? { ...prev, status } : prev));
    };

    const handleLeaderUpdated = (leader: string) => {
      setLobby((prev) => (prev ? { ...prev, leader } : prev));
    };

    const handleDistractorStatusUpdated = (
      status: "idle" | "generating" | "ready" | "error",
      progress?: string,
    ) => {
      setLobby((prev) =>
        prev
          ? { ...prev, distractorStatus: status, generationProgress: progress }
          : prev,
      );
    };

    const handleEndGameVotesUpdated = (endGameVotes: string[]) => {
      setLobby((prev) => (prev ? { ...prev, endGameVotes } : prev));
    };

    socket.emit("getLobby", code);
    socket.on("lobbyData", handleLobbyData);
    socket.on("lobbyUpdated", handleLobbyUpdated);
    socket.on("playersUpdated", handlePlayersUpdated);
    socket.on("settingsUpdated", handleSettingsUpdated);
    socket.on("flashcardsUpdated", handleFlashcardsUpdated);
    socket.on("lobbyStatusUpdated", handleLobbyStatusUpdated);
    socket.on("leaderUpdated", handleLeaderUpdated);
    socket.on("distractorStatusUpdated", handleDistractorStatusUpdated);
    socket.on("endGameVotesUpdated", handleEndGameVotesUpdated);

    return () => {
      socket.off("lobbyData", handleLobbyData);
      socket.off("lobbyUpdated", handleLobbyUpdated);
      socket.off("playersUpdated", handlePlayersUpdated);
      socket.off("settingsUpdated", handleSettingsUpdated);
      socket.off("flashcardsUpdated", handleFlashcardsUpdated);
      socket.off("lobbyStatusUpdated", handleLobbyStatusUpdated);
      socket.off("leaderUpdated", handleLeaderUpdated);
      socket.off("distractorStatusUpdated", handleDistractorStatusUpdated);
      socket.off("endGameVotesUpdated", handleEndGameVotesUpdated);
    };
  }, [code, navigate]);

  return lobby;
}
