import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type { Lobby } from "@shared/types";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [creatingLobby, setCreatingLobby] = useState(false);
  const [joiningLobby, setJoiningLobby] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative gap-8 select-none">
      {/* Auth Buttons */}
      {user ? (
        <div className="absolute top-4 right-4 flex items-center gap-4 z-20">
          <span className="text-sm text-coffee font-bold hidden sm:inline">
            {user.user_metadata.username || user.email}
          </span>
          <button
            onClick={signOut}
            className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none"
          >
            <span className="block rounded-md border-2 border-coffee px-3 py-1 font-bold text-xs text-vanilla bg-terracotta -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
              Sign Out
            </span>
          </button>
        </div>
      ) : (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => navigate("/auth")}
            className="group relative rounded-md bg-coffee border-none p-0 cursor-pointer outline-none"
          >
            <span className="block rounded-md border-2 border-coffee px-4 py-2 font-bold text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
              Sign In
            </span>
          </button>
        </div>
      )}



      {/* Main Content Column */}
      <div className="flex flex-col items-center w-full max-w-md z-10">
        {/* RaceCat */}
        <img src="/images/racecat.png" alt="RaceCat" className="w-48 md:w-64 lg:w-120 object-contain mb-2" />
        
        {/* Title */}
        <h1 className="text-6xl md:text-8xl font-black text-coffee tracking-tighter mb-8 text-center">RaceCard</h1>

        {/* Toggle & Form Container */}
        <div className="w-full flex flex-col items-center space-y-6">
           {/* Toggle */}
           <div className="flex items-center gap-4 text-coffee font-bold text-xl">
              <span 
                className={`transition-opacity duration-300 cursor-pointer ${!isCreateMode ? "opacity-100" : "opacity-50"}`}
                onClick={() => setIsCreateMode(false)}
              >
                Join Lobby
              </span>
              
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isCreateMode}
                  onChange={() => setIsCreateMode(!isCreateMode)}
                />
                {/* Track */}
                <div className="w-14 h-6 bg-terracotta border-2 border-coffee rounded-[5px] shadow-[1px_1px_0px_0px_var(--color-coffee)] transition-colors duration-300 peer-checked:bg-powder box-border relative group">
                  {/* Knob */}
                  <div
                    className={`absolute h-6 w-6 bg-vanilla border-2 border-coffee rounded-md shadow-[0px_3px_0px_0px_var(--color-coffee)] group-hover:shadow-[0px_5px_0px_0px_var(--color-coffee)] transition-all duration-300 -top-[5px] -left-0.5 group-hover:-translate-y-[0.09rem] ${isCreateMode ? "translate-x-8" : ""}`}
                  ></div>
                </div>
              </label>

              <span 
                className={`transition-opacity duration-300 cursor-pointer ${isCreateMode ? "opacity-100" : "opacity-50"}`}
                onClick={() => setIsCreateMode(true)}
              >
                Create Lobby
              </span>
           </div>

           {/* Flipping Card Area */}
           <div className="w-full aspect-4/3 perspective-1000">
              <div className={`relative w-full h-full transition-transform duration-700 transform-3d ${isCreateMode ? 'rotate-y-180' : ''}`}>
                 
                 {/* Front: Join */}
                 <div className="absolute inset-0 backface-hidden w-full h-full">
                    {/* Under Card */}
                    <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[10px] bg-vanilla flex items-end justify-center pb-1 -z-10"></div>
                    
                    {/* Top Card */}
                    <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-terracotta)] flex flex-col items-center justify-center gap-6">
                        <h2 className="text-3xl font-bold text-coffee">Join a Race</h2>
                        <div className="w-full space-y-4">
                            <input
                              type="text"
                              placeholder="Nickname"
                              value={nickname}
                              onChange={(e) => setNickname(e.target.value)}
                              className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-terracotta font-bold text-coffee"
                            />
                            <input
                              type="text"
                              placeholder="Lobby Code"
                              value={codeInput}
                              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                              className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-terracotta uppercase font-bold text-coffee"
                            />
                        </div>
                        <button
                          onClick={handleJoinLobby}
                          disabled={joiningLobby}
                          className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-vanilla bg-terracotta -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                            {joiningLobby ? "Joining..." : "Join Lobby"}
                          </span>
                        </button>
                    </div>
                 </div>

                 {/* Back: Create */}
                 <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full">
                    {/* Under Card */}
                    <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[10px] bg-vanilla flex items-end justify-center pb-1 -z-10"></div>
                    
                    {/* Top Card */}
                    <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-powder)] flex flex-col items-center justify-center gap-6">
                        <h2 className="text-3xl font-bold text-coffee">Start a New Race</h2>
                        <div className="w-full space-y-4">
                            <input
                              type="text"
                              placeholder="Nickname"
                              value={nickname}
                              onChange={(e) => setNickname(e.target.value)}
                              className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-powder font-bold text-coffee"
                            />
                            <div className="text-base text-coffee/70 text-center font-medium">
                                Create a lobby then invite friends.
                            </div>
                        </div>
                        <button
                          onClick={handleCreateLobby}
                          disabled={creatingLobby}
                          className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                            {creatingLobby ? "Creating..." : "Create Lobby"}
                          </span>
                        </button>
                    </div>
                 </div>
              </div>
           </div>

           {notFound && (
            <div className="text-terracotta font-bold text-xl bg-vanilla px-4 py-2 border-2 border-coffee shadow-[4px_4px_0px_0px_var(--color-coffee)]">
              Lobby not found!
            </div>
           )}
        </div>
      </div>
    </div>
  );
}
