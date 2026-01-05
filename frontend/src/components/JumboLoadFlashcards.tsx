import { useState, useEffect, useCallback } from "react";
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
  username?: string;
}

interface JumboLoadFlashcardsProps {
  isLeader: boolean;
  refreshTrigger?: number;
  onPublicSetLoaded?: (set: LoadedPublicSet) => void;
  onPrivateSetLoaded?: (saved?: boolean) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  isLoading?: boolean;
  submittedQuery?: string;
  activeTab: "personal" | "community";
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function JumboLoadFlashcards({
  isLeader,
  refreshTrigger = 0,
  onPublicSetLoaded,
  onPrivateSetLoaded,
  onLoadingChange,
  isLoading = false,
  submittedQuery = "",
  activeTab,
  searchQuery,
  setSearchQuery,
}: JumboLoadFlashcardsProps) {
  const { user } = useAuth();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);
  const [shakingSetId, setShakingSetId] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const fetchSets = useCallback(async (pageToFetch: number, isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const from = pageToFetch * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let data: FlashcardSet[] = [];
      let fetchError = null;

      if (activeTab === "personal") {
        if (!user) {
          setSets([]);
          setLoading(false);
          return;
        }
        let query = supabase
          .from("flashcard_sets")
          .select("id, name, created_at")
          .eq("user_id", user.id);

        if (submittedQuery.trim()) {
          query = query.ilike("name", `%${submittedQuery}%`);
        } else {
          query = query
            .order("created_at", { ascending: false })
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
      } else {
        let query = supabase
          .from("public_flashcard_sets")
          .select("id, name, created_at, plays, user_id, username");

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

      if (fetchError) throw fetchError;

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

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

      if (isInitial) {
        setSets(setsWithCounts);
      } else {
        setSets((prev) => [...prev, ...setsWithCounts]);
      }
    } catch (err) {
      console.error("Failed to load flashcard sets", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeTab, user, submittedQuery]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchSets(0, true);
  }, [activeTab, fetchSets]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchSets(0, true);
  }, [refreshTrigger, submittedQuery, fetchSets]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoadingMore && !loading) {
      fetchSets(page + 1);
      setPage((prev) => prev + 1);
    }
  };

  const handleLoadSet = async (setId: string, setName: string) => {
    if (isLoading) return;

    if (!isLeader) {
      setShakingSetId(setId);
      setTimeout(() => setShakingSetId(null), 500);
      return;
    }
    setLoadingSetId(setId);
    onLoadingChange?.(true);

    if (activeTab === "community") {
      const loadedSet = await loadPublicSet(setId);
      if (loadedSet) {
        onPublicSetLoaded?.(loadedSet);
      }
      setLoadingSetId(null);
      onLoadingChange?.(false);
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
          .order("id", { ascending: true })
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

      socket.emit("updateFlashcard", flashcards, setName, setId);
      onPrivateSetLoaded?.(true);
    } catch {
      console.error("Failed to load set");
    } finally {
      setLoadingSetId(null);
      onLoadingChange?.(false);
    }
  };

  const handleRandom = async () => {
    if (loadingSetId || isLoading) return;
    setLoadingSetId("random");
    onLoadingChange?.(true);
    
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
      setLoadingSetId(null);
      onLoadingChange?.(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header with Search Bar */}
      <div className="flex justify-center items-center pb-3 gap-6 shrink-0 pt-2 border-b-2 border-coffee/50">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === "personal" ? "Search private sets..." : "Search public sets..."}
          className="w-64 px-4 h-6 bg-vanilla border-2 border-coffee rounded-md text-coffee placeholder:text-coffee/30 -translate-y-0.5 transition-transform duration-100 ease-out font-bold text-xs outline-none focus:shadow-[inset_0_0_0_1px_var(--color-powder)] select-text text-center"
        />
      </div>

      {/* Search Bar for Community Tab - Removed as it's now in header */}


      {/* Content */}
      <div
        className="mx-3 flex-1 overflow-y-auto overflow-x-hidden p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-coffee/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
          </div>
        ) : sets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-coffee/70 font-bold italic">
            {activeTab === "personal"
              ? !user
                ? "Log in to save flashcards!"
                : "No flashcard sets found."
              : "No public sets found."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 pb-6">
            {/* Random Set Card */}
            {activeTab === "community" && !submittedQuery && (
              <div
                onClick={handleRandom}
                className={`group relative h-64 w-full perspective-[1000px] ${
                  loadingSetId ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                }`}
              >
                {/* Under Card */}
                <div className="absolute inset-0 rounded-[20px] border-2 border-coffee bg-vanilla/50 shadow-[0_0_10px_rgba(0,0,0,0.2)] flex items-end justify-center pb-0 -z-10">
                  <div className="text-center text-[9px] font-bold tracking-[0.2em] text-coffee/80">
                    CLICK FOR RANDOM SET
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
                    <div className="relative h-full w-full p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-4xl mb-2">🎲</div>
                        <h3 className="text-xl font-bold text-coffee line-clamp-3 wrap-break-words w-full px-2">
                          Random Set
                        </h3>
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-sm text-coffee/70 font-bold">
                            Surprise me!
                          </p>
                        </div>
                      
                      {loadingSetId === "random" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-vanilla/50 rounded-[18px]">
                          <div className="w-6 h-6 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sets.map((set) => (
              <div
                key={set.id}
                onClick={() => handleLoadSet(set.id, set.name)}
                className={`group relative h-64 w-full perspective-[1000px] ${
                  loadingSetId ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                } ${shakingSetId === set.id ? "animate-shake" : ""}`}
              >
                {/* Under Card */}
                <div className="absolute inset-0 rounded-[20px] border-2 border-coffee bg-vanilla/50 shadow-[0_0_10px_rgba(0,0,0,0.2)] flex items-end justify-center pb-0 -z-10">
                  <div
                    className={`text-center text-[9px] font-bold tracking-[0.2em] ${
                      shakingSetId === set.id ? "text-terracotta" : "text-coffee/80"
                    }`}
                  >
                    {shakingSetId === set.id ? "MUST BE LEADER" : "CLICK TO LOAD"}
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
                        {activeTab === "community" &&
                          set.user_id ===
                            "d0c1b157-eb1f-42a9-bf67-c6384b7ca278" && (
                            <div className="flex flex-col items-center mb-1">
                              <div className="text-xs">⭐</div>
                              <div className="shrink-0 text-xs font-bold text-coffee/80 uppercase tracking-wider">
                                Featured Set
                              </div>
                            </div>
                          )}
                        <h3 className="text-xl font-bold text-coffee line-clamp-3 wrap-break-words w-full px-2">
                          {set.name}
                        </h3>
                        <div className="flex flex-col gap-1 mt-2">
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
                      </div>
                      
                      {loadingSetId === set.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-vanilla/50 rounded-[18px]">
                          <div className="w-6 h-6 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoadingMore && (
              <div className="col-span-full flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
