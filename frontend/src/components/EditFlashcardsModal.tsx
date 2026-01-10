import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { ExportModal } from "./ExportModal";

interface EditFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  setName: string;
  onSaveSuccess?: () => void;
}

interface EditableFlashcard {
  id: string; // database id
  term: string;
  definition: string;
  trick_terms: string[];
  trick_definitions: string[];
}

export function EditFlashcardsModal({
  isOpen,
  onClose,
  setId,
  setName,
  onSaveSuccess,
}: EditFlashcardsModalProps) {
  const [flashcards, setFlashcards] = useState<EditableFlashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mouseDownOnBackdrop = useRef(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showExport, setShowExport] = useState(false);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  const fetchTotalCount = useCallback(async () => {
    const { count } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("set_id", setId);
    setTotalCount(count || 0);
  }, [setId]);

  const fetchFlashcards = useCallback(
    async (pageToFetch: number, isInitial: boolean = false) => {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError("");

      try {
        const from = pageToFetch * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("flashcards")
          .select("*")
          .eq("set_id", setId)
          .order("order_index", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) throw error;

        if (data) {
          if (data.length < PAGE_SIZE) {
            setHasMore(false);
          }

          const newCards = data.map((card) => ({
            id: card.id,
            term: card.term,
            definition: card.definition,
            trick_terms: card.trick_terms || [],
            trick_definitions: card.trick_definitions || [],
          }));

          if (isInitial) {
            setFlashcards(newCards);
          } else {
            setFlashcards((prev) => [...prev, ...newCards]);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load flashcards");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [setId],
  );

  useEffect(() => {
    if (isOpen && setId) {
      setPage(0);
      setHasMore(true);
      setFlashcards([]);
      setDeletedIds([]);
      fetchTotalCount();
      fetchFlashcards(0, true);
    }
  }, [isOpen, setId, fetchTotalCount, fetchFlashcards]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 100 &&
      !loading &&
      !isLoadingMore &&
      hasMore
    ) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFlashcards(nextPage, false);
    }
  };

  const handleSave = async () => {
    if (flashcards.length === 0) {
      setError("Cannot save an empty set");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("flashcards")
          .delete()
          .in("id", deletedIds);
        if (deleteError) throw deleteError;
      }

      const updates = flashcards.map((card, index) => ({
        id: card.id,
        set_id: setId,
        term: card.term,
        definition: card.definition,
        trick_terms: card.trick_terms,
        trick_definitions: card.trick_definitions,
        order_index: index,
      }));

      const BATCH_SIZE = 100;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const { error: updateError } = await supabase
          .from("flashcards")
          .upsert(batch);

        if (updateError) throw updateError;
      }

      onSaveSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = (id: string) => {
    if (totalCount <= 1) {
      setError("Cannot delete the last flashcard");
      return;
    }
    setFlashcards((prev) => prev.filter((c) => c.id !== id));
    setDeletedIds((prev) => [...prev, id]);
    setTotalCount((prev) => prev - 1);
  };

  const handleUpdateCard = (
    id: string,
    field: "term" | "definition",
    value: string,
  ) => {
    setFlashcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const handleUpdateDistractor = (
    id: string,
    type: "trick_terms" | "trick_definitions",
    index: number,
    value: string,
  ) => {
    setFlashcards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newDistractors = [...c[type]];
        newDistractors[index] = value;
        return { ...c, [type]: newDistractors };
      }),
    );
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
          if (!saving && !loading) {
            onClose();
          }
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        className="bg-light-vanilla border-3 border-coffee p-8 max-w-5xl w-full mx-4 max-h-[80vh] flex flex-col select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4 mb-4 flex justify-between items-center">
          <span>Edit: {setName}</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExport(true)}
              disabled={saving || loading}
              className="text-sm font-bold text-coffee hover:text-terracotta underline decoration-2 underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export
            </button>
            <span className="text-sm text-coffee/70 font-normal">
              {totalCount} Cards
            </span>
          </div>
        </h2>

        {error && (
          <div className="mb-4 p-3 border-2 border-terracotta bg-terracotta/10 text-terracotta text-sm font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto pr-2 space-y-4"
            onScroll={handleScroll}
          >
            {flashcards.map((card) => (
              <div
                key={card.id}
                className="border-2 border-coffee p-4 mt-4 mb-4 bg-vanilla relative group"
              >
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-terracotta hover:text-coffee font-bold px-2 py-1 text-xs underline decoration-2 underline-offset-2"
                  >
                    Delete Flashcard
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-coffee uppercase tracking-wider">
                      Term
                    </label>
                    <textarea
                      value={card.term}
                      onChange={(e) =>
                        handleUpdateCard(card.id, "term", e.target.value)
                      }
                      className="w-full bg-light-vanilla border-2 border-coffee/20 focus:border-coffee p-2 min-h-20 resize-none font-bold text-lg outline-none transition-colors"
                      placeholder="Enter term..."
                    />

                    <div className="mt-4 space-y-2">
                      <label className="block text-xs font-bold text-coffee uppercase tracking-wider">
                        Trick Terms
                      </label>
                      {card.trick_terms.map((trick, i) => (
                        <input
                          key={i}
                          value={trick}
                          onChange={(e) =>
                            handleUpdateDistractor(
                              card.id,
                              "trick_terms",
                              i,
                              e.target.value,
                            )
                          }
                          className="w-full bg-light-vanilla border border-coffee/20 focus:border-coffee p-1.5 text-sm outline-none transition-colors"
                          placeholder={`Trick Term ${i + 1}`}
                        />
                      ))}
                      {card.trick_terms.length === 0 && (
                        <div className="text-xs text-coffee/40 italic">
                          No trick terms generated
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-coffee uppercase tracking-wider">
                      Definition
                    </label>
                    <textarea
                      value={card.definition}
                      onChange={(e) =>
                        handleUpdateCard(card.id, "definition", e.target.value)
                      }
                      className="w-full bg-light-vanilla border-2 border-coffee/20 focus:border-coffee p-2 min-h-20 resize-none text-base outline-none transition-colors"
                      placeholder="Enter definition..."
                    />

                    <div className="mt-4 space-y-2">
                      <label className="block text-xs font-bold text-coffee uppercase tracking-wider">
                        Trick Definitions
                      </label>
                      {card.trick_definitions.map((trick, i) => (
                        <input
                          key={i}
                          value={trick}
                          onChange={(e) =>
                            handleUpdateDistractor(
                              card.id,
                              "trick_definitions",
                              i,
                              e.target.value,
                            )
                          }
                          className="w-full bg-light-vanilla border border-coffee/20 focus:border-coffee p-1.5 text-sm outline-none transition-colors"
                          placeholder={`Trick Definition ${i + 1}`}
                        />
                      ))}
                      {card.trick_definitions.length === 0 && (
                        <div className="text-xs text-coffee/40 italic">
                          No trick definitions generated
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}

        <div className="border-t-3 border-coffee pt-4 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 border-2 border-coffee bg-mint text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {showExport && (
        <ExportModal
          isOpen={true}
          onClose={() => setShowExport(false)}
          setId={setId}
          setName={setName}
        />
      )}
    </div>
  );
}
