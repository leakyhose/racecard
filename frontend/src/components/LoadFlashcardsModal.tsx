import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard, Settings } from "@shared/types";
import { PublishFlashcardsModal } from "./PublishFlashcardsModal";
import { getRelativeTime } from "../utils/flashcardUtils";

interface LoadFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
  onDeleteSuccess?: () => void;
  currentSettings: Settings;
  onSetLoaded?: (saved?: boolean) => void;
}

interface FlashcardSet {
  id: string;
  name: string;
  created_at: string;
  flashcard_count: number;
  has_generated: boolean;
}

export function LoadFlashcardsModal({
  isOpen,
  onClose,
  refreshTrigger = 0,
  onDeleteSuccess,
  currentSettings,
  onSetLoaded,
}: LoadFlashcardsModalProps) {
  const { user } = useAuth();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [publishingSet, setPublishingSet] = useState<FlashcardSet | null>(null);
  const mouseDownOnBackdrop = useRef(false);

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
          const { data: generatedCards } = await supabase
            .from("flashcards")
            .select("is_generated")
            .eq("set_id", set.id)
            .eq("is_generated", true)
            .limit(1);

          return {
            ...set,
            flashcard_count: count || 0,
            has_generated:
              (generatedCards && generatedCards.length > 0) || false,
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
    if (isOpen && user) {
      setPage(0);
      setHasMore(true);
      fetchSets(0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, refreshTrigger]);

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
      // Fetch flashcards for this set
      const { data, error: fetchError } = await supabase
        .from("flashcards")
        .select(
          "term, definition, trick_terms, trick_definitions, is_generated",
        )
        .eq("set_id", setId)
        .order("id", { ascending: true });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError("This set has no flashcards");
        return;
      }

      // Convert to Flashcard format and send to server
      const flashcards: Flashcard[] = data.map((card, index) => ({
        id: index.toString(),
        question: card.term,
        answer: card.definition,
        trickTerms: card.trick_terms || [],
        trickDefinitions: card.trick_definitions || [],
        isGenerated: card.is_generated || false,
      }));

      socket.emit("updateFlashcard", flashcards, setName, setId);
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
      className="fixed inset-0 bg-coffee/50 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          mouseDownOnBackdrop.current = true;
        }
      }}
      onClick={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        className="bg-vanilla border-3 border-coffee p-8 max-w-5xl w-full mx-4 shadow-[8px_8px_0px_0px_#644536] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4">
          Load Flashcard Set
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
          <div
            className="flex-1 overflow-y-auto pr-2"
            onScroll={handleScroll}
          >
            <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
              {sets.map((set) => (
                <div
                  key={set.id}
                  className="border-2 border-coffee p-4 bg-light-vanilla/60 transition-colors flex flex-col h-full"
                >
                  <div className="flex-1 min-w-0 mb-4">
                    <div className="font-bold text-lg mb-1 truncate">
                      {set.name}
                    </div>
                    <div className="text-sm text-coffee/70">
                      {set.flashcard_count} card
                      {set.flashcard_count !== 1 ? "s" : ""} • Created{" "}
                      {getRelativeTime(set.created_at)}
                    </div>
                    {set.has_generated ? (
                      <div className="text-xs text-coffee font-bold mt-1">
                        ✓ Multiple Choice Ready
                      </div>
                    ) : (
                      <div className="text-xs text-terracotta font-bold mt-1">
                        ✗ No Multiple Choice Generated
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 mt-auto">
                    <button
                      onClick={() => setPublishingSet(set)}
                      disabled={loadingSetId !== null}
                      className="flex-1 border-2 border-coffee bg-mint text-coffee px-2 py-2 hover:bg-coffee hover:text-vanilla transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Publish
                    </button>
                    <button
                      onClick={() => handleLoadSet(set.id, set.name)}
                      disabled={loadingSetId !== null}
                      className="flex-1 border-2 border-coffee bg-powder text-coffee px-2 py-2 hover:bg-coffee hover:text-vanilla transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingSetId === set.id ? "..." : "Load"}
                    </button>
                    <button
                      onClick={() => handleDelete(set.id, set.name)}
                      disabled={loadingSetId !== null}
                      className="flex-1 border-2 border-coffee bg-terracotta text-vanilla px-2 py-2 hover:bg-coffee transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
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
            className="w-full border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold"
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
          currentSettings={currentSettings}
        />
      )}
    </div>
  );
}
