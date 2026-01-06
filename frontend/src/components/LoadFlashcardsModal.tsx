import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard, Settings } from "@shared/types";
import { PublishFlashcardsModal } from "./PublishFlashcardsModal";
import { EditFlashcardsModal } from "./EditFlashcardsModal";
import { MyPublishedSetsModal } from "./MyPublishedSetsModal";
import { getRelativeTime } from "../utils/flashcardUtils";
import { loadPublicSet, type LoadedPublicSet } from "../utils/loadPublicSet";

interface FlashcardDBRow {
  term: string;
  definition: string;
  trick_terms: string[] | null;
  trick_definitions: string[] | null;
  is_generated: boolean | null;
  term_generated: boolean | null;
  definition_generated: boolean | null;
  order_index: number | null;
}

interface LoadFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
  onDeleteSuccess?: () => void;
  currentSettings: Settings;
  onSetLoaded?: (saved?: boolean) => void;
  onPublicSetLoaded?: (set: LoadedPublicSet) => void;
  isLeader: boolean;
  initialTab?: "personal" | "community";
}

interface FlashcardSet {
  id: string;
  name: string;
  created_at: string;
  flashcard_count: number;
  has_generated: boolean;
  term_generated?: boolean;
  definition_generated?: boolean;
  plays?: number;
  user_id?: string;
  username?: string;
  description?: string;
}

export function LoadFlashcardsModal({
  isOpen,
  onClose,
  refreshTrigger = 0,
  onDeleteSuccess,
  currentSettings,
  onSetLoaded,
  onPublicSetLoaded,
  isLeader,
  initialTab = "personal",
}: LoadFlashcardsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"personal" | "community">(
    initialTab,
  );
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [publishingSet, setPublishingSet] = useState<FlashcardSet | null>(null);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [showMyPublishedSets, setShowMyPublishedSets] = useState(false);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const mouseDownOnBackdrop = useRef(false);
  const prevRefreshTrigger = useRef(refreshTrigger);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  // Request ID to prevent stale responses from updating state
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Clear sets immediately when tab changes to prevent mixing
  useEffect(() => {
    setSets([]);
    setPage(0);
    setHasMore(true);
    setSearchQuery("");
    setSubmittedQuery("");
  }, [activeTab]);

  const fetchSets = async (
    tab: "personal" | "community",
    pageToFetch: number,
    isInitial: boolean,
    currentRequestId: number
  ) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError("");

    try {
      const from = pageToFetch * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let data: FlashcardSet[] = [];
      let fetchError = null;

      if (tab === "personal") {
        if (!user) {
          setSets([]);
          setLoading(false);
          setIsLoadingMore(false);
          return;
        }
        const result = await supabase
          .from("flashcard_sets")
          .select("id, name, created_at, user_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);

        data = result.data
          ? result.data.map((item) => ({
              ...item,
              flashcard_count: 0,
              has_generated: false,
            }))
          : [];
        fetchError = result.error;
      } else {
        let query = supabase
          .from("public_flashcard_sets")
          .select(
            "id, name, description, created_at, updated_at, plays, user_id, username",
          );

        if (submittedQuery.trim()) {
          query = query.textSearch("search_vector", submittedQuery);
        } else {
          query = query
            .order("plays", { ascending: false })
            .order("id", { ascending: true });
        }

        const result = await query.range(from, to);

        data = result.data
          ? result.data.map((item) => ({
              ...item,
              flashcard_count: 0,
              has_generated: false,
            }))
          : [];
        fetchError = result.error;
      }

      // Check if this request is stale (tab changed during fetch)
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      if (fetchError) throw fetchError;

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Get flashcard counts for each set
      const setsWithCounts = await Promise.all(
        (data || []).map(async (set) => {
          const { count } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq(tab === "personal" ? "set_id" : "public_set_id", set.id);

          // Check if any flashcards have generated MC options
          const { count: termGenCount } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq(tab === "personal" ? "set_id" : "public_set_id", set.id)
            .eq("term_generated", true);

          const { count: defGenCount } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq(tab === "personal" ? "set_id" : "public_set_id", set.id)
            .eq("definition_generated", true);

          const hasTermGen = (termGenCount || 0) > 0;
          const hasDefGen = (defGenCount || 0) > 0;

          return {
            ...set,
            flashcard_count: count || 0,
            has_generated: hasTermGen || hasDefGen,
            term_generated: hasTermGen,
            definition_generated: hasDefGen,
          };
        }),
      );

      // Check again if this request is stale after all the async work
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      if (isInitial) {
        setSets(setsWithCounts);
      } else {
        setSets((prev) => [...prev, ...setsWithCounts]);
      }
    } catch (err) {
      // Only show error if this request is still current
      if (requestIdRef.current === currentRequestId) {
        console.error(err);
        setError("Failed to load flashcard sets");
      }
    } finally {
      // Only update loading state if this request is still current
      if (requestIdRef.current === currentRequestId) {
        setLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const isRefresh = refreshTrigger !== prevRefreshTrigger.current;
      // Increment request ID to invalidate any in-flight requests
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;
      
      // Reset pagination state
      setPage(0);
      setHasMore(true);
      
      // Fetch with current tab and request ID
      fetchSets(activeTab, 0, true, currentRequestId);
      
      if (isRefresh) {
        prevRefreshTrigger.current = refreshTrigger;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, refreshTrigger, user, submittedQuery]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 50 &&
      !loading &&
      !isLoadingMore &&
      hasMore
    ) {
      const nextPage = page + 1;
      setPage(nextPage);
      // Use the current request ID for pagination
      fetchSets(activeTab, nextPage, false, requestIdRef.current);
    }
  };

  const handleLoadSet = async (setId: string, setName: string) => {
    setLoadingSetId(setId);
    setError("");

    if (activeTab === "community") {
      try {
        const loadedSet = await loadPublicSet(setId);
        if (loadedSet) {
          onPublicSetLoaded?.(loadedSet);
          onClose();
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load public set");
      } finally {
        setLoadingSetId(null);
      }
      return;
    }

    try {
      let allData: FlashcardDBRow[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from("flashcards")
          .select(
            "term, definition, trick_terms, trick_definitions, is_generated, term_generated, definition_generated, order_index",
          )
          .eq("set_id", setId)
          .order("order_index", { ascending: true })
          .order("id", { ascending: true }) // Fallback for old cards
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        setError("This set has no flashcards");
        return;
      }

      // Convert to Flashcard format and send to server
      const flashcards: Flashcard[] = allData.map((card, index) => ({
        id: index.toString(),
        question: card.term,
        answer: card.definition,
        trickTerms: card.trick_terms || [],
        trickDefinitions: card.trick_definitions || [],
        isGenerated:
          (card.term_generated && card.definition_generated) ||
          card.is_generated ||
          false,
        termGenerated: card.term_generated || false,
        definitionGenerated: card.definition_generated || false,
      }));

      socket.emit(
        "updateFlashcard",
        flashcards,
        setName,
        setId,
        `${user?.user_metadata?.username || "User"}'s private set`,
      );
      onSetLoaded?.(true);
      onClose();
    } catch {
      setError("Failed to load flashcards");
    } finally {
      setLoadingSetId(null);
    }
  };

  const handleRandom = async () => {
    if (loadingSetId) return;

    if (!isLeader) {
      // Find a random card to shake or just show a message
      // Since we can't easily shake a specific card, we might need a general notification
      // Or we can just ignore the click. 
      // User requested "shake and say must be leader".
      // But the "Random" button is in the search bar.
      // We can add a shake effect to the button itself or show an error.
      // For now, let's just return to prevent action.
      // Ideally we shake the button.
      const btn = document.getElementById("random-set-btn");
      if (btn) {
        btn.classList.add("animate-shake");
        // Also show tooltip or change text temporarily?
        const originalText = btn.innerText;
        btn.innerText = "Leader Only";
        btn.classList.add("bg-terracotta", "border-terracotta");
        setTimeout(() => {
          btn.classList.remove("animate-shake");
          btn.innerText = originalText;
          btn.classList.remove("bg-terracotta", "border-terracotta");
        }, 1000);
      }
      return;
    }

    setLoadingSetId("random");
    
    try {
      const { count, error: countError } = await supabase
        .from("public_flashcard_sets")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      
      if (count) {
        const randomOffset = Math.floor(Math.random() * count);
        const { data, error: fetchError } = await supabase
          .from("public_flashcard_sets")
          .select("id, name")
          .range(randomOffset, randomOffset)
          .limit(1)
          .single();

        if (fetchError) throw fetchError;
        
        if (data) {
          await handleLoadSet(data.id, data.name);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load random set");
      setLoadingSetId(null);
    }
  };

  const handleDelete = async (setId: string, setName: string) => {
    if (!confirm(`Are you sure you want to delete "${setName}"?`)) {
      return;
    }

    try {
      // Delete flashcards first (foreign key constraint)
      const { error: deleteCardsError } = await supabase
        .from("flashcards")
        .delete()
        .eq("set_id", setId);

      if (deleteCardsError) throw deleteCardsError;

      // Delete the set
      const { error: deleteSetError } = await supabase
        .from("flashcard_sets")
        .delete()
        .eq("id", setId);

      if (deleteSetError) throw deleteSetError;

      // Refresh the list
      requestIdRef.current += 1;
      setPage(0);
      setHasMore(true);
      fetchSets(activeTab, 0, true, requestIdRef.current);
      onDeleteSuccess?.();
    } catch {
      setError("Failed to delete flashcard set");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-coffee/50 cursor-not-allowed"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          mouseDownOnBackdrop.current = true;
        }
      }}
      onClick={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
          if (loadingSetId === null) {
            onClose();
          }
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        className="bg-light-vanilla border-3 border-coffee p-8 max-w-7xl w-full mx-4 h-[90vh] flex flex-col select-text"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className={`flex justify-between items-center pb-6 shrink-0 ${activeTab !== "community" ? "border-b-3 border-coffee" : ""}`}>
          {/* Left spacer for centering */}
          <div className="w-48 shrink-0"></div>

          {/* Center tabs */}
          <div className="flex justify-center items-center gap-6">
          <button
            className={`tab-btn left-arrow ${activeTab === "personal" ? "active" : ""}`}
            onClick={() => setActiveTab("personal")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            <p data-text="Private">Private</p>
          </button>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={activeTab === "community"}
              onChange={() =>
                setActiveTab(
                  activeTab === "personal" ? "community" : "personal",
                )
              }
            />

            {/* Track */}
            <div className="w-10 h-4 bg-terracotta/90 border-2 border-coffee rounded-[5px] shadow-[1px_1px_0px_0px_var(--color-coffee)] transition-colors duration-300 peer-checked:bg-powder box-border relative group">
              {/* Knob */}
              <div
                className={`absolute h-4 w-4 bg-vanilla border-2 border-coffee rounded-[5px] shadow-[0px_3px_0px_0px_var(--color-coffee)] group-hover:shadow-[0px_5px_0px_0px_var(--color-coffee)] transition-all duration-300 -left-0.5 bottom-[0.75px] group-hover:-translate-y-[0.09rem] ${activeTab === "community" ? "translate-x-[25px]" : ""}`}
              ></div>
            </div>
          </label>

          <button
            className={`tab-btn right-arrow ${activeTab === "community" ? "active" : ""}`}
            onClick={() => setActiveTab("community")}
          >
            <p data-text="Public">Public</p>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
          </div>

          {/* Right button */}
          <div className="w-48 shrink-0 flex justify-end">
            {user && (
              <button
                onClick={() => setShowMyPublishedSets(true)}
                className="text-sm font-bold text-coffee hover:text-terracotta underline decoration-2 underline-offset-2 whitespace-nowrap"
              >
                View my published sets
              </button>
            )}
          </div>
        </div>

        {/* Search Bar for Community Tab */}
        {activeTab === "community" && (
          <div className="pb-4 flex justify-center border-b-3 border-coffee">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmittedQuery(searchQuery);
              }}
              className="flex gap-2 w-full max-w-sm items-center"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search public sets..."
                className="flex-1 px-3 py-1 text-sm border-2 border-coffee rounded-md bg-vanilla focus:outline-none focus:border-terracotta text-coffee placeholder-coffee/50"
              />
              <button
                type="submit"
                className="px-4 py-1 text-sm bg-powder text-coffee font-bold rounded-md border-2 border-coffee hover:bg-coffee hover:border-coffee hover:text-light-vanilla transition-colors"
              >
                Search
              </button>
              <button
                id="random-set-btn"
                type="button"
                onClick={handleRandom}
                disabled={loadingSetId !== null}
                className="px-4 py-1 text-sm bg-terracotta text-vanilla font-bold rounded-md border-2 border-coffee hover:bg-coffee hover:border-coffee transition-colors disabled:opacity-50"
              >
                Random
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="mb-4 p-3 border-2 border-terracotta bg-terracotta/10 text-terracotta text-sm">
            {error}
          </div>
        ) : sets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-coffee/70">
            <div className="text-center">
              {activeTab === "personal" ? (
                <div>No saved flashcards</div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">🌍</div>
                  <div>No public flashcard sets found</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2" onScroll={handleScroll}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 pt-6 pb-6 px-2">
              {sets.map((set) => (
                <div
                  key={set.id}
                  onClick={() => {
                    if (!isLeader) {
                      setShakingId(set.id);
                      setTimeout(() => setShakingId(null), 500);
                      return;
                    }
                    if (!loadingSetId) handleLoadSet(set.id, set.name);
                  }}
                  className={`group relative h-80 w-full perspective-[1000px] ${
                    loadingSetId
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer"
                  } ${shakingId === set.id ? "animate-shake" : ""}`}
                >
                  {/* Under Card */}
                  <div className="absolute inset-0 rounded-[20px] border-2 border-coffee bg-vanilla shadow-[0_0_10px_rgba(0,0,0,0.2)] flex items-end justify-center pb-0 -z-10">
                    <div
                      className={`text-center text-[9px] font-bold tracking-[0.2em] ${
                        shakingId === set.id
                          ? "text-terracotta"
                          : "text-coffee/80"
                      }`}
                    >
                      {shakingId === set.id
                        ? "MUST BE LEADER"
                        : "CLICK TO LOAD"}
                    </div>
                  </div>

                  {/* Top Card */}
                  <div
                    className={`h-full w-full transition-transform duration-300 ease-out ${
                      !loadingSetId ? "group-hover:-translate-y-[15px]" : ""
                    }`}
                  >
                    <div className="relative h-full w-full rounded-[20px] border-2 border-coffee bg-vanilla overflow-hidden">
                      <div className={`absolute inset-0 ${activeTab === "community" ? "shadow-[inset_0_0_0_3px_var(--color-powder)]" : "shadow-[inset_0_0_0_2px_var(--color-terracotta)]"} rounded-[18px]`} />
                      <div className="relative h-full w-full p-6 flex flex-col items-center justify-between text-center">
                        {/* Content Container */}
                        <div className="flex-1 flex flex-col items-center justify-center w-full gap-2 overflow-hidden">
                          {activeTab === "community" &&
                            set.user_id ===
                              "d0c1b157-eb1f-42a9-bf67-c6384b7ca278" && (
                              <div className="flex flex-col items-center mb-1">
                                <div className="text-sm">⭐</div>
                                <div className="shrink-0 text-xs font-bold text-coffee/80 uppercase tracking-wider">
                                  Featured Set
                                </div>
                              </div>
                            )}
                          <h3 className="text-2xl font-bold text-coffee line-clamp-3 wrap-break-words w-full px-2">
                            {set.name}
                          </h3>
                          <div className="flex flex-col gap-1 mt-2 shrink-0">
                            <p className="text-sm text-coffee/70 font-bold">
                              {set.flashcard_count} card
                              {set.flashcard_count !== 1 ? "s" : ""}
                              {activeTab === "community" && (
                                <> • {set.plays || 0} plays</>
                              )}
                            </p>
                            {activeTab === "personal" && (
                              <p className="text-xs text-coffee/40 font-bold">
                                Created {getRelativeTime(set.created_at)}
                              </p>
                            )}
                            {activeTab === "community" &&
                              set.username &&
                              set.user_id !==
                                "d0c1b157-eb1f-42a9-bf67-c6384b7ca278" && (
                                <p className="text-xs text-coffee/40 font-bold">
                                  by {set.username}
                                </p>
                              )}
                          </div>
                          {activeTab === "community" && (
                            <div className="mt-2 w-full overflow-hidden px-2">
                              <p className="text-sm text-coffee/80 line-clamp-3">
                                {set.description || "No description provided."}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons (Only for Personal) */}
                        {activeTab === "personal" && (
                          <div
                            className="flex items-center gap-3 mt-2 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setPublishingSet(set)}
                              disabled={loadingSetId !== null}
                              className="relative p-2 rounded-full text-coffee disabled:opacity-50 hover:[&>div]:opacity-100"
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-0.5 text-coffee text-[10px] font-bold opacity-0 transition-opacity pointer-events-none whitespace-nowrap">
                                Publish
                              </div>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingSet(set)}
                              disabled={loadingSetId !== null}
                              className="relative p-2 rounded-full text-coffee disabled:opacity-50 hover:[&>div]:opacity-100"
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-0.5 text-coffee text-[10px] font-bold opacity-0 transition-opacity pointer-events-none whitespace-nowrap">
                                Edit
                              </div>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(set.id, set.name)}
                              disabled={loadingSetId !== null}
                              className="relative p-2 rounded-full text-coffee disabled:opacity-50 hover:[&>div]:opacity-100"
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-0.5 text-coffee text-[10px] font-bold opacity-0 transition-opacity pointer-events-none whitespace-nowrap">
                                Delete
                              </div>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}

        <div className="border-t-3 border-coffee pt-4 mt-auto">
          <button
            onClick={onClose}
            disabled={loadingSetId !== null}
            className="w-full border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>

      {publishingSet && (
        <PublishFlashcardsModal
          isOpen={true}
          onClose={() => setPublishingSet(null)}
          setId={publishingSet.id}
          initialName={publishingSet.name}
          hasGenerated={publishingSet.has_generated}
          termGenerated={publishingSet.term_generated}
          definitionGenerated={publishingSet.definition_generated}
          currentSettings={currentSettings}
        />
      )}

      {editingSet && (
        <EditFlashcardsModal
          isOpen={true}
          onClose={() => setEditingSet(null)}
          setId={editingSet.id}
          setName={editingSet.name}
          onSaveSuccess={() => {
            requestIdRef.current += 1;
            setPage(0);
            setHasMore(true);
            fetchSets(activeTab, 0, true, requestIdRef.current);
          }}
        />
      )}

      {showMyPublishedSets && (
        <MyPublishedSetsModal
          isOpen={true}
          onClose={() => setShowMyPublishedSets(false)}
          currentSettings={currentSettings}
        />
      )}
    </div>
  );
}
