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
  const [error, setError] = useState("");
  const mouseDownOnBackdrop = useRef(false);

  const handleLoad = async (setId: string) => {
    const loadedSet = await loadPublicSet(setId);
    if (loadedSet) {
      onPublicSetLoaded?.(loadedSet);
      onClose();
    }
  };

  const fetchSets = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch public flashcard sets
      const { data: setsData, error: fetchError } = await supabase
        .from("public_flashcard_sets")
        .select(
          "id, name, description, created_at, updated_at, plays, user_id, username",
        )
        .order("plays", { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

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
            .select("is_generated")
            .eq("public_set_id", set.id)
            .eq("is_generated", true)
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

      setSets(setsWithCounts);
    } catch (err) {
      console.error(err);
      setError("Failed to load public flashcard sets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSets();
    }
  }, [isOpen]);

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
        className="bg-vanilla border-3 border-coffee p-8 max-w-2xl w-full mx-4 shadow-[8px_8px_0px_0px_#644536] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4 mb-6">
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
          <div className="flex-1 overflow-y-auto mb-6 space-y-3">
            {sets.map((set) => (
              <div
                key={set.id}
                className="border-2 border-coffee p-4 bg-vanilla hover:bg-light-vanilla transition-colors cursor-default"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg truncate">
                      {set.name}
                    </div>
                    <div className="text-sm text-coffee/70 font-bold mb-4">
                      by {set.username} • {set.plays} plays
                    </div>
                    <div className="text-sm text-coffee mb-4 truncate">
                      {set.description || "No description"}
                    </div>
                    <div className="text-xs text-coffee/50">
                      Created {new Date(set.created_at).toLocaleDateString()} •
                      Updated {new Date(set.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 items-center">
                    <button
                      onClick={() => handleLoad(set.id)}
                      className="border-2 border-coffee bg-powder text-coffee px-4 py-2 hover:bg-coffee hover:text-vanilla transition-colors text-sm font-bold shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
