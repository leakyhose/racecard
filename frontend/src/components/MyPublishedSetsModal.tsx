import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import { ExportModal } from "./ExportModal";
import type { Settings } from "@shared/types";
import { getRelativeTime } from "../utils/flashcardUtils";

interface MyPublishedSetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: Settings;
}

interface PublicFlashcardSet {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  plays: number;
  user_id: string;
  username: string;
  allow_view: boolean;
  allow_save: boolean;
  shuffle_flashcard: boolean | null;
  fuzzy_tolerance: boolean | null;
  use_term: boolean | null;
  use_mc: boolean | null;
  flashcard_count?: number;
  has_generated?: boolean;
  term_generated?: boolean;
  definition_generated?: boolean;
}

interface EditableFlashcard {
  id: string;
  term: string;
  definition: string;
  trick_terms: string[];
  trick_definitions: string[];
}

interface SettingConfig {
  locked: boolean;
  value: boolean | null;
}

export function MyPublishedSetsModal({
  isOpen,
  onClose,
  currentSettings,
}: MyPublishedSetsModalProps) {
  const { user } = useAuth();
  const [sets, setSets] = useState<PublicFlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mouseDownOnBackdrop = useRef(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  // Edit state
  const [editingSet, setEditingSet] = useState<PublicFlashcardSet | null>(null);
  const [flashcards, setFlashcards] = useState<EditableFlashcard[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cardPage, setCardPage] = useState(0);
  const [cardHasMore, setCardHasMore] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);
  const [isLoadingMoreCards, setIsLoadingMoreCards] = useState(false);
  const CARD_PAGE_SIZE = 50;

  // Edit settings state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [allowView, setAllowView] = useState(false);
  const [allowSave, setAllowSave] = useState(false);
  const [settings, setSettings] = useState<{
    shuffle: SettingConfig;
    fuzzy: SettingConfig;
    term: SettingConfig;
    mc: SettingConfig;
  }>({
    shuffle: { locked: true, value: currentSettings.shuffle },
    fuzzy: { locked: true, value: currentSettings.fuzzyTolerance },
    term: { locked: true, value: currentSettings.answerByTerm },
    mc: { locked: true, value: currentSettings.multipleChoice },
  });

  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const fetchSets = useCallback(
    async (pageToFetch: number, isInitial: boolean) => {
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

        const { data, error: fetchError } = await supabase
          .from("public_flashcard_sets")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);

        if (fetchError) throw fetchError;

        if (data && data.length < PAGE_SIZE) {
          setHasMore(false);
        }

        // Get flashcard counts and generated status
        const setsWithCounts = await Promise.all(
          (data || []).map(async (set) => {
            const { count } = await supabase
              .from("flashcards")
              .select("*", { count: "exact", head: true })
              .eq("public_set_id", set.id);

            const { count: termGenCount } = await supabase
              .from("flashcards")
              .select("*", { count: "exact", head: true })
              .eq("public_set_id", set.id)
              .eq("term_generated", true);

            const { count: defGenCount } = await supabase
              .from("flashcards")
              .select("*", { count: "exact", head: true })
              .eq("public_set_id", set.id)
              .eq("definition_generated", true);

            const hasTermGen = (termGenCount || 0) > 0;
            const hasDefGen = (defGenCount || 0) > 0;

            return {
              ...set,
              flashcard_count: count || 0,
              has_generated: hasTermGen || hasDefGen,
              term_generated: hasTermGen,
              definition_generated: hasDefGen,
            };
          })
        );

        if (isInitial) {
          setSets(setsWithCounts);
        } else {
          setSets((prev) => [...prev, ...setsWithCounts]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load published sets");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (isOpen && user) {
      setPage(0);
      setHasMore(true);
      setSets([]);
      setEditingSet(null);
      fetchSets(0, true);
    }
  }, [isOpen, user, fetchSets]);

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

  const fetchFlashcards = useCallback(
    async (setId: string, pageToFetch: number, isInitial: boolean = false) => {
      if (isInitial) {
        setCardLoading(true);
      } else {
        setIsLoadingMoreCards(true);
      }

      try {
        const from = pageToFetch * CARD_PAGE_SIZE;
        const to = from + CARD_PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("flashcards")
          .select("*")
          .eq("public_set_id", setId)
          .order("order_index", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) throw error;

        if (data) {
          if (data.length < CARD_PAGE_SIZE) {
            setCardHasMore(false);
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
        setCardLoading(false);
        setIsLoadingMoreCards(false);
      }
    },
    []
  );

  const fetchTotalCount = useCallback(async (setId: string) => {
    const { count } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("public_set_id", setId);
    setTotalCount(count || 0);
  }, []);

  const handleEditSet = async (set: PublicFlashcardSet) => {
    setEditingSet(set);
    setEditName(set.name);
    setEditDescription(set.description || "");
    setAllowView(set.allow_view);
    setAllowSave(set.allow_save);
    setDeletedIds([]);
    setCardPage(0);
    setCardHasMore(true);
    setFlashcards([]);
    setError("");

    // Initialize settings based on existing set values
    const termValue = set.use_term;
    const mcValue = set.use_mc;
    const fuzzyValue = set.fuzzy_tolerance;
    const shuffleValue = set.shuffle_flashcard;

    setSettings({
      shuffle: {
        locked: shuffleValue !== null,
        value: shuffleValue !== null ? shuffleValue : currentSettings.shuffle,
      },
      fuzzy: {
        locked: fuzzyValue !== null,
        value: fuzzyValue !== null ? fuzzyValue : currentSettings.fuzzyTolerance,
      },
      term: {
        locked: termValue !== null,
        value: termValue !== null ? termValue : currentSettings.answerByTerm,
      },
      mc: {
        locked: mcValue !== null,
        value: mcValue !== null ? mcValue : currentSettings.multipleChoice,
      },
    });

    await fetchTotalCount(set.id);
    await fetchFlashcards(set.id, 0, true);
  };

  const handleCardScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!editingSet) return;
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 100 &&
      !cardLoading &&
      !isLoadingMoreCards &&
      cardHasMore
    ) {
      const nextPage = cardPage + 1;
      setCardPage(nextPage);
      fetchFlashcards(editingSet.id, nextPage, false);
    }
  };

  const handleSettingChange = (
    key: keyof typeof settings,
    field: "locked" | "value",
    value: boolean
  ) => {
    setSettings((prev) => {
      // Prevent changing term if MC is on and generated options constrain it
      if (key === "term" && field === "value" && prev.mc.value) {
        if (editingSet?.term_generated && !editingSet?.definition_generated && !value) {
          return prev;
        }
        if (editingSet?.definition_generated && !editingSet?.term_generated && value) {
          return prev;
        }
      }

      const newSettings = { ...prev };
      if (field === "locked") {
        newSettings[key] = {
          locked: value,
          value: value
            ? key === "mc" && !editingSet?.has_generated
              ? false
              : key === "shuffle"
                ? currentSettings.shuffle
                : key === "fuzzy"
                  ? currentSettings.fuzzyTolerance
                  : key === "term"
                    ? currentSettings.answerByTerm
                    : currentSettings.multipleChoice
            : null,
        };

        // If MC is locked to ON, disable Fuzzy (lock it to OFF)
        if (key === "mc" && value && newSettings.mc.value) {
          newSettings.fuzzy = { locked: true, value: false };
        }
      } else {
        newSettings[key] = { ...newSettings[key], value };

        // If MC value changes to ON and is locked, disable Fuzzy
        if (key === "mc" && newSettings.mc.locked && value) {
          newSettings.fuzzy = { locked: true, value: false };
        }
      }

      // Enforce Term/Definition consistency if MC is ON
      if (newSettings.mc.value) {
        if (editingSet?.term_generated && !editingSet?.definition_generated) {
          newSettings.term = { ...newSettings.term, value: true };
        } else if (editingSet?.definition_generated && !editingSet?.term_generated) {
          newSettings.term = { ...newSettings.term, value: false };
        }
      }

      return newSettings;
    });
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
    value: string
  ) => {
    setFlashcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleUpdateDistractor = (
    id: string,
    type: "trick_terms" | "trick_definitions",
    index: number,
    value: string
  ) => {
    setFlashcards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newDistractors = [...c[type]];
        newDistractors[index] = value;
        return { ...c, [type]: newDistractors };
      })
    );
  };

  const handleSaveChanges = async () => {
    if (!editingSet) return;

    if (flashcards.length === 0) {
      setError("Cannot save an empty set");
      return;
    }

    if (!editName.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 1. Update the public set metadata
      const { data: updateData, error: updateSetError } = await supabase
        .from("public_flashcard_sets")
        .update({
          name: editName.trim(),
          description: editDescription.trim(),
          allow_view: allowView,
          allow_save: allowSave,
          shuffle_flashcard: settings.shuffle.locked ? settings.shuffle.value : null,
          fuzzy_tolerance: settings.fuzzy.locked ? settings.fuzzy.value : null,
          use_term: settings.term.locked ? settings.term.value : null,
          use_mc: settings.mc.locked ? settings.mc.value : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSet.id)
        .eq("user_id", user?.id)
        .select();

      if (updateSetError) {
        console.error("Error updating public set:", updateSetError);
        throw updateSetError;
      }

      console.log("Update result:", updateData);

      if (!updateData || updateData.length === 0) {
        console.error("No rows updated - possibly RLS blocking or row doesn't exist");
        setError("Failed to update set - permission denied");
        setSaving(false);
        return;
      }

      // 2. Delete removed flashcards
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("flashcards")
          .delete()
          .in("id", deletedIds);
        if (deleteError) throw deleteError;
      }

      // 3. Update flashcards
      const updates = flashcards.map((card, index) => ({
        id: card.id,
        public_set_id: editingSet.id,
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

      // Refresh the sets list
      setEditingSet(null);
      setPage(0);
      setHasMore(true);
      fetchSets(0, true);
    } catch (err) {
      console.error(err);
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSet = async (setId: string, setName: string) => {
    if (!user) return;
    
    if (!confirm(`Are you sure you want to unpublish "${setName}"? This will remove it from the public library.`)) {
      return;
    }

    setError("");

    try {
      // Delete flashcards first (foreign key constraint)
      const { error: deleteCardsError } = await supabase
        .from("flashcards")
        .delete()
        .eq("public_set_id", setId);

      if (deleteCardsError) {
        console.error("Error deleting flashcards:", deleteCardsError);
        throw deleteCardsError;
      }

      // Delete the public set
      const { data: deleteData, error: deleteSetError } = await supabase
        .from("public_flashcard_sets")
        .delete()
        .eq("id", setId)
        .eq("user_id", user.id)
        .select();

      if (deleteSetError) {
        console.error("Error deleting public set:", deleteSetError);
        throw deleteSetError;
      }

      console.log("Delete result:", deleteData);

      if (!deleteData || deleteData.length === 0) {
        console.error("No rows deleted - possibly RLS blocking or row doesn't exist");
        setError("Failed to delete set - permission denied or set not found");
        return;
      }

      // Refresh the list
      setPage(0);
      setHasMore(true);
      fetchSets(0, true);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete flashcard set");
    }
  };

  if (!isOpen) return null;

  // Editing view
  if (editingSet) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-60 bg-coffee/50 cursor-not-allowed"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            mouseDownOnBackdrop.current = true;
          }
        }}
        onClick={(e) => {
          if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
            if (!saving && !cardLoading) {
              setEditingSet(null);
            }
          }
          mouseDownOnBackdrop.current = false;
        }}
      >
        <div
          className="bg-light-vanilla border-3 border-coffee p-8 max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col select-text"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4 mb-4 flex justify-between items-center">
            <span>Edit Published Set</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowExport(true)}
                disabled={saving || cardLoading}
                className="text-sm font-bold text-coffee hover:text-terracotta underline decoration-2 underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export
              </button>
              <span className="text-sm text-coffee/70 font-normal">
                {totalCount} Cards • {editingSet.plays} plays
              </span>
            </div>
          </h2>

          {error && (
            <div className="mb-4 p-3 border-2 border-terracotta bg-terracotta/10 text-terracotta text-sm font-bold">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2" onScroll={handleCardScroll}>
            {/* Set Details */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-coffee font-bold mb-2 text-sm">
                  Set Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-coffee bg-white/50 text-coffee focus:outline-none focus:bg-white font-bold"
                  placeholder="Name your set"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-coffee font-bold mb-2 text-sm">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-coffee bg-white/50 text-coffee focus:outline-none focus:bg-white font-bold h-20 resize-none"
                  placeholder="Describe your set..."
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-light-vanilla border-2 border-coffee/20">
                  <div>
                    <div className="font-bold text-sm">Allow Viewing All Cards</div>
                    <div className="text-xs text-coffee/60">
                      Let users browse all flashcards
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowView}
                    onChange={(e) => setAllowView(e.target.checked)}
                    className="w-5 h-5 accent-coffee cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-light-vanilla border-2 border-coffee/20">
                  <div>
                    <div className="font-bold text-sm">Allow Saving</div>
                    <div className="text-xs text-coffee/60">
                      Let users save to their library
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowSave}
                    onChange={(e) => setAllowSave(e.target.checked)}
                    className="w-5 h-5 accent-coffee cursor-pointer"
                  />
                </div>
              </div>

              {/* Game Settings */}
              <div>
                <label className="block text-coffee font-bold mb-4 text-sm border-b-2 border-coffee/20 pb-2">
                  Game Settings
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "shuffle", label: "Shuffle Cards", desc: "Randomize card order" },
                    { key: "fuzzy", label: "Fuzzy Matching", desc: "Allow typos in answers" },
                    { key: "term", label: "Answer using Definition/Term", desc: "Show definition, answer term" },
                    { key: "mc", label: "Multiple Choice", desc: "Use generated options", disabled: !editingSet.has_generated },
                  ].map((setting) => {
                    const config = settings[setting.key as keyof typeof settings];
                    const isMcLockedOn = settings.mc.locked && settings.mc.value === true;

                    const isTermConstrained =
                      setting.key === "term" &&
                      settings.mc.value === true &&
                      ((editingSet.term_generated && !editingSet.definition_generated) ||
                        (editingSet.definition_generated && !editingSet.term_generated));

                    const isFuzzyDisabled = setting.key === "fuzzy" && isMcLockedOn;
                    const isDisabled = setting.disabled || isFuzzyDisabled || isTermConstrained;

                    return (
                      <div
                        key={setting.key}
                        className={`flex items-center justify-between p-3 bg-vanilla border-2 border-coffee/20 ${isDisabled ? "opacity-50" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{setting.label}</div>
                          <div className="text-xs text-coffee/60">{setting.desc}</div>
                          {setting.disabled && (
                            <div className="text-xs text-terracotta font-bold mt-1">
                              Requires generated options
                            </div>
                          )}
                          {isFuzzyDisabled && (
                            <div className="text-xs text-terracotta font-bold mt-1">
                              Disabled when MC is ON
                            </div>
                          )}
                          {isTermConstrained && (
                            <div className="text-xs text-terracotta font-bold mt-1">
                              Fixed by generated options
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-col items-end gap-1">
                            <label className="text-xs font-bold text-coffee/70">Lock?</label>
                            <input
                              type="checkbox"
                              checked={config.locked}
                              disabled={isDisabled}
                              onChange={(e) =>
                                handleSettingChange(
                                  setting.key as keyof typeof settings,
                                  "locked",
                                  e.target.checked
                                )
                              }
                              className="w-5 h-5 accent-coffee cursor-pointer"
                            />
                          </div>

                          {config.locked ? (
                            <div className={`flex flex-col items-end gap-1 ${setting.key === "term" ? "w-28" : "w-16"}`}>
                              <label className="text-xs font-bold text-coffee/70">Value</label>
                              {setting.key === "term" ? (
                                <button
                                  onClick={() =>
                                    !isDisabled &&
                                    handleSettingChange(
                                      setting.key as keyof typeof settings,
                                      "value",
                                      !config.value
                                    )
                                  }
                                  disabled={isDisabled}
                                  className={`px-2 py-1 text-xs font-bold border-2 border-coffee transition-colors w-full ${
                                    config.value ? "bg-powder text-coffee" : "bg-thistle text-coffee"
                                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                  {config.value ? "Term" : "Def"}
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    !isDisabled &&
                                    handleSettingChange(
                                      setting.key as keyof typeof settings,
                                      "value",
                                      !config.value
                                    )
                                  }
                                  disabled={isDisabled}
                                  className={`px-2 py-1 text-xs font-bold border-2 border-coffee transition-colors w-full ${
                                    config.value ? "bg-mint text-coffee" : "bg-terracotta text-vanilla"
                                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                  {config.value ? "ON" : "OFF"}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className={`flex flex-col items-end gap-1 ${setting.key === "term" ? "w-28" : "w-16"}`}>
                              <label className="text-xs font-bold text-coffee/70">Value</label>
                              <div className="px-2 py-1 text-xs font-bold border-2 border-coffee bg-coffee/10 text-coffee w-full text-center">
                                ANY
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Flashcards */}
            <div className="border-t-2 border-coffee/20 pt-4">
              <h3 className="font-bold text-lg mb-4">Flashcards</h3>
              {cardLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {flashcards.map((card) => (
                    <div
                      key={card.id}
                      className="border-2 border-coffee p-4 bg-vanilla relative group"
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
                            onChange={(e) => handleUpdateCard(card.id, "term", e.target.value)}
                            className="w-full bg-vanilla border-2 border-coffee/20 focus:border-coffee p-2 min-h-20 resize-none font-bold text-lg outline-none transition-colors"
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
                                  handleUpdateDistractor(card.id, "trick_terms", i, e.target.value)
                                }
                                className="w-full bg-vanilla/50 border border-coffee/20 focus:border-coffee p-1.5 text-sm outline-none transition-colors"
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
                            onChange={(e) => handleUpdateCard(card.id, "definition", e.target.value)}
                            className="w-full bg-vanilla border-2 border-coffee/20 focus:border-coffee p-2 min-h-20 resize-none text-base outline-none transition-colors"
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
                                  handleUpdateDistractor(card.id, "trick_definitions", i, e.target.value)
                                }
                                className="w-full bg-vanilla/50 border border-coffee/20 focus:border-coffee p-1.5 text-sm outline-none transition-colors"
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
                  {isLoadingMoreCards && (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t-3 border-coffee pt-4 flex gap-4">
            <button
              onClick={() => setEditingSet(null)}
              className="flex-1 border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving || cardLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={saving || cardLoading}
              className="flex-1 border-2 border-coffee bg-powder text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              {saving ? "Publishing Changes..." : "Publish Changes"}
            </button>
          </div>
        </div>

        {showExport && (
          <ExportModal
            isOpen={true}
            onClose={() => setShowExport(false)}
            setId={editingSet.id}
            setName={editingSet.name}
            isPublicSet={true}
          />
        )}
      </div>
    );
  }

  // List view
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-60 bg-coffee/50 cursor-not-allowed"
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
        className="bg-light-vanilla border-3 border-coffee p-8 max-w-5xl w-full mx-4 h-[80vh] flex flex-col select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4 mb-4">
          My Published Flashcards
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
        ) : sets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-coffee/70">
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <div>You haven't published any flashcards yet</div>
              <div className="text-sm mt-2">
                Publish a set from your private library to share it with others
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2" onScroll={handleScroll}>
            <div className="space-y-4">
              {sets.map((set) => (
                <div
                  key={set.id}
                  className="border-2 border-coffee p-4 bg-vanilla"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-coffee truncate">
                        {set.name}
                      </h3>
                      {set.description && (
                        <p className="text-sm text-coffee/70 mt-1 line-clamp-2">
                          {set.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-coffee/50">
                        <span>{set.flashcard_count} cards</span>
                        <span>{set.plays} plays</span>
                        <span>Updated {getRelativeTime(set.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEditSet(set)}
                        className="px-4 py-2 border-2 border-coffee bg-powder text-coffee font-bold text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSet(set.id, set.name)}
                        className="px-4 py-2 border-2 border-coffee bg-terracotta text-vanilla font-bold text-sm"
                      >
                        Unpublish
                      </button>
                    </div>
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
            className="w-full border-2 border-coffee bg-white/20 text-coffee px-4 py-3 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
