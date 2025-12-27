import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { loadPublicSet, type LoadedPublicSet } from "../utils/loadPublicSet";

interface PublicFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublicSetLoaded?: (set: LoadedPublicSet) => void;
}

interface PublicFlashcardSet {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  plays: number;
  user_id: string;
  username?: string;
  flashcard_count: number;
  has_generated: boolean;
}

export function PublicFlashcardsModal({
  isOpen,
  onClose,
  onPublicSetLoaded,
}: PublicFlashcardsModalProps) {
  const [sets, setSets] = useState<PublicFlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const mouseDownOnBackdrop = useRef(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const handleLoad = async (setId: string) => {
    setLoadingSetId(setId);
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
  };

  const fetchSets = async (pageToFetch: number, isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError("");

    try {
      const from = pageToFetch * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch public flashcard sets
      const { data: setsData, error: fetchError } = await supabase
        .from("public_flashcard_sets")
        .select(
          "id, name, description, created_at, updated_at, plays, user_id, username",
        )
        .order("plays", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);

      if (fetchError) throw fetchError;

      if (setsData.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Get flashcard counts for each set
      const setsWithCounts = await Promise.all(
        (setsData || []).map(async (set) => {
          const { count } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("public_set_id", set.id);

          // Check if any flashcards have generated MC options
          const { data: generatedCards } = await supabase
            .from("flashcards")
            .select("term_generated, definition_generated")
            .eq("public_set_id", set.id)
            .or("term_generated.eq.true,definition_generated.eq.true")
            .limit(1);

          return {
            ...set,
            username: set.username || "Unknown",
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
    } catch (err) {
      console.error(err);
      setError("Failed to load public flashcard sets");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setHasMore(true);
      fetchSets(0, true);
    }
  }, [isOpen]);

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
          Public Flashcards
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
              <div className="text-4xl mb-4">🌍</div>
              <div>No public flashcard sets found</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2" onScroll={handleScroll}>
            <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
              {sets.map((set) => (
                <div
                  key={set.id}
                  className="border-2 border-coffee p-4 bg-light-vanilla/60 transition-colors cursor-default flex flex-col h-full"
                >
                  <div className="flex-1 min-w-0 mb-4">
                    <div className="font-bold text-lg truncate">
                      {set.user_id === "d0c1b157-eb1f-42a9-bf67-c6384b7ca278" &&
                        "⭐ "}
                      {set.name}
                    </div>
                    <div className="text-sm text-coffee/70 font-bold mb-4">
                      {set.user_id === "d0c1b157-eb1f-42a9-bf67-c6384b7ca278"
                        ? "Featured Quiz"
                        : `by ${set.username}`}
                      {" • "}
                      {set.flashcard_count} Cards
                      {" • "}
                      {set.plays} Plays
                    </div>
                    <div className="text-sm text-coffee truncate">
                      {set.description || "No description"}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 items-center mt-auto">
                    <button
                      onClick={() => handleLoad(set.id)}
                      disabled={loadingSetId !== null}
                      className="w-full border-2 border-coffee bg-powder text-coffee px-4 py-2 hover:bg-coffee hover:text-vanilla transition-colors text-sm font-bold shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0.5 disabled:translate-y-0.5"
                    >
                      {loadingSetId === set.id ? "..." : "Load"}
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
    </div>
  );
}
