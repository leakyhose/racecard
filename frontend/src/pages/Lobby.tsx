import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import { flushSync } from "react-dom";
import { socket } from "../socket";
import { useCodeValidation } from "../hooks/useCodeValidation";
import { useLobbyData } from "../hooks/useLobbyData";
import { useAuth } from "../hooks/useAuth";
import { Players } from "../components/Players";
import { Chat } from "../components/Chat";
import { GameSettings } from "../components/GameSettings";
import { LobbyHeader } from "../components/LobbyHeader";
import { FlashcardPreview } from "../components/FlashcardPreview";
import { FlashcardStudy } from "../components/FlashcardStudy";
import { Game } from "../components/Game";
import { GameControls } from "../components/GameControls";
import { SaveFlashcardsModal } from "../components/SaveFlashcardsModal";
import { LoadFlashcardsModal } from "../components/LoadFlashcardsModal";
import { LoadFlashcards } from "../components/LoadFlashcards";
import { JumboLoadFlashcards } from "../components/JumboLoadFlashcards";
import { About } from "../components/About";
import { ArrowButton } from "../components/ArrowButton";
import { supabase } from "../supabaseClient";
import { type LoadedPublicSet } from "../utils/loadPublicSet";
import type { Settings } from "@shared/types";

export default function Lobby() {
  const { code } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [nickname, setNickname] = useState<string>(
    location.state?.nickname || "",
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.username && !nickname) {
      setNicknameInput(user.user_metadata.username);
    }
  }, [user, nickname]);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadModalTab, setLoadModalTab] = useState<"personal" | "community">("personal");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [trackedSetId, setTrackedSetId] = useState<string | null>(null);
  const [saveShake, setSaveShake] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
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

  // Global tooltip state
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [lockedSettings, setLockedSettings] = useState<Partial<Settings>>({});
  const [isPublicSet, setIsPublicSet] = useState(false);
  const [publicSetInfo, setPublicSetInfo] = useState<LoadedPublicSet | null>(
    null,
  );
  const [isSetLoading, setIsSetLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"personal" | "community">("community");

  const handleTabChange = (tab: "personal" | "community") => {
    setActiveTab(tab);
    setSearchQuery("");
    setSubmittedQuery("");
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSubmittedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handlePublicSetLoaded = (set: LoadedPublicSet) => {
    setIsSaved(true);
    setIsPublicSet(true);
    setPublicSetInfo(set);
    setLockedSettings(set.settings);
    setTrackedSetId(set.id);

    if (isLeader && lobby) {
      const defaultPublicSettings: Settings = {
        shuffle: true,
        fuzzyTolerance: true,
        answerByTerm: false,
        multipleChoice: true,
        roundTime: 15,
        pointsToWin: set.flashcardCount <= 50 ? 500 : 100,
      };

      const newSettings: Settings = {
        ...defaultPublicSettings,
        ...set.settings,
      } as Settings;

      socket.emit("updateSettings", newSettings);
    }
  };

  const handlePrivateSetLoaded = (saved = false) => {
    setIsPublicSet(false);
    setPublicSetInfo(null);
    setLockedSettings({});
    setIsSaved(saved);
  };

  const handleUnloadSet = () => {
    if (isLeader && lobby) {
      socket.emit("updateFlashcard", [], "", "", "", true, true);
    }
    setIsPublicSet(false);
    setPublicSetInfo(null);
    setLockedSettings({});
    setTrackedSetId(null);
    setSearchQuery("");
    setSubmittedQuery("");
    setActiveTab("community");
  };

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
      const newRatio = Math.min(
        Math.max(relativeY / sidebarRect.height, 0.2),
        0.8,
      );

      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  useCodeValidation(code);

  const lobby = useLobbyData(code);
  const prevDistractorStatus = useRef(lobby?.distractorStatus);

  // Auto-adjust split ratio when game starts/ends
  useEffect(() => {
    if (lobby?.status === "waiting") {
      // Reset to default when back in waiting room
      setSplitRatio(0.5);
    }
  }, [lobby?.status]);

  useEffect(() => {
    const handleAutoUpdate = async () => {
      if (!user || !trackedSetId) return;

      try {
        // Delete old flashcards
        const { error: deleteError } = await supabase
          .from("flashcards")
          .delete()
          .eq("set_id", trackedSetId);

        if (deleteError) throw deleteError;

        // Insert new flashcards
        const flashcardsToInsert = lobby!.flashcards.map((card, index) => ({
          set_id: trackedSetId,
          term: card.question,
          definition: card.answer,
          trick_terms: card.trickTerms || [],
          trick_definitions: card.trickDefinitions || [],
          is_generated: card.isGenerated || false,
          term_generated: card.termGenerated || false,
          definition_generated: card.definitionGenerated || false,
          order_index: index,
        }));

        const { error: insertError } = await supabase
          .from("flashcards")
          .insert(flashcardsToInsert);

        if (insertError) throw insertError;

        // Update local state
        setIsSaved(true);
        setRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        console.error("Failed to auto update:", err);
      }
    };

    if (
      prevDistractorStatus.current === "generating" &&
      lobby?.distractorStatus === "ready" &&
      lobby?.leader === socket.id
    ) {
      handleAutoUpdate();
    }
    prevDistractorStatus.current = lobby?.distractorStatus;
  }, [lobby?.distractorStatus, user, trackedSetId, lobby]);

  // Track the previous flashcard ID to detect external changes
  const prevFlashcardIdRef = useRef(lobby?.flashcardID);

  // Sync trackedSetId with lobby.flashcardID
  // This runs for ALL clients (including non-leaders) when flashcards are updated
  useEffect(() => {
    // Always sync trackedSetId with lobby's flashcardID to ensure non-leaders
    // stay in sync after leadership transfers and when sets are loaded by new leader
    if (lobby?.flashcardID !== undefined) {
      // Update trackedSetId to match lobby state (handles both set and clear)
      setTrackedSetId(lobby.flashcardID || null);
      
      // Clear stale local state when flashcard set changes from an external source
      // (e.g., when another user loads a new set after leadership transfer)
      // This ensures the UI uses lobby data instead of stale local state
      const flashcardIdChanged = lobby.flashcardID !== prevFlashcardIdRef.current;
      if (flashcardIdChanged) {
        prevFlashcardIdRef.current = lobby.flashcardID;
        
        // Only clear publicSetInfo if it's stale (doesn't match the new lobby flashcardID)
        // This preserves the leader's publicSetInfo when they load a set themselves
        setPublicSetInfo(prev => {
          if (prev && prev.id !== lobby.flashcardID) {
            return null;
          }
          return prev;
        });
        
        // Note: We don't clear lockedSettings here because:
        // 1. It only affects the GameSettings UI for the current leader
        // 2. The leader who loads a new set will set it via handlePublicSetLoaded
        // 3. Non-leaders don't interact with locked settings
        // 4. If an old leader becomes leader again, they'll load a new set anyway
      }
    }
  }, [lobby?.flashcardID]);

  const prevLobbyIdRef = useRef(lobby?.flashcardID);

  // Check if current flashcard set is saved and if it needs update
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!trackedSetId || trackedSetId === "UNNAMED") {
        setIsSaved(false);
        setIsPublicSet(false);
        return;
      }

      // Avoid checking while generating to prevent flickering
      if (lobby?.distractorStatus === "generating") {
        return;
      }

      // Prevent flickering during set transition - only guard when the local state
      // hasn't caught up yet. Once trackedSetId syncs, this condition becomes false.
      // Note: This guard allows the effect to run normally for non-leaders who
      // receive flashcard updates via socket after leadership transfer.
      if (
        lobby?.flashcardID &&
        lobby.flashcardID !== prevLobbyIdRef.current &&
        trackedSetId !== lobby.flashcardID
      ) {
        // Set is transitioning but trackedSetId hasn't synced yet - wait for sync
        return;
      }

      // 1. Check if it's a public set (no auth required)
      try {
        const { data: publicSet } = await supabase
          .from("public_flashcard_sets")
          .select("id")
          .eq("id", trackedSetId)
          .single();

        if (publicSet) {
          setIsPublicSet(true);
          setIsSaved(true);
          return;
        }
      } catch {
        // Ignore error, proceed to check private sets
      }

      // 2. Check if it's a private set (auth required)
      if (!user) {
        setIsSaved(false);
        setIsPublicSet(false);
        return;
      }

      try {
        const { data: setData, error } = await supabase
          .from("flashcard_sets")
          .select("id")
          .eq("id", trackedSetId)
          .eq("user_id", user.id)
          .single();

        if (error || !setData) {
          setIsSaved(false);
          setIsPublicSet(false);
          return;
        }

        // It is a private set
        setIsPublicSet(false);

        const lobbyHasGenerated = lobby?.flashcards.some(
          (f) => f.termGenerated || f.definitionGenerated,
        );

        if (!lobbyHasGenerated) {
          setIsSaved(true);
          return;
        }

        // Lobby has generated content, check if it matches DB
        const { data: generatedCards } = await supabase
          .from("flashcards")
          .select("term_generated, definition_generated")
          .eq("set_id", trackedSetId)
          .or("term_generated.eq.true,definition_generated.eq.true")
          .limit(1);

        const dbHasGenerated = generatedCards && generatedCards.length > 0;
        setIsSaved(!!dbHasGenerated);
      } catch {
        setIsSaved(false);
        setIsPublicSet(false);
      }
    };

    checkSavedStatus();
  }, [
    trackedSetId,
    lobby?.flashcards,
    user,
    refreshTrigger,
    lobby?.distractorStatus,
    lobby?.flashcardID,
  ]);

  // Update prevLobbyIdRef after checkSavedStatus
  useEffect(() => {
    prevLobbyIdRef.current = lobby?.flashcardID;
  }, [lobby?.flashcardID]);

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

  // Memoize publicSetInfo to avoid re-creating the object on every render
  // This prevents FlashcardStudy from resetting its state when unrelated settings change
  const flashcardStudyPublicSetInfo = useMemo(() => {
    if (!lobby) return null;
    return publicSetInfo ||
      (lobby.flashcardID
        ? {
            id: lobby.flashcardID,
            name: lobby.flashcardName,
            description: lobby.flashcardDescription,
            allow_view: lobby.allowView,
            allow_save: lobby.allowSave,
            settings: {},
            flashcardCount: lobby.flashcards.length,
            user_id: lobby.flashcardAuthorId,
          }
        : null);
  }, [publicSetInfo, lobby]);

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

    if (
      studyRef.current &&
      contentWrapperRef.current &&
      scrollContainerRef.current
    ) {
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

  const canView = publicSetInfo
    ? publicSetInfo.allow_view !== false
    : lobby.allowView !== false;

  const hasFlashcards = lobby.flashcards.length > 0;

  if (!nickname || !isInLobby) {
    return (
      <div className="select-none">
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
          className="select-text"
        />
        <button onClick={handleJoinLobby}>Join</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-coffee font-executive overflow-hidden relative select-none">
      {/* Global Tooltip */}
      {showTooltip && tooltipText && (
        <div
          className="fixed z-100 pointer-events-none px-2 py-1 bg-coffee text-vanilla text-xs font-bold rounded shadow-lg whitespace-nowrap"
          style={{
            left: `${tooltipPos.x + 10}px`,
            top: `${tooltipPos.y + 10}px`,
          }}
        >
          {tooltipText}
        </div>
      )}
      <div className="relative z-20">
        <LobbyHeader
          code={code!}
          nickname={nickname}
          isLeader={isLeader}
          lobby={lobby}
          isPublicSet={isPublicSet}
          userId={user?.id}
          isSetLoading={isSetLoading}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onUnloadSet={handleUnloadSet}
          onPublicSetLoaded={handlePublicSetLoaded}
        />
      </div>
      <div className="flex flex-1 min-h-0 border-coffee">
        <div
          ref={sidebarRef}
          className="w-65 flex flex-col h-full overflow-hidden relative"
        >
          {lobby.status === "waiting" ? (
            hasFlashcards ? (
              <>
                <div
                  style={{ height: `${splitRatio * 100}%` }}
                  className="flex flex-col min-h-0 overflow-hidden pl-4 pr-4 pt-4 pb-2 mask-[linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]"
                >
                  <LoadFlashcards
                    isLeader={isLeader}
                    refreshTrigger={refreshTrigger}
                    autoSelectedSetId={trackedSetId}
                    onOpenModal={() => {
                      setLoadModalTab("personal");
                      setShowLoadModal(true);
                    }}
                    onOpenPublicModal={() => {
                      setLoadModalTab("community");
                      setShowLoadModal(true);
                    }}
                    isGenerating={lobby?.distractorStatus === "generating"}
                    onPublicSetLoaded={handlePublicSetLoaded}
                    onPrivateSetLoaded={handlePrivateSetLoaded}
                    onLoadingChange={setIsSetLoading}
                    isLoading={isSetLoading}
                    onTooltipChange={(
                      show: boolean,
                      text?: string,
                      x?: number,
                      y?: number,
                    ) => {
                      setShowTooltip(show);
                      if (show && text) {
                        setTooltipText(text);
                      } else if (!show) {
                        setTooltipText(null);
                      }
                      if (x !== undefined && y !== undefined)
                        setTooltipPos({ x, y });
                    }}
                  />
                </div>

                <div
                  className={`absolute h-5 flex items-center justify-center cursor-ns-resize z-50 w-full group transition-colors duration-200`}
                  style={{ top: `calc(${splitRatio * 100}% - 10px)` }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="w-full flex items-center justify-center pointer-events-none px-4">
                    <div
                      className={`flex-1 transition-colors duration-200 ${isDragging ? "bg-coffee h-[3px]" : "bg-coffee/10 h-0.5 group-hover:h-[3px] group-hover:bg-coffee"}`}
                    ></div>
                    <div
                      className={`flex items-center justify-center transition-colors duration-200 ${isDragging ? "text-coffee" : "text-coffee/20 group-hover:text-coffee"}`}
                    >
                      {/* Minimalistic Drag Handle Icon */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 15l-6 6-6-6" />
                        <path d="M18 9l-6-6-6 6" />
                      </svg>
                    </div>
                    <div
                      className={`flex-1 transition-colors duration-200 ${isDragging ? "bg-coffee h-[3px]" : "bg-coffee/10 h-0.5 group-hover:h-[3px] group-hover:bg-coffee"}`}
                    ></div>
                  </div>
                </div>

                <div
                  style={{ height: `${(1 - splitRatio) * 100}%` }}
                  className="flex flex-col min-h-0 overflow-hidden pl-4 pr-4 pb-4 pt-2 mask-[linear-gradient(to_top,black_calc(100%-1.5rem),transparent)]"
                >
                  <Chat />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col min-h-0 pl-4 pr-4 pt-4 pb-2 shrink-0">
                  <About />
                </div>

                <div className="h-5 flex items-center justify-center w-full px-4 shrink-0">
                  <div className="flex-1 bg-coffee/10 h-0.5"></div>
                  <div className="flex-1 bg-coffee/10 h-0.5"></div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden pl-4 pr-4 pb-4 pt-2 mask-[linear-gradient(to_top,black_calc(100%-1.5rem),transparent)]">
                  <Chat />
                </div>
              </>
            )
          ) : (
            <>
              <div className="flex flex-col min-h-0 pl-4 pr-4 pt-4 pb-2 shrink-0">
                <GameControls lobby={lobby} userId={socket.id || ""} />
              </div>

              <div className="h-5 flex items-center justify-center w-full px-4 shrink-0">
                <div className="flex-1 bg-coffee/10 h-0.5"></div>
                <div className="flex-1 bg-coffee/10 h-0.5"></div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden pl-4 pr-4 pb-4 pt-2 mask-[linear-gradient(to_top,black_calc(100%-1.5rem),transparent)]">
                <Chat />
              </div>
            </>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className={`flex-1 relative flex flex-col ${
            currentSection === "all" && !isTransitioning
              ? "overflow-y-auto [&::-webkit-scrollbar]:hidden"
              : "overflow-visible"
          }`}
        >
          {lobby.status === "starting" ||
          lobby.status === "ongoing" ||
          lobby.status === "finished" ? (
            <Game lobby={lobby} />
          ) : (
            <div
              ref={contentWrapperRef}
              className="flex flex-col min-h-full w-full relative"
            >
              {!hasFlashcards ? (
                <div className="h-full w-full">
                  <JumboLoadFlashcards
                    isLeader={isLeader}
                    refreshTrigger={refreshTrigger}
                    onPublicSetLoaded={handlePublicSetLoaded}
                    onPrivateSetLoaded={handlePrivateSetLoaded}
                    onLoadingChange={setIsSetLoading}
                    isLoading={isSetLoading}
                    submittedQuery={submittedQuery}
                    activeTab={activeTab}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </div>
              ) : (
                <>
                  {/* Study section - render when in study mode or transitioning */}
                  {(currentSection === "study" || isTransitioning) && (
                    <div
                      ref={studyRef}
                      className="h-full flex flex-col items-center justify-center shrink-0 w-full pb-20"
                    >
                      <FlashcardStudy
                        flashcards={lobby.flashcards}
                        flashcardName={lobby.flashcardName}
                        flashcardDescription={lobby.flashcardDescription}
                        answerByTerm={lobby.settings.answerByTerm}
                        multipleChoice={lobby.settings.multipleChoice}
                        isSaved={isSaved || isPublicSet}
                        onSave={() => {
                          if (user) {
                            setShowSaveModal(true);
                          } else {
                            setSaveShake(true);
                            setTimeout(() => setSaveShake(false), 500);
                          }
                        }}
                        saveShake={saveShake}
                        publicSetInfo={flashcardStudyPublicSetInfo}
                      />
                      {lobby.flashcards.length > 0 && canView && (
                        <div className="mt-2 relative z-30">
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
                  {(currentSection === "all" || isTransitioning) && canView && (
                    <div
                      ref={allCardsRef}
                      className="w-full pb-20"
                    >
                      <div className="px-4 pt-4">
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
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-65 flex flex-col p-4">
          <Players
            players={lobby.players}
            gameStatus={lobby.status}
            isLeader={isLeader}
            leader={lobby.leader}
            isLoading={isSetLoading || lobby.distractorStatus === 'generating'}
          />

          <div className="pt-4 flex flex-col gap-4">
            <GameSettings
              isLeader={isLeader}
              currentSettings={lobby.settings}
              onUpdate={(settings) => socket.emit("updateSettings", settings)}
              lobby={lobby}
              lockedSettings={lockedSettings}
              onPrivateSetLoaded={handlePrivateSetLoaded}
              isLoading={isSetLoading}
            />
          </div>
        </div>
      </div>

      <SaveFlashcardsModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        flashcards={lobby.flashcards}
        isLeader={isLeader}
        currentName={lobby.flashcardName}
        onSaveSuccess={(newSetId) => {
          setRefreshTrigger((prev) => prev + 1);
          if (newSetId) {
            setTrackedSetId(newSetId);
          }
        }}
      />

      <LoadFlashcardsModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        refreshTrigger={refreshTrigger}
        onDeleteSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        currentSettings={lobby.settings}
        onSetLoaded={handlePrivateSetLoaded}
        onPublicSetLoaded={handlePublicSetLoaded}
        isLeader={isLeader}
        initialTab={loadModalTab}
      />
    </div>
  );
}
