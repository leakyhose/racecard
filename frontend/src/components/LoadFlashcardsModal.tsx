import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard } from "@shared/types";

interface LoadFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FlashcardSet {
  id: string;
  name: string;
  created_at: string;
  flashcard_count: number;
}

export function LoadFlashcardsModal({
  isOpen,
  onClose,
}: LoadFlashcardsModalProps) {
  const { user } = useAuth();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchSets = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      // Fetch flashcard sets with count
      const { data, error: fetchError } = await supabase
        .from("flashcard_sets")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Get flashcard counts for each set
      const setsWithCounts = await Promise.all(
        (data || []).map(async (set) => {
          const { count } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("set_id", set.id);

          return {
            ...set,
            flashcard_count: count || 0,
          };
        }),
      );

      setSets(setsWithCounts);
    } catch {
      setError("Failed to load flashcard sets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchSets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const handleLoadSet = async (setId: string) => {
    setLoadingSetId(setId);
    setError("");

    try {
      // Fetch flashcards for this set
      const { data, error: fetchError } = await supabase
        .from("flashcards")
        .select("term, definition")
        .eq("set_id", setId);

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
      }));

      socket.emit("updateFlashcard", flashcards);
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
      fetchSets();
    } catch {
      setError("Failed to delete flashcard set");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-coffee/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-vanilla border-3 border-coffee p-8 max-w-2xl w-full mx-4 shadow-[8px_8px_0px_0px_#644536] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl uppercase tracking-widest border-b-3 border-coffee pb-4 mb-6">
          Load Flashcard Set
        </h2>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-coffee uppercase">Loading...</div>
          </div>
        ) : error ? (
          <div className="mb-4 p-3 border-2 border-terracotta bg-terracotta/10 text-terracotta text-sm">
            {error}
          </div>
        ) : sets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-coffee/70">
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <div className="uppercase">No saved flashcard sets yet</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mb-6 space-y-3">
            {sets.map((set) => (
              <div
                key={set.id}
                className="border-2 border-coffee p-4 bg-vanilla hover:bg-light-vanilla transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg mb-1 truncate">
                      {set.name}
                    </div>
                    <div className="text-sm text-coffee/70">
                      {set.flashcard_count} card
                      {set.flashcard_count !== 1 ? "s" : ""} • Created{" "}
                      {new Date(set.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleLoadSet(set.id)}
                      disabled={loadingSetId !== null}
                      className="border-2 border-coffee bg-powder text-coffee px-4 py-2 hover:bg-coffee hover:text-vanilla transition-colors uppercase text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingSetId === set.id ? "Loading..." : "Load"}
                    </button>
                    <button
                      onClick={() => handleDelete(set.id, set.name)}
                      disabled={loadingSetId !== null}
                      className="border-2 border-coffee bg-terracotta text-vanilla px-4 py-2 hover:bg-coffee transition-colors uppercase text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors uppercase font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
