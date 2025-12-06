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
}

export function LoadFlashcards({ isLeader }: LoadFlashcardsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"personal" | "community">("personal");
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [shakingSetId, setShakingSetId] = useState<string | null>(null);
  //const [loadingSetId, setLoadingSetId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSets = async () => {
      if (!user) return;

      setLoading(true);

      try {
        const { data, error: fetchError } = await supabase
          .from("flashcard_sets")
          .select("id, name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

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
              has_generated: (generatedCards && generatedCards.length > 0) || false,
            };
          })
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
  }, [activeTab, user]);

  const handleLoadSet = async (setId: string) => {
    if (!isLeader) {
      setShakingSetId(setId);
      setTimeout(() => setShakingSetId(null), 500);
      return;
    }
    //setLoadingSetId(setId);

    try {
      const { data, error: fetchError } = await supabase
        .from("flashcards")
        .select("term, definition, trick_terms, trick_definitions, is_generated")
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

      socket.emit("updateFlashcard", flashcards);
    } catch {
      console.error("Failed to load set");
    } finally {
      //setLoadingSetId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full mb-10">
      {/* Tabs */}
      <div className="flex space-x-4 mb-2 border-b-2 border-coffee/10 pb-1 px-2">
        <button
          onClick={() => setActiveTab("personal")}
          className={`text-sm font-bold transition-colors ${
            activeTab === "personal" ? "text-coffee" : "text-coffee/40 hover:text-coffee/70"
          }`}
        >
          Personal
        </button>
        <button
          onClick={() => setActiveTab("community")}
          className={`text-sm font-bold transition-colors ${
            activeTab === "community" ? "text-coffee" : "text-coffee/40 hover:text-coffee/70"
          }`}
        >
          Community
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 mask-[linear-gradient(to_top,transparent,black_1.5rem)] [direction:rtl] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-coffee/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40 [&::-webkit-scrollbar]:absolute [&::-webkit-scrollbar]:left-0">
        <div className="flex flex-col space-y-2 [direction:ltr] min-h-full mb-3">
            {activeTab === "personal" ? (
                <>
                    {!user ? (
                        <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
                            Log in to see your flashcards
                        </div>
                    ) : loading && sets.length === 0 ? (
                        <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
                            Loading...
                        </div>
                    ) : sets.length === 0 ? (
                        <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
                            No flashcard sets found
                        </div>
                    ) : (
                        sets.map((set) => (
                            <div
                                key={set.id}
                                onClick={() => handleLoadSet(set.id)}
                                className={`p-2 rounded-sm border-2 border-coffee cursor-pointer transition-all group min-h-[3.5rem] flex flex-col justify-center ${
                                  shakingSetId === set.id
                                    ? "animate-shake bg-red-500 text-vanilla"
                                    : "bg-vanilla/50 hover:bg-white hover:border-coffee/30"
                                }`}
                            >
                                {shakingSetId === set.id ? (
                                    <div className="text-center font-bold text-sm">
                                        Must be leader
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-start w-full">
                                        <div className="w-full">
                                            <h3 className="truncate font-bold text-sm transition-colors text-coffee group-hover:text-terracotta">
                                                {set.name}
                                            </h3>
                                            <p className="text-xs font-medium mt-0.5 text-coffee/50">
                                                {set.flashcard_count} cards • {new Date(set.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
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
