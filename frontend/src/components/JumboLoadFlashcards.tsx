import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { socket } from "../socket";
import type { Flashcard, Settings } from "@shared/types";
import { loadPublicSet, type LoadedPublicSet } from "../utils/loadPublicSet";
import { getRelativeTime } from "../utils/flashcardUtils";
import { PublishFlashcardsModal } from "./PublishFlashcardsModal";
import { EditFlashcardsModal } from "./EditFlashcardsModal";
import { MyPublishedSetsModal } from "./MyPublishedSetsModal";

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
  updated_at?: string;
  description?: string;
  flashcard_count: number;
  has_generated: boolean;
  term_generated?: boolean;
  definition_generated?: boolean;
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
  currentSettings?: Settings;
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
  currentSettings = {
      shuffle: true,
      fuzzyTolerance: true,
      answerByTerm: false,
      multipleChoice: true,
      roundTime: 15,
      pointsToWin: 100,
  },
}: JumboLoadFlashcardsProps) {
  const { user } = useAuth();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);
  const [shakingSetId, setShakingSetId] = useState<string | null>(null);
  const [publishingSet, setPublishingSet] = useState<FlashcardSet | null>(null);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [showMyPublishedSets, setShowMyPublishedSets] = useState(false);
  const requestIdRef = useRef(0);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const fetchSets = useCallback(async (pageToFetch: number, isInitial: boolean = false, currentRequestId: number = 0) => {
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
          .select("id, name, description, created_at, updated_at, user_id")
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
          .select(
            "id, name, description, created_at, updated_at, plays, user_id, username",
          );

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

      if (requestIdRef.current !== currentRequestId && currentRequestId !== 0) {
          return;
      }

      if (fetchError) throw fetchError;

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      const setIdField = activeTab === "personal" ? "set_id" : "public_set_id";

      const setsWithCounts = await Promise.all(
        (data || []).map(async (set) => {
          const { data: flashcardData, count } = await supabase
            .from("flashcards")
            .select("term_generated, definition_generated", { count: "exact" })
            .eq(setIdField, set.id)
            .limit(1000);

          const hasTermGen = flashcardData?.some(f => f.term_generated) || false;
          const hasDefGen = flashcardData?.some(f => f.definition_generated) || false;

          return {
            ...set,
            flashcard_count: count || 0,
            has_generated: hasTermGen || hasDefGen,
            term_generated: hasTermGen,
            definition_generated: hasDefGen,
          };
        }),
      );

      if (requestIdRef.current !== currentRequestId && currentRequestId !== 0) {
        return;
      }

      if (isInitial) {
        setSets(setsWithCounts);
      } else {
        setSets((prev) => [...prev, ...setsWithCounts]);
      }
    } catch (err) {
      if (requestIdRef.current === currentRequestId || currentRequestId === 0) {
        console.error("Failed to load flashcard sets", err);
      }
    } finally {
      if (requestIdRef.current === currentRequestId || currentRequestId === 0) {
        setLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [activeTab, user, submittedQuery]);

  useEffect(() => {
    requestIdRef.current += 1;
    setPage(0);
    setHasMore(true);
    fetchSets(0, true, requestIdRef.current);
  }, [activeTab, fetchSets, refreshTrigger, submittedQuery]); 

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoadingMore && !loading) {
      fetchSets(page + 1, false, requestIdRef.current);
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

      const selectedSet = sets.find((s) => s.id === setId);
      const description =
        selectedSet?.description ||
        `${user?.user_metadata?.username || "User"}'s private set`;
      const authorId = user?.id;
      const authorName = user?.user_metadata?.username || "User";
      const createdAt = selectedSet?.created_at;
      const updatedAt = selectedSet?.updated_at;

      socket.emit(
        "updateFlashcard",
        flashcards,
        setName,
        setId,
        description,
        undefined,
        undefined,
        authorId,
        authorName,
        createdAt,
        updatedAt,
      );
      onPrivateSetLoaded?.(true);
    } catch {
      console.error("Failed to load set");
    } finally {
      setLoadingSetId(null);
      onLoadingChange?.(false);
    }
  };

  const handleDelete = async (setId: string, setName: string) => {
    if (!confirm(`Are you sure you want to delete "${setName}"?`)) {
      return;
    }

    try {
      const { error: deleteCardsError } = await supabase
        .from("flashcards")
        .delete()
        .eq("set_id", setId);

      if (deleteCardsError) throw deleteCardsError;

      const { error: deleteSetError } = await supabase
        .from("flashcard_sets")
        .delete()
        .eq("id", setId);

      if (deleteSetError) throw deleteSetError;

      requestIdRef.current += 1;
      setPage(0);
      setHasMore(true);
      fetchSets(0, true, requestIdRef.current);
    } catch {
      console.error("Failed to delete set");
    }
  };

  const handleRandom = async () => {
    if (loadingSetId || isLoading) return;

    if (!isLeader) {
      setShakingSetId("random");
      setTimeout(() => setShakingSetId(null), 500);
      return;
    }

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
      <div className="flex justify-between items-center pb-3 pt-2 border-b-2 border-coffee/50 px-6 shrink-0">
        <div className="w-1/4"></div>
        <div className="flex justify-center items-center w-2/4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "personal" ? "Search private sets..." : "Search public sets..."}
            className="w-64 px-4 h-6 bg-vanilla border-2 border-coffee rounded-md text-coffee placeholder:text-coffee/30 -translate-y-0.5 transition-transform duration-100 ease-out font-bold text-xs outline-none focus:shadow-[inset_0_0_0_1px_var(--color-powder)] select-text text-center ml-auto mr-auto"
          />
        </div>
        <div className="w-1/4 flex justify-end">
          {user && (
            <button
              onClick={() => setShowMyPublishedSets(true)}
              className="text-xs font-bold text-coffee hover:text-terracotta underline decoration-2 underline-offset-2 whitespace-nowrap"
            >
              <span className="hidden sm:inline">View my published</span>
              <span className="sm:hidden">Published</span>
            </button>
          )}
        </div>
      </div>

      <div
        className="mx-3 flex-1 overflow-y-auto overflow-x-hidden p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-coffee/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
          </div>
        ) : sets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-coffee/70 font-bold">
            {activeTab === "personal"
              ? !user
                ? "Log in to save flashcards!"
                : "No flashcard sets found. Upload some at the bottom right!"
              : "No public sets found. Make your own and publish them!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 pb-6">
            {activeTab === "community" && !submittedQuery && (
              <div
                onClick={handleRandom}
                className={`group relative h-64 w-full perspective-[1000px] ${
                  loadingSetId ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                } ${shakingSetId === "random" ? "animate-shake" : ""}`}
              >
                <div className="absolute inset-0 rounded-[20px] border-2 border-coffee bg-vanilla/50 shadow-[0_0_10px_rgba(0,0,0,0.2)] flex items-end justify-center pb-0 -z-10">
                  <div className={`text-center text-[9px] font-bold tracking-[0.2em] ${shakingSetId === "random" ? "text-terracotta" : "text-coffee/80"}`}>
                    {shakingSetId === "random"
                      ? "MUST BE LEADER"
                      : "CLICK FOR RANDOM SET"}
                  </div>
                </div>

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
                <div className="absolute inset-0 rounded-[20px] border-2 border-coffee bg-vanilla/50 shadow-[0_0_10px_rgba(0,0,0,0.2)] flex items-end justify-center pb-0 -z-10">
                  <div
                    className={`text-center text-[9px] font-bold tracking-[0.2em] ${
                      shakingSetId === set.id ? "text-terracotta" : "text-coffee/80"
                    }`}
                  >
                    {shakingSetId === set.id ? "MUST BE LEADER" : "CLICK TO LOAD"}
                  </div>
                </div>

                <div
                  className={`h-full w-full transition-transform duration-300 ease-out ${
                    !loadingSetId ? "group-hover:-translate-y-[15px]" : ""
                  }`}
                >
                  <div className="relative h-full w-full rounded-[20px] border-2 border-coffee bg-vanilla overflow-hidden">
                    <div className={`absolute inset-0 bg-light-vanilla/20 ${activeTab === "community" ? "shadow-[inset_0_0_0_2px_var(--color-terracotta)]" : "shadow-[inset_0_0_0_2px_var(--color-powder)]"} rounded-[18px]`} />
                    <div className="relative h-full w-full p-6 flex flex-col items-center justify-between text-center">
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
                        {activeTab === "personal" && (
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
                        )}
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
            requestIdRef.current += 1;
            setPage(0);
            setHasMore(true);
            fetchSets(0, true, requestIdRef.current);
          }}
        />
      )}

      {showMyPublishedSets && (
        <MyPublishedSetsModal
          isOpen={true}
          onClose={() => setShowMyPublishedSets(false)}
          currentSettings={currentSettings}
        />
      )}
    </div>
  );
}
