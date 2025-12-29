import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard } from "@shared/types";
import { loadPublicSet, type LoadedPublicSet } from "../utils/loadPublicSet";
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

interface FlashcardSet {
  id: string;
  name: string;
  created_at: string;
  flashcard_count: number;
  has_generated: boolean;
  plays?: number;
  user_id?: string;
}

interface LoadFlashcardsProps {
  isLeader: boolean;
  refreshTrigger?: number;
  autoSelectedSetId?: string | null;
  onOpenModal?: () => void;
  onOpenPublicModal?: () => void;
  isGenerating?: boolean;
  onTooltipChange?: (
    show: boolean,
    text?: string,
    x?: number,
    y?: number,
  ) => void;
  onPublicSetLoaded?: (set: LoadedPublicSet) => void;
  onPrivateSetLoaded?: (saved?: boolean) => void;
}

export function LoadFlashcards({
  isLeader,
  refreshTrigger = 0,
  autoSelectedSetId,
  onOpenModal,
  onOpenPublicModal,
  isGenerating = false,
  onTooltipChange,
  onPublicSetLoaded,
  onPrivateSetLoaded,
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
      setLoading(true);

      try {
        let data: FlashcardSet[] | null = [];
        let fetchError = null;

        if (activeTab === "personal") {
          if (!user) {
            setSets([]);
            setLoading(false);
            return;
          }
          const result = await supabase
            .from("flashcard_sets")
            .select("id, name, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .limit(10);

          // Map result to FlashcardSet type
          data = result.data
            ? result.data.map((item) => ({
                ...item,
                flashcard_count: 0,
                has_generated: false,
              }))
            : [];
          fetchError = result.error;
        } else {
          // Fetch public sets
          const result = await supabase
            .from("public_flashcard_sets")
            .select("id, name, created_at, plays, user_id")
            .order("plays", { ascending: false })
            .order("id", { ascending: true })
            .limit(10);

          // Map result to FlashcardSet type
          data = result.data
            ? result.data.map((item) => ({
                ...item,
                flashcard_count: 0,
                has_generated: false,
              }))
            : [];
          fetchError = result.error;
        }

        if (fetchError) throw fetchError;

        const setsWithCounts = await Promise.all(
          (data || []).map(async (set) => {
            const { count } = await supabase
              .from("flashcards")
              .select("*", { count: "exact", head: true })
              .eq(
                activeTab === "personal" ? "set_id" : "public_set_id",
                set.id,
              );

            const { data: generatedCards } = await supabase
              .from("flashcards")
              .select("term_generated, definition_generated")
              .eq(activeTab === "personal" ? "set_id" : "public_set_id", set.id)
              .or("term_generated.eq.true,definition_generated.eq.true")
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

    fetchSets();
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

    if (activeTab === "community") {
      const loadedSet = await loadPublicSet(setId);
      if (loadedSet) {
        onPublicSetLoaded?.(loadedSet);
        setCurrentlyLoaded(setId);
      }
      setLoadingSetId(null);
      return;
    }

    try {
      // Fetch flashcards with pagination to handle >1000 cards
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

      const set = sets.find((s) => s.id === setId);
      const setName = set ? set.name : "Unnamed Set";

      socket.emit("updateFlashcard", flashcards, setName, setId);
      setCurrentlyLoaded(setId);
      onPrivateSetLoaded?.(true);
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
      <div className="flex justify-center items-center pb-3 border-b-2 border-coffee/50 gap-6">
        <button
          className={`tab-btn left-arrow ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("personal");
            onOpenModal?.();
          }}
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
        </label>

        <button
          className={`tab-btn right-arrow ${activeTab === "community" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("community");
            onOpenPublicModal?.();
          }}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 [direction:rtl] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-coffee/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40 [&::-webkit-scrollbar]:absolute [&::-webkit-scrollbar]:left-0">
        <div className="flex flex-col space-y-2 [direction:ltr] min-h-full mb-1">
          {activeTab === "personal" && !user ? (
            <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
              Log in to save flashcards!
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
            </div>
          ) : sets.length === 0 ? (
            <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
              {activeTab === "personal"
                ? "No flashcard sets."
                : "No public sets found."}
            </div>
          ) : (
            <>
              {sets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => handleLoadSet(set.id)}
                  className={`group relative w-full rounded-lg bg-coffee border-none p-0 cursor-pointer outline-none ${
                    shakingSetId === set.id ? "animate-shake" : ""
                  }`}
                >
                  <span
                    className={`w-full h-full rounded-lg border-2 border-coffee p-2 text-left -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0 flex flex-col justify-center min-h-15 ${
                      shakingSetId === set.id
                        ? "bg-coffee/80 text-vanilla"
                        : `bg-vanilla text-coffee ${set.id == currentlyLoaded ? "bg-linear-to-r from-powder/30 to-powder/30" : ""}`
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
                            {activeTab === "community" &&
                              set.user_id ===
                                "d0c1b157-eb1f-42a9-bf67-c6384b7ca278" &&
                              "⭐ "}
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
                            {activeTab === "personal"
                              ? getRelativeTime(set.created_at)
                              : `${set.plays || 0} plays`}
                          </p>
                          {loadingSetId === set.id ? (
                            <div className="ml-2 shrink-0">
                              <div className="w-4 h-4 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : set.id === currentlyLoaded ? (
                            <div className="ml-2 shrink-0">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-3 h-3 text-coffee"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </span>
                </button>
              ))}
              <button
                className="text-center text-coffee font-bold underline decoration-2 underline-offset-2 hover:text-terracotta transition-colors cursor-pointer"
                onClick={() =>
                  activeTab === "personal"
                    ? onOpenModal?.()
                    : onOpenPublicModal?.()
                }
              >
                See More
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
