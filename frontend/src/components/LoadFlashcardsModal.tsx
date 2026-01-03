import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard, Settings } from "@shared/types";
import { PublishFlashcardsModal } from "./PublishFlashcardsModal";
import { EditFlashcardsModal } from "./EditFlashcardsModal";
import { getRelativeTime } from "../utils/flashcardUtils";

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
  isLeader: boolean;
}

interface FlashcardSet {
  id: string;
  name: string;
  created_at: string;
  flashcard_count: number;
  has_generated: boolean;
  term_generated?: boolean;
  definition_generated?: boolean;
}

export function LoadFlashcardsModal({
  isOpen,
  onClose,
  refreshTrigger = 0,
  onDeleteSuccess,
  currentSettings,
  onSetLoaded,
  isLeader,
}: LoadFlashcardsModalProps) {
  const { user } = useAuth();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [publishingSet, setPublishingSet] = useState<FlashcardSet | null>(null);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const mouseDownOnBackdrop = useRef(false);
  const prevRefreshTrigger = useRef(refreshTrigger);
  const hasInitialLoad = useRef(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const fetchSets = async (pageToFetch: number, isInitial: boolean = false) => {
    if (!user) return;

    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError("");

    try {
      const from = pageToFetch * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch flashcard sets with count
      const { data, error: fetchError } = await supabase
        .from("flashcard_sets")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);

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
            .eq("set_id", set.id);

          // Check if any flashcards have generated MC options
          const { count: termGenCount } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("set_id", set.id)
            .eq("term_generated", true);

          const { count: defGenCount } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("set_id", set.id)
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

      if (isInitial) {
        setSets(setsWithCounts);
      } else {
        setSets((prev) => [...prev, ...setsWithCounts]);
      }
    } catch {
      setError("Failed to load flashcard sets");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      const isRefresh = refreshTrigger !== prevRefreshTrigger.current;
      const needsInitialLoad = !hasInitialLoad.current;

      if (isRefresh || needsInitialLoad) {
        setPage(0);
        setHasMore(true);
        fetchSets(0, true);
        prevRefreshTrigger.current = refreshTrigger;
        hasInitialLoad.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id, refreshTrigger]);

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
      fetchSets(nextPage, false);
    }
  };

  const handleLoadSet = async (setId: string, setName: string) => {
    setLoadingSetId(setId);
    setError("");

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
      setPage(0);
      setHasMore(true);
      fetchSets(0, true);
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
        className="bg-vanilla border-3 border-coffee p-8 max-w-5xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4">
          Private Flashcards
        </h2>

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
              <div>No saved flashcards</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2" onScroll={handleScroll}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 pb-6 px-2">
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
                    loadingSetId ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                  } ${shakingId === set.id ? "animate-shake" : ""}`}
                >
                  {/* Under Card */}
                  <div className="absolute inset-0 rounded-[20px] border-2 border-coffee bg-light-vanilla/50 shadow-[0_0_10px_rgba(0,0,0,0.2)] flex items-end justify-center pb-0 -z-10">
                    <div
                      className={`text-center text-[9px] font-bold tracking-[0.2em] ${
                        shakingId === set.id ? "text-terracotta" : "text-coffee/80"
                      }`}
                    >
                      {shakingId === set.id ? "MUST BE LEADER" : "CLICK TO LOAD"}
                    </div>
                  </div>

                  {/* Top Card */}
                  <div
                    className={`h-full w-full transition-transform duration-300 ease-out ${
                      !loadingSetId ? "group-hover:-translate-y-[15px]" : ""
                    }`}
                  >
                    <div className="relative h-full w-full rounded-[20px] border-2 border-coffee bg-vanilla overflow-hidden">
                    <div className="absolute inset-0 bg-light-vanilla/20 shadow-[inset_0_0_0_2px_var(--color-terracotta)] rounded-[18px]" />
                      <div className="relative h-full w-full p-6 flex flex-col items-center justify-between text-center">
                      {/* Content Container */}
                      <div className="flex-1 flex flex-col items-center justify-center w-full gap-2">
                        <h3 className="text-2xl font-bold text-coffee line-clamp-3 wrap-break-words w-full px-2">
                          {set.name}
                        </h3>
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-sm text-coffee/70 font-bold">
                            {set.flashcard_count} card
                            {set.flashcard_count !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-coffee/40 font-bold">
                            Created {getRelativeTime(set.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
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
            setPage(0);
            setHasMore(true);
            fetchSets(0, true);
          }}
        />
      )}
    </div>
  );
}
