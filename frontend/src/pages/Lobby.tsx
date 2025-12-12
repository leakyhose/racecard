import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";
import { useAuth } from "../hooks/useAuth";
import { Players } from "../components/Players";
import { Chat } from "../components/Chat";
import { UploadFlashcard } from "../components/UploadFlashcard";
import { ChangeSettings } from "../components/ChangeSettings";
import { LobbyHeader } from "../components/LobbyHeader";
import { FlashcardPreview } from "../components/FlashcardPreview";
import { FlashcardStudy } from "../components/FlashcardStudy";
import { Game } from "../components/Game";
import { SaveFlashcardsModal } from "../components/SaveFlashcardsModal";
import { LoadFlashcardsModal } from "../components/LoadFlashcardsModal";
import { LoadFlashcards } from "../components/LoadFlashcards";
import { ArrowButton } from "../components/ArrowButton";

export default function Lobby() {
  const { code } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [nickname, setNickname] = useState<string>(
    location.state?.nickname || "",
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadHovered, setLoadHovered] = useState(false);
  const [saveHovered, setSaveHovered] = useState(false);
  const [loadShake, setLoadShake] = useState(false);
  const [saveShake, setSaveShake] = useState(false);
  const [currentSection, setCurrentSection] = useState<"study" | "all">(
    "study",
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const allCardsRef = useRef<HTMLDivElement>(null);
  const studyRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  // Resizable sidebar logic
  const [splitRatio, setSplitRatio] = useState(0.55); // DEFAULT RATIO (Change this to set default position)
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sidebarRef.current) return;
      
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const relativeY = e.clientY - sidebarRect.top;
      // MIN/MAX RATIOS (Change 0.2 and 0.8 to set min/max limits)
      const newRatio = Math.min(Math.max(relativeY / sidebarRect.height, 0.2), 0.8);
      
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  useCodeValidation(code);

  const lobby = useLobbyData(code);

  // Update page title with lobby code
  useEffect(() => {
    if (code) {
      document.title = `RaceCard: ${code.toUpperCase()}`;
    }
    return () => {
      document.title = "RaceCard";
    };
  }, [code]);

  // Checks if player user is the leader
  useEffect(() => {
    setIsLeader(lobby?.leader === socket.id);
  }, [lobby]);

  const smoothTransform = (start: number, end: number, duration: number) => {
    const element = contentWrapperRef.current;
    if (!element) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const change = end - start;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const timeElapsed = currentTime - startTime;
        if (timeElapsed < duration) {
          // easeInOutQuad
          let val = timeElapsed / (duration / 2);
          const progress =
            val < 1
              ? (change / 2) * val * val + start
              : (-change / 2) * (--val * (val - 2) - 1) + start;

          element.style.transform = `translateY(${progress}px)`;
          requestAnimationFrame(animate);
        } else {
          element.style.transform = `translateY(${end}px)`;
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  };

  const scrollToAllCards = () => {
    flushSync(() => {
      setIsTransitioning(true);
    });

    if (studyRef.current && contentWrapperRef.current) {
      const studyHeight = studyRef.current.offsetHeight;
      // Lock height
      studyRef.current.style.height = `${studyHeight}px`;

      smoothTransform(0, -studyHeight, 1000).then(() => {
        flushSync(() => {
          setCurrentSection("all");
          setIsTransitioning(false);
        });
        if (contentWrapperRef.current) {
          contentWrapperRef.current.style.transform = "";
        }
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      });
    }
  };

  const scrollToStudy = () => {
    flushSync(() => {
      setIsTransitioning(true);
    });

    if (studyRef.current && contentWrapperRef.current && scrollContainerRef.current) {
      // Lock height to viewport height
      const containerHeight = scrollContainerRef.current.clientHeight;
      studyRef.current.style.height = `${containerHeight}px`;

      const studyHeight = studyRef.current.offsetHeight;
      contentWrapperRef.current.style.transform = `translateY(-${studyHeight}px)`;

      smoothTransform(-studyHeight, 0, 1000).then(() => {
        setCurrentSection("study");
        setIsTransitioning(false);
        if (contentWrapperRef.current) {
          contentWrapperRef.current.style.transform = "";
        }
        if (studyRef.current) {
          studyRef.current.style.height = ""; // Reset
        }
      });
    }
  };

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
          maxLength={15}
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
    <div className="flex flex-col h-screen bg-light-vanilla text-coffee font-executive overflow-hidden">
      <div className="relative z-20">
        <LobbyHeader
          code={code!}
          nickname={nickname}
          isLeader={isLeader}
          lobby={lobby}
        />
      </div>
      {/* */}
            <div className="flex flex-1 min-h-0 border-coffee">
        <div ref={sidebarRef} className="w-65 flex flex-col bg-light-vanilla h-full overflow-hidden relative">
          <div style={{ height: `${splitRatio * 100}%` }} className="flex flex-col min-h-0 overflow-hidden pl-4 pr-4 pt-4 pb-2 mask-[linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]">
            <LoadFlashcards isLeader={isLeader} />
          </div>
          
          {/* Resizable Divider */}
          <div 
            className={`absolute h-5 flex items-center justify-center cursor-ns-resize z-50 w-full group transition-colors duration-200`}
            style={{ top: `calc(${splitRatio * 100}% - 10px)` }}
            onMouseDown={handleMouseDown}
          >
             <div className="w-full flex items-center justify-center pointer-events-none px-4">
                <div className={`flex-1 transition-colors duration-200 ${isDragging ? "bg-coffee h-[3px]" : "bg-coffee/10 h-0.5 group-hover:h-[3px] group-hover:bg-coffee"}`}></div>
                <div className={`flex items-center justify-center transition-colors duration-200 ${isDragging ? "text-coffee" : "text-coffee/20 group-hover:text-coffee"}`}>
                    {/* Minimalistic Drag Handle Icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 15l-6 6-6-6"/>
                        <path d="M18 9l-6-6-6 6"/>
                    </svg>
                </div>
                <div className={`flex-1 transition-colors duration-200 ${isDragging ? "bg-coffee h-[3px]" : "bg-coffee/10 h-0.5 group-hover:h-[3px] group-hover:bg-coffee"}`}></div>
             </div>
          </div>

          <div style={{ height: `${(1 - splitRatio) * 100}%` }} className="flex flex-col min-h-0 overflow-hidden pl-4 pr-4 pb-4 pt-2 mask-[linear-gradient(to_top,black_calc(100%-1.5rem),transparent)]">
            <Chat />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className={`flex-1 bg-light-vanilla relative flex flex-col ${
            currentSection === "all" && !isTransitioning
              ? "overflow-y-auto [&::-webkit-scrollbar]:hidden"
              : "overflow-visible"
          }`}
        >
          {lobby.status === "starting" ||
          lobby.status === "ongoing" ||
          lobby.status === "finished" ? (
            <Game />
          ) : (
            <div
              ref={contentWrapperRef}
              className="flex flex-col min-h-full w-full relative"
            >
              {/* Study section - render when in study mode or transitioning */}
              {(currentSection === "study" || isTransitioning) && (
                <div
                  ref={studyRef}
                  className="h-full bg-light-vanilla flex flex-col items-center justify-center shrink-0 w-full"
                >
                  <FlashcardStudy
                    flashcards={lobby.flashcards}
                    answerByTerm={lobby.settings.answerByTerm}
                    multipleChoice={lobby.settings.multipleChoice}
                  />
                  {lobby.flashcards.length > 0 && (
                    <div className="mt-8 relative z-30">
                      <ArrowButton
                        onClick={scrollToAllCards}
                        disabled={isTransitioning}
                        direction="down"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* All flashcards section - render when in all mode or transitioning */}
              {(currentSection === "all" || isTransitioning) && (
                <div ref={allCardsRef} className="bg-light-vanilla w-full pb-20">
                  <div className="bg-light-vanilla px-4 pt-4">
                    <div className="flex justify-center mb-4">
                      <ArrowButton
                        onClick={scrollToStudy}
                        disabled={isTransitioning}
                        direction="up"
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-coffee text-center pb-4">
                      Flashcards
                    </h2>
                  </div>
                  <div className="sticky top-0 z-50 w-full h-0.5 bg-coffee"></div>
                  <div className="p-4">
                    <FlashcardPreview
                      flashcards={lobby.flashcards}
                      answerByTerm={lobby.settings.answerByTerm}
                      multipleChoice={lobby.settings.multipleChoice}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-65 flex flex-col p-4 bg-light-vanilla">
          <Players
            players={lobby.players}
            gameStatus={lobby.status}
            isLeader={isLeader}
            leader={lobby.leader}
          />

          {isLeader && lobby.status === "waiting" && (
            <div className="p-4 border-2 border-coffee flex flex-col gap-4 bg-vanilla">
              <div className="flex flex-row justify-center gap-15">
                <ChangeSettings
                  isLeader={isLeader}
                  currentSettings={lobby.settings}
                />
                <UploadFlashcard isLeader={isLeader} lobby={lobby} />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (user) {
                      setShowLoadModal(true);
                    } else {
                      setLoadShake(true);
                      setTimeout(() => setLoadShake(false), 500);
                    }
                  }}
                  onMouseEnter={() => setLoadHovered(true)}
                  onMouseLeave={() => setLoadHovered(false)}
                  className={`w-full border-2 border-coffee px-2 py-3 font-bold transition-colors ${
                    loadShake
                      ? "animate-shake bg-red-500 text-vanilla"
                      : "bg-powder text-coffee hover:bg-coffee hover:text-vanilla"
                  }`}
                >
                  {!user && loadHovered ? "Log In to Load" : "Load Flashcards"}
                </button>
                {lobby.flashcards.length > 0 && (
                  <button
                    onClick={() => {
                      if (user) {
                        setShowSaveModal(true);
                      } else {
                        setSaveShake(true);
                        setTimeout(() => setSaveShake(false), 500);
                      }
                    }}
                    onMouseEnter={() => setSaveHovered(true)}
                    onMouseLeave={() => setSaveHovered(false)}
                    className={`w-full border-2 border-coffee px-4 py-3 font-bold transition-colors ${
                      saveShake
                        ? "animate-shake bg-red-500 text-vanilla"
                        : "bg-thistle text-coffee hover:bg-coffee hover:text-vanilla"
                    }`}
                  >
                    {!user && saveHovered
                      ? "Log In to Save"
                      : "Save Flashcards"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SaveFlashcardsModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        flashcards={lobby.flashcards}
      />

      <LoadFlashcardsModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
      />
    </div>
  );
}
