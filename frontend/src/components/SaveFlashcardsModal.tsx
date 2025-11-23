import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import type { Flashcard } from "@shared/types";

interface SaveFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
}

export function SaveFlashcardsModal({
  isOpen,
  onClose,
  flashcards,
}: SaveFlashcardsModalProps) {
  const { user } = useAuth();
  const [setName, setSetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!setName.trim()) {
      setError("Please enter a name for this flashcard set");
      return;
    }

    if (!user) {
      setError("You must be signed in to save flashcards");
      return;
    }

    if (flashcards.length === 0) {
      setError("No flashcards to save");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Insert the flashcard set
      const { data: setData, error: setError } = await supabase
        .from("flashcard_sets")
        .insert({
          user_id: user.id,
          name: setName.trim(),
        })
        .select()
        .single();

      if (setError) throw setError;

      // Insert all flashcards
      const flashcardsToInsert = flashcards.map((card) => ({
        set_id: setData.id,
        term: card.question,
        definition: card.answer,
      }));

      const { error: cardsError } = await supabase
        .from("flashcards")
        .insert(flashcardsToInsert);

      if (cardsError) throw cardsError;

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSetName("");
      }, 1500);
    } catch {
      setError("Failed to save flashcards. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      setError("");
      setSuccess(false);
      setSetName("");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-coffee/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-vanilla border-3 border-coffee p-8 max-w-md w-full mx-4 shadow-[8px_8px_0px_0px_#644536]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl uppercase tracking-widest border-b-3 border-coffee pb-4 mb-6">
          Save Flashcard Set
        </h2>

        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✓</div>
            <div className="text-xl uppercase text-powder">
              Flashcards Saved!
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm uppercase tracking-wide font-bold mb-2">
                Set Name
              </label>
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="My Flashcard Set"
                maxLength={100}
                className="w-full border-2 border-coffee bg-transparent p-3 placeholder-coffee/50 focus:outline-none focus:bg-white/20 uppercase"
                autoFocus
                disabled={saving}
              />
              <div className="text-xs mt-2 text-coffee/70">
                {flashcards.length} flashcard
                {flashcards.length !== 1 ? "s" : ""} will be saved
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 border-2 border-terracotta bg-terracotta/10 text-terracotta text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 border-2 border-coffee bg-powder text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleClose}
                disabled={saving}
                className="flex-1 border-2 border-coffee bg-vanilla text-coffee px-4 py-3 hover:bg-coffee hover:text-vanilla transition-colors uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
