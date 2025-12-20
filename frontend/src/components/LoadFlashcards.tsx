import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard } from "@shared/types";

interface FlashcardSet {
  id: string;
  name: string;
  created_at: string;
  flashcard_count: number;
  has_generated: boolean;
}

interface LoadFlashcardsProps {
  isLeader: boolean;
  refreshTrigger?: number;
  autoSelectedSetId?: string | null;
  onOpenModal?: () => void;
  isGenerating?: boolean;
  onTooltipChange?: (
    show: boolean,
    text?: string,
    x?: number,
    y?: number,
  ) => void;
}

export function LoadFlashcards({
  isLeader,
  refreshTrigger = 0,
  autoSelectedSetId,
  onOpenModal,
  isGenerating = false,
  onTooltipChange,
}: LoadFlashcardsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"personal" | "community">(
    "personal",
  );
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [shakingSetId, setShakingSetId] = useState<string | null>(null);
  const [currentlyLoaded, setCurrentlyLoaded] = useState<string | null>(null);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSets = async () => {
      if (!user) return;

      setLoading(true);

      try {
        const { data, error: fetchError } = await supabase
          .from("flashcard_sets")
          .select("id, name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (fetchError) throw fetchError;

        const setsWithCounts = await Promise.all(
          (data || []).map(async (set) => {
            const { count } = await supabase
              .from("flashcards")
              .select("*", { count: "exact", head: true })
              .eq("set_id", set.id);

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

        setSets(setsWithCounts);
      } catch {
        console.error("Failed to load flashcard sets");
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "personal" && user) {
      fetchSets();
    }
  }, [activeTab, user, refreshTrigger]);

  useEffect(() => {
    setCurrentlyLoaded(autoSelectedSetId || null);
  }, [autoSelectedSetId]);

  useEffect(() => {
    if (!isGenerating) {
      onTooltipChange?.(false);
    }
  }, [isGenerating, onTooltipChange]);

  const handleLoadSet = async (setId: string) => {
    if (isGenerating) {
      return;
    }
    if (!isLeader) {
      setShakingSetId(setId);
      setTimeout(() => setShakingSetId(null), 500);
      return;
    }
    setLoadingSetId(setId);

    try {
      const { data, error: fetchError } = await supabase
        .from("flashcards")
        .select(
          "term, definition, trick_terms, trick_definitions, is_generated",
        )
        .eq("set_id", setId);

      if (fetchError) throw fetchError;

      const flashcards: Flashcard[] = data.map((card, index) => ({
        id: index.toString(),
        question: card.term,
        answer: card.definition,
        trickTerms: card.trick_terms || [],
        trickDefinitions: card.trick_definitions || [],
        isGenerated: card.is_generated || false,
      }));

      const set = sets.find((s) => s.id === setId);
      const setName = set ? set.name : "Unnamed Set";

      socket.emit("updateFlashcard", flashcards, setName, setId);
      setCurrentlyLoaded(setId);
    } catch {
      console.error("Failed to load set");
    } finally {
      setLoadingSetId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full relative">
      {isGenerating && (
        <div
          className="-translate-y-1 absolute inset-0 bg-light-vanilla/60 z-50 cursor-not-allowed pointer-events-auto"
          onMouseMove={(e) => {
            onTooltipChange?.(
              true,
              "Please wait for distractors to finish",
              e.clientX,
              e.clientY,
            );
          }}
          onMouseEnter={() =>
            onTooltipChange?.(
              true,
              "Please wait for distractors to finish",
              0,
              0,
            )
          }
          onMouseLeave={() => onTooltipChange?.(false)}
        ></div>
      )}
      {/* Toggle Switch */}
      <div className="flex justify-center items-center pb-3 border-b-2 border-coffee/50">
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={activeTab === "community"}
            onChange={() =>
              setActiveTab(activeTab === "personal" ? "community" : "personal")
            }
          />

          {/* Track */}
          <div className="w-10 h-4 bg-terracotta/90 border-2 border-coffee rounded-[5px] shadow-[1px_1px_0px_0px_var(--color-coffee)] transition-colors duration-300 peer-checked:bg-powder box-border relative group">
            {/* Knob */}
            <div
              className={`absolute h-4 w-4 bg-vanilla border-2 border-coffee rounded-[5px] shadow-[0px_3px_0px_0px_var(--color-coffee)] group-hover:shadow-[0px_5px_0px_0px_var(--color-coffee)] transition-all duration-300 -left-0.5 bottom-[0.75px] group-hover:-translate-y-[0.09rem] ${activeTab === "community" ? "translate-x-[25px]" : ""}`}
            ></div>
          </div>

          {/* Labels */}
          <span
            className={`absolute right-[calc(100%+20px)] text-sm font-bold text-coffee transition-all duration-300 ${activeTab === "personal" ? "underline decoration-2 underline-offset-4" : "no-underline opacity-60"}`}
          >
            Private
          </span>
          <span
            className={`absolute left-[calc(100%+20px)] text-sm font-bold text-coffee transition-all duration-300 ${activeTab === "community" ? "underline decoration-2 underline-offset-4" : "no-underline opacity-60"}`}
          >
            Public
          </span>
        </label>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 [direction:rtl] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-coffee/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40 [&::-webkit-scrollbar]:absolute [&::-webkit-scrollbar]:left-0">
        <div className="flex flex-col space-y-2 [direction:ltr] min-h-full mb-1">
          {activeTab === "personal" ? (
            <>
              {!user ? (
                <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
                  Log in to save flashcards!
                </div>
              ) : loading && sets.length === 0 ? (
                <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
                  Loading...
                </div>
              ) : sets.length === 0 ? (
                <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
                  No flashcard sets.
                </div>
              ) : (
                <>
                  {sets.map((set) => (
                    <button
                      key={set.id}
                      onClick={() => handleLoadSet(set.id)}
                      className={`group relative w-full rounded-xl bg-coffee border-none p-0 cursor-pointer outline-none ${
                        shakingSetId === set.id ? "animate-shake" : ""
                      }`}
                    >
                      <span
                        className={`w-full h-full rounded-xl border-2 border-coffee p-2 text-left -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 flex flex-col justify-center min-h-15 ${
                          shakingSetId === set.id
                            ? "bg-coffee/80 text-vanilla"
                            : `${set.id == currentlyLoaded ? "shadow-[inset_0_0_0_2px_var(--color-powder)]" : ""} bg-vanilla text-coffee`
                        }`}
                      >
                        {shakingSetId === set.id ? (
                          <div className="text-center font-bold text-sm">
                            Must be leader
                          </div>
                        ) : (
                          <div className="flex flex-col w-full">
                            <div className="w-full">
                              <h3 className="truncate font-bold text-sm transition-colors">
                                {set.name}
                              </h3>
                            </div>
                            <div className="flex justify-between items-center w-full mt-0.5">
                              <p
                                className={`text-xs font-medium ${
                                  shakingSetId === set.id
                                    ? "text-vanilla/80"
                                    : "text-coffee/50"
                                }`}
                              >
                                {set.flashcard_count} cards •{" "}
                                {new Date(set.created_at).toLocaleDateString()}
                              </p>
                              {loadingSetId === set.id && (
                                <div className="ml-2 shrink-0">
                                  <div className="w-4 h-4 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </span>
                    </button>
                  ))}
                  <button
                    className="text-center text-coffee font-bold underline decoration-2 underline-offset-2 hover:text-terracotta transition-colors cursor-pointer"
                    onClick={() => onOpenModal?.()}
                  >
                    See More
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
              Community sets coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
