import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type { Lobby } from "@shared/types";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, updateProfile } = useAuth();
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [creatingLobby, setCreatingLobby] = useState(false);
  const [joiningLobby, setJoiningLobby] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    document.title = "RaceCard";
  }, []);

  useEffect(() => {
    if (location.state?.notFound) {
      setNotFound(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (user?.user_metadata?.username) {
      setNickname(user.user_metadata.username);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) return;
    setUpdatingProfile(true);
    const { error } = await updateProfile({ username: newUsername.trim() });
    setUpdatingProfile(false);
    if (error) {
      alert("Failed to update username: " + error.message);
    }
  };

  const handleCreateLobby = () => {
    setCreatingLobby(true);
    if (!nickname.trim()) {
      alert("Missing nickname");
      setCreatingLobby(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleLobbyUpdated = (lobby: Lobby) => {
      if (timer) {
        clearTimeout(timer);
      }
      socket.off("lobbyUpdated", handleLobbyUpdated);
      navigate(`/${lobby.code}`, {
        replace: true,
        state: { nickname },
      });
    };

    timer = setTimeout(() => {
      alert(
        "Server is offline, or is currently booting. Please try again in a few seconds.",
      );
      socket.off("lobbyUpdated", handleLobbyUpdated);
      setCreatingLobby(false);
    }, 3000);

    socket.on("lobbyUpdated", handleLobbyUpdated);
    socket.emit("createLobby", nickname);
  };

  const handleJoinLobby = () => {
    setJoiningLobby(true);

    if (!nickname.trim() || !codeInput.trim()) {
      alert("Missing nickname or lobby code");
      setJoiningLobby(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleLobbyData = (lobby: Lobby | null) => {
      if (timer) {
        clearTimeout(timer);
      }
      if (lobby === null) {
        alert("Lobby invalid");
        setJoiningLobby(false);
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

    timer = setTimeout(() => {
      alert(
        "Server is offline, or is currently booting. Please try again in a few seconds.",
      );
      socket.off("lobbyData", handleLobbyData);
      socket.off("lobbyUpdated", handleLobbyUpdated);
      setJoiningLobby(false);
    }, 3000);

    socket.on("lobbyData", handleLobbyData);
    socket.on("lobbyUpdated", handleLobbyUpdated);
    socket.emit("getLobby", codeInput);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-light-vanilla text-coffee font-executive p-4">
      {user ? (
        <div className="absolute top-4 right-4 flex items-center gap-4 border-2 border-coffee bg-vanilla px-4 py-2">
          <span className="text-sm">
            Signed in as:{" "}
            <span className="font-bold">
              {user.user_metadata.username || user.email}
            </span>
          </span>
          <button
            onClick={signOut}
            className="border-2 border-coffee bg-terracotta text-vanilla px-3 py-1 hover:bg-coffee transition-colors text-xs font-bold"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="absolute top-4 right-4">
          <button
            onClick={() => navigate("/auth")}
            className="border-2 border-coffee bg-powder text-coffee px-4 py-2 hover:bg-coffee hover:text-vanilla transition-colors font-bold"
          >
            Sign In / Sign Up
          </button>
        </div>
      )}

      {user && !user.user_metadata?.username && (
        <div className="fixed inset-0 bg-coffee/50 flex items-center justify-center z-50">
          <div className="bg-vanilla border-3 border-coffee p-8 max-w-md w-full mx-4 shadow-[8px_8px_0px_0px_#644536]">
            <h2 className="text-2xl font-bold text-coffee mb-4">
              Set Username
            </h2>
            <p className="text-coffee/70 mb-6">
              Please set a username to continue. This will be displayed in
              lobbies.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 border-2 border-coffee bg-white/50 p-3 focus:outline-none focus:bg-white font-bold"
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                maxLength={15}
              />
              <button
                onClick={handleUpdateProfile}
                disabled={updatingProfile || !newUsername.trim()}
                className="border-2 border-coffee bg-terracotta text-vanilla px-6 py-3 font-bold hover:bg-coffee transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notFound && (
        <div className="mb-4 text-terracotta font-bold text-xl">
          That lobby doesnt exist!
        </div>
      )}
      <div className="w-full max-w-md border-3 border-coffee p-8 bg-vanilla shadow-[8px_8px_0px_0px_#644536]">
        <h1 className="text-4xl mb-8 text-center tracking-widest border-b-3 border-coffee pb-4 font-bold">
          RaceCard.io
        </h1>

        <div className="mb-8 flex flex-col gap-4">
          <label className="text-sm tracking-wide font-bold">
            Create New Lobby
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 border-2 border-coffee bg-transparent p-3 placeholder-coffee/50 focus:outline-none focus:bg-white/20"
              maxLength={15}
              placeholder="YOUR NICKNAME"
              value={nickname}
              onChange={(name) => setNickname(name.target.value)}
            />

            <button
              disabled={creatingLobby}
              className={
                creatingLobby
                  ? "border-2 border-coffee bg-coffee text-vanilla px-6 py-3 font-bold cursor-not-allowed opacity-70"
                  : "border-2 border-coffee bg-terracotta text-vanilla px-6 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold cursor-pointer"
              }
              onClick={handleCreateLobby}
            >
              {creatingLobby ? "Joining..." : "Create"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm tracking-wide font-bold">
            Join Existing Lobby
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 border-2 border-coffee bg-transparent p-3 placeholder-coffee/50 focus:outline-none focus:bg-white/20 uppercase"
              maxLength={4}
              placeholder="LOBBY CODE"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            />
            <button
              disabled={joiningLobby}
              className={
                joiningLobby
                  ? "border-2 border-coffee bg-coffee text-vanilla px-6 py-3 font-bold cursor-not-allowed opacity-70"
                  : "border-2 border-coffee bg-powder text-coffee px-6 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold cursor-pointer"
              }
              onClick={handleJoinLobby}
            >
              {joiningLobby ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
