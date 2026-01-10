import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import type { Settings } from "@shared/types";

interface FlashcardDBRow {
  id: string;
  term: string;
  definition: string;
  trick_terms: string[] | null;
  trick_definitions: string[] | null;
  is_generated: boolean | null;
  term_generated: boolean | null;
  definition_generated: boolean | null;
  order_index: number | null;
  set_id: string | null;
  public_set_id: string | null;
  created_at: string;
}

interface PublishFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  initialName: string;
  hasGenerated: boolean;
  termGenerated?: boolean;
  definitionGenerated?: boolean;
  currentSettings: Settings;
}

interface SettingConfig {
  locked: boolean;
  value: boolean | null;
}

export function PublishFlashcardsModal({
  isOpen,
  onClose,
  setId,
  initialName,
  hasGenerated,
  termGenerated,
  definitionGenerated,
  currentSettings,
}: PublishFlashcardsModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [allowView, setAllowView] = useState(false);
  const [allowSave, setAllowSave] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const mouseDownOnBackdrop = useRef(false);

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

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription("");
      setAllowView(false);
      setAllowSave(false);
      setError("");
      setSuccess(false);

      let termValue = currentSettings.answerByTerm;

      if (termGenerated && !definitionGenerated) {
        termValue = true;
      } else if (definitionGenerated && !termGenerated) {
        termValue = false;
      }

      const mcValue = hasGenerated ? currentSettings.multipleChoice : false;

      if (mcValue) {
        if (termGenerated && !definitionGenerated) {
          termValue = true;
        } else if (definitionGenerated && !termGenerated) {
          termValue = false;
        }
      } else {
      }

      setSettings({
        shuffle: { locked: true, value: currentSettings.shuffle },
        fuzzy: { locked: true, value: currentSettings.fuzzyTolerance },
        term: { locked: true, value: termValue },
        mc: {
          locked: true,
          value: mcValue,
        },
      });
    }
  }, [
    isOpen,
    initialName,
    currentSettings,
    hasGenerated,
    termGenerated,
    definitionGenerated,
  ]);

  const handleSettingChange = (
    key: keyof typeof settings,
    field: "locked" | "value",
    value: boolean,
  ) => {
    setSettings((prev) => {
      if (key === "term" && field === "value" && prev.mc.value) {
        if (termGenerated && !definitionGenerated && !value) {
          return prev;
        }
        if (definitionGenerated && !termGenerated && value) {
          return prev;
        }
      }

      const newSettings = { ...prev };
      if (field === "locked") {
        newSettings[key] = {
          locked: value,
          value: value
            ? key === "mc" && !hasGenerated
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

        if (key === "mc" && value && newSettings.mc.value) {
          newSettings.fuzzy = { locked: true, value: false };
        }
      } else {
        newSettings[key] = { ...newSettings[key], value };

        if (key === "mc" && newSettings.mc.locked && value) {
          newSettings.fuzzy = { locked: true, value: false };
        }
      }

      if (newSettings.mc.value) {
        if (termGenerated && !definitionGenerated) {
          newSettings.term = { ...newSettings.term, value: true };
        } else if (definitionGenerated && !termGenerated) {
          newSettings.term = { ...newSettings.term, value: false };
        }
      }

      return newSettings;
    });
  };

  const handlePublish = async () => {
    if (!user) return;
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setPublishing(true);
    setError("");

    try {

      const { data: publicSet, error: createError } = await supabase
        .from("public_flashcard_sets")
        .insert({
          user_id: user.id,
          username: user.user_metadata?.username || "Unknown",
          name: name.trim(),
          description: description.trim(),
          allow_view: allowView,
          allow_save: allowSave,
          shuffle_flashcard: settings.shuffle.locked
            ? settings.shuffle.value
            : null,
          fuzzy_tolerance: settings.fuzzy.locked ? settings.fuzzy.value : null,
          use_term: settings.term.locked ? settings.term.value : null,
          use_mc: settings.mc.locked ? settings.mc.value : null,
        })
        .select()
        .single();

      if (createError) throw createError;

      let allOriginalCards: FlashcardDBRow[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from("flashcards")
          .select("*")
          .eq("set_id", setId)
          .order("order_index", { ascending: true })
          .order("id", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          allOriginalCards = [...allOriginalCards, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allOriginalCards.length === 0) {
        throw new Error("No flashcards found to publish");
      }

      const cardsToInsert = allOriginalCards.map((card, index) => ({
        public_set_id: publicSet.id,
        term: card.term,
        definition: card.definition,
        trick_terms: card.trick_terms || [],
        trick_definitions: card.trick_definitions || [],
        is_generated: card.is_generated || false,
        term_generated: card.term_generated || false,
        definition_generated: card.definition_generated || false,
        order_index: card.order_index ?? index,
      }));

      const BATCH_SIZE = 100;
      for (let i = 0; i < cardsToInsert.length; i += BATCH_SIZE) {
        const batch = cardsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from("flashcards")
          .insert(batch);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Publish error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "object" && err !== null && "message" in err) {
        setError((err as { message: string }).message);
      } else {
        setError("Failed to publish flashcards: " + JSON.stringify(err));
      }
    } finally {
      setPublishing(false);
    }
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
          if (!publishing) {
            onClose();
          }
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        className="bg-light-vanilla border-3 border-coffee p-8 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-y-auto select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4 mb-6">
          Publish Flashcards
        </h2>

        {success ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-coffee font-bold text-xl">Published!</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-coffee font-bold mb-2 text-sm">
                Set Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-coffee bg-vanilla text-coffee focus:outline-none focus:bg-white font-bold"
                placeholder="Name your set"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-coffee font-bold mb-2 text-sm">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border-2 border-coffee bg-vanilla text-coffee focus:outline-none focus:bg-white font-bold h-24 resize-none"
                placeholder="Describe your set..."
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-vanilla border-2 border-coffee/20">
              <div>
                <div className="font-bold text-sm">Allow Viewing All Cards</div>
                <div className="text-xs text-coffee/60">
                  Let users browse all flashcards in the set
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={allowView}
                  onChange={(e) => setAllowView(e.target.checked)}
                  className="w-5 h-5 accent-coffee cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-light-vanilla border-2 border-coffee/20">
              <div>
                <div className="font-bold text-sm">Allow Saving</div>
                <div className="text-xs text-coffee/60">
                  Let users save this set to their library
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={allowSave}
                  onChange={(e) => setAllowSave(e.target.checked)}
                  className="w-5 h-5 accent-coffee cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-coffee font-bold mb-4 text-sm border-b-2 border-coffee/20 pb-2">
                Game Settings
              </label>
              <div className="space-y-4">
                {[
                  {
                    key: "shuffle",
                    label: "Shuffle Cards",
                    desc: "Randomize card order",
                  },
                  {
                    key: "fuzzy",
                    label: "Fuzzy Matching",
                    desc: "Allow typos in answers",
                  },
                  {
                    key: "term",
                    label: "Answer using Defintion/Term",
                    desc: "Show definition, answer term",
                  },
                  {
                    key: "mc",
                    label: "Multiple Choice",
                    desc: "Use generated options",
                    disabled: !hasGenerated,
                  },
                ].map((setting) => {
                  const config = settings[setting.key as keyof typeof settings];
                  const isMcLockedOn =
                    settings.mc.locked && settings.mc.value === true;

                  const isTermConstrained =
                    setting.key === "term" &&
                    settings.mc.value === true &&
                    ((termGenerated && !definitionGenerated) ||
                      (definitionGenerated && !termGenerated));

                  const isFuzzyDisabled =
                    setting.key === "fuzzy" && isMcLockedOn;
                  const isDisabled =
                    setting.disabled || isFuzzyDisabled || isTermConstrained;

                  return (
                    <div
                      key={setting.key}
                      className={`flex items-center justify-between p-3 bg-light-vanilla border-2 border-coffee/20 ${isDisabled ? "opacity-50" : ""}`}
                    >
                      <div>
                        <div className="font-bold text-sm">{setting.label}</div>
                        <div className="text-xs text-coffee/60">
                          {setting.desc}
                        </div>
                        {setting.disabled && (
                          <div className="text-xs text-terracotta font-bold mt-1">
                            Requires generated options
                          </div>
                        )}
                        {isFuzzyDisabled && (
                          <div className="text-xs text-terracotta font-bold mt-1">
                            Disabled when Multiple Choice is ON
                          </div>
                        )}
                        {isTermConstrained && (
                          <div className="text-xs text-terracotta font-bold mt-1">
                            Fixed by generated options
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1">
                          <label className="text-xs font-bold text-coffee/70">
                            Locked?
                          </label>
                          <input
                            type="checkbox"
                            checked={config.locked}
                            disabled={isDisabled}
                            onChange={(e) =>
                              handleSettingChange(
                                setting.key as keyof typeof settings,
                                "locked",
                                e.target.checked,
                              )
                            }
                            className="w-5 h-5 accent-coffee cursor-pointer"
                          />
                        </div>

                        {config.locked ? (
                          <div
                            className={`flex flex-col items-end gap-1 ${setting.key === "term" ? "w-32" : "w-24"}`}
                          >
                            <label className="text-xs font-bold text-coffee/70">
                              Value
                            </label>
                            {setting.key === "term" ? (
                              <button
                                onClick={() =>
                                  !isDisabled &&
                                  handleSettingChange(
                                    setting.key as keyof typeof settings,
                                    "value",
                                    !config.value,
                                  )
                                }
                                disabled={isDisabled}
                                className={`px-2 py-1 text-xs font-bold border-2 border-coffee transition-colors w-full ${
                                  config.value
                                    ? "bg-powder text-coffee"
                                    : "bg-thistle text-coffee"
                                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                {config.value ? "Use Term" : "Use Definition"}
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  !isDisabled &&
                                  handleSettingChange(
                                    setting.key as keyof typeof settings,
                                    "value",
                                    !config.value,
                                  )
                                }
                                disabled={isDisabled}
                                className={`px-3 py-1 text-xs font-bold border-2 border-coffee transition-colors w-full ${
                                  config.value
                                    ? "bg-mint text-coffee"
                                    : "bg-terracotta text-vanilla"
                                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                {config.value ? "ON" : "OFF"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`flex flex-col items-end gap-1 ${setting.key === "term" ? "w-32" : "w-24"}`}
                          >
                            <label className="text-xs font-bold text-coffee/70">
                              Value
                            </label>
                            <div className="px-3 py-1 text-xs font-bold border-2 border-coffee bg-coffee/10 text-coffee w-full text-center">
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

            {error && (
              <div className="p-3 border-2 border-terracotta bg-terracotta/20 text-coffee font-bold text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                disabled={publishing}
                className="flex-1 border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 border-2 border-coffee bg-powder text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? "Publishing..." : "Publish Set"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
