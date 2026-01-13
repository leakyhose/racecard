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

  const [splitRatio, setSplitRatio] = useState(0.55);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
      // <=25 cards: play all; >25 cards: play until 100
      const defaultPointsToWin = set.flashcardCount <= 25 
        ? set.flashcardCount * 10 
        : 100;

      const defaultPublicSettings: Settings = {
        shuffle: true,
        fuzzyTolerance: true,
        answerByTerm: false,
        multipleChoice: true,
        roundTime: 15,
        pointsToWin: defaultPointsToWin,
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

  useEffect(() => {
    if (lobby?.status === "waiting") {
      setSplitRatio(0.5);
    }
  }, [lobby?.status]);

  useEffect(() => {
    const handleAutoUpdate = async () => {
      if (!user || !trackedSetId) return;

      try {
        const { error: deleteError } = await supabase
          .from("flashcards")
          .delete()
          .eq("set_id", trackedSetId);

        if (deleteError) throw deleteError;

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

  const prevFlashcardIdRef = useRef(lobby?.flashcardID);

  useEffect(() => {
    if (lobby?.flashcardID !== undefined) {
      setTrackedSetId(lobby.flashcardID || null);

      const flashcardIdChanged = lobby.flashcardID !== prevFlashcardIdRef.current;
      if (flashcardIdChanged) {
        prevFlashcardIdRef.current = lobby.flashcardID;

        setPublicSetInfo(prev => {
          if (prev && prev.id !== lobby.flashcardID) {
            return null;
          }
          return prev;
        });
      }
    }
  }, [lobby?.flashcardID]);

  const prevLobbyIdRef = useRef(lobby?.flashcardID);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!trackedSetId || trackedSetId === "UNNAMED") {
        setIsSaved(false);
        setIsPublicSet(false);
        return;
      }

      if (lobby?.distractorStatus === "generating") {
        return;
      }

      if (
        lobby?.flashcardID &&
        lobby.flashcardID !== prevLobbyIdRef.current &&
        trackedSetId !== lobby.flashcardID
      ) {
        return;
      }

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
        // Not a public set
      }

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

        setIsPublicSet(false);

        const lobbyHasGenerated = lobby?.flashcards.some(
          (f) => f.termGenerated || f.definitionGenerated,
        );

        if (!lobbyHasGenerated) {
          setIsSaved(true);
          return;
        }

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

  useEffect(() => {
    prevLobbyIdRef.current = lobby?.flashcardID;
  }, [lobby?.flashcardID]);

  useEffect(() => {
    if (code) {
      document.title = `RaceCard: ${code.toUpperCase()}`;
    }
    return () => {
      document.title = "RaceCard";
    };
  }, [code]);

  useEffect(() => {
    setIsLeader(lobby?.leader === socket.id);
  }, [lobby]);

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
            username: lobby.flashcardAuthorName,
            createdAt: lobby.flashcardCreatedAt,
            updatedAt: lobby.flashcardUpdatedAt,
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative gap-6 select-none">
        <div className="flex flex-col items-center w-full max-w-md z-10">
          <h1 className="text-5xl md:text-6xl font-black text-coffee tracking-tighter mb-6 text-center">RaceCard</h1>

          <div className="w-full perspective-1000">
            <div className="relative w-full">
              <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[10px] bg-vanilla -z-10"></div>

              <div className="w-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-terracotta)] flex flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-coffee">Join Lobby</h2>
                  <p className="text-lg font-bold text-coffee/70 mt-1">{lobby.code}</p>
                </div>
                <div className="w-full space-y-4">
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
                    className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-terracotta font-bold text-coffee select-text"
                  />
                </div>
                <button
                  onClick={handleJoinLobby}
                  className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none"
                >
                  <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-vanilla bg-terracotta -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                    Join Lobby
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-coffee font-executive overflow-hidden relative select-none">
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
