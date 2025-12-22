import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import type { Settings } from "@shared/types";

interface PublishFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  initialName: string;
  hasGenerated: boolean;
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
  currentSettings,
}: PublishFlashcardsModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
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
      setError("");
      setSuccess(false);
      setSettings({
        shuffle: { locked: true, value: currentSettings.shuffle },
        fuzzy: { locked: true, value: currentSettings.fuzzyTolerance },
        term: { locked: true, value: currentSettings.answerByTerm },
        mc: {
          locked: true,
          value: hasGenerated ? currentSettings.multipleChoice : false,
        },
      });
    }
  }, [isOpen, initialName, currentSettings, hasGenerated]);

  const handleSettingChange = (
    key: keyof typeof settings,
    field: "locked" | "value",
    value: boolean,
  ) => {
    setSettings((prev) => {
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
      // 1. Create public set
      const { data: publicSet, error: createError } = await supabase
        .from("public_flashcard_sets")
        .insert({
          user_id: user.id,
          username: user.user_metadata?.username || "Unknown",
          name: name.trim(),
          description: description.trim(),
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

      // 2. Fetch original flashcards
      const { data: originalCards, error: fetchError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("set_id", setId);

      if (fetchError) throw fetchError;

      if (!originalCards || originalCards.length === 0) {
        throw new Error("No flashcards found to publish");
      }

      // 3. Insert copies linked to public set
      const cardsToInsert = originalCards.map((card) => ({
        public_set_id: publicSet.id,
        term: card.term,
        definition: card.definition,
        trick_terms: card.trick_terms || [],
        trick_definitions: card.trick_definitions || [],
        is_generated: card.is_generated || false,
      }));

      const { error: insertError } = await supabase
        .from("flashcards")
        .insert(cardsToInsert);

      if (insertError) throw insertError;

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
        className="bg-vanilla border-3 border-coffee p-8 max-w-2xl w-full mx-4 shadow-[8px_8px_0px_0px_#644536] max-h-[90vh] flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4 mb-6">
          Publish Flashcards
        </h2>

        {success ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-coffee font-bold text-xl">
              Published!
            </div>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border-2 border-coffee bg-white/50 text-coffee focus:outline-none focus:bg-white font-bold h-24 resize-none"
                placeholder="Describe your set..."
                maxLength={200}
              />
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
                  const isFuzzyDisabled =
                    setting.key === "fuzzy" && isMcLockedOn;
                  const isDisabled = setting.disabled || isFuzzyDisabled;

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
                className="flex-1 border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold"
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
