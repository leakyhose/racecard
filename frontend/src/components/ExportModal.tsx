import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  setName: string;
}

interface FlashcardDBRow {
  id: string;
  term: string;
  definition: string;
  trick_terms: string[] | null;
  trick_definitions: string[] | null;
  order_index: number;
}

type ExportMode = "standard" | "term-distractors" | "definition-distractors";

export function ExportModal({
  isOpen,
  onClose,
  setId,
  setName,
}: ExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [exportText, setExportText] = useState("");
  const [mode, setMode] = useState<ExportMode>("standard");
  const [hasTermDistractors, setHasTermDistractors] = useState(false);
  const [hasDefDistractors, setHasDefDistractors] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const mouseDownOnBackdrop = useRef(false);

  const fetchAndGenerate = useCallback(async () => {
    setLoading(true);
    try {
      let allData: FlashcardDBRow[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("flashcards")
          .select("*")
          .eq("set_id", setId)
          .order("order_index", { ascending: true })
          .order("id", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

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

      if (allData.length === 0) return;

      const hasTerms = allData.some(
        (c) => c.trick_terms && c.trick_terms.length > 0,
      );
      const hasDefs = allData.some(
        (c) => c.trick_definitions && c.trick_definitions.length > 0,
      );

      setHasTermDistractors(hasTerms);
      setHasDefDistractors(hasDefs);

      let text = "";

      allData.forEach((card) => {
        const term = (card.term || "").replace(/[\t\n|]/g, " ").trim();
        const def = (card.definition || "").replace(/[\t\n|]/g, " ").trim();

        if (mode === "standard") {
          text += `${term}|${def}\n`;
        } else if (mode === "term-distractors") {
          const distractors = card.trick_terms || [];
          const uniqueDistractors = [...new Set(distractors as string[])]
            .map((d) => d.replace(/[\t\n|]/g, " ").trim())
            .filter((d) => d !== term && d !== "");

          text += `${def}|${term}`;
          if (uniqueDistractors.length > 0) {
            text += `|${uniqueDistractors.join("|")}`;
          }
          text += "\n";
        } else if (mode === "definition-distractors") {
          const distractors = card.trick_definitions || [];
          const uniqueDistractors = [...new Set(distractors as string[])]
            .map((d) => d.replace(/[\t\n|]/g, " ").trim())
            .filter((d) => d !== def && d !== "");

          text += `${term}|${def}`;
          if (uniqueDistractors.length > 0) {
            text += `|${uniqueDistractors.join("|")}`;
          }
          text += "\n";
        }
      });

      setExportText(text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [setId, mode]);

  useEffect(() => {
    if (isOpen) {
      fetchAndGenerate();
    }
  }, [isOpen, fetchAndGenerate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
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
        className="bg-vanilla border-3 border-coffee p-8 max-w-5xl w-full mx-4 shadow-[8px_8px_0px_0px_#644536] flex flex-col h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-2xl tracking-widest border-b-3 border-coffee pb-4 mb-4">
          Export: {setName}
        </h2>

        <div className="flex gap-6 mb-4 border-b-2 border-coffee/20 pb-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setMode("standard")}
            className={`font-bold text-sm transition-colors whitespace-nowrap ${
              mode === "standard"
                ? "text-coffee underline underline-offset-4"
                : "text-coffee/50 hover:text-coffee"
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setMode("term-distractors")}
            disabled={!hasTermDistractors}
            className={`font-bold text-sm transition-colors whitespace-nowrap ${
              mode === "term-distractors"
                ? "text-coffee underline underline-offset-4"
                : "text-coffee/50 hover:text-coffee"
            } ${!hasTermDistractors ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            With Term Distractors
          </button>
          <button
            onClick={() => setMode("definition-distractors")}
            disabled={!hasDefDistractors}
            className={`font-bold text-sm transition-colors whitespace-nowrap ${
              mode === "definition-distractors"
                ? "text-coffee underline underline-offset-4"
                : "text-coffee/50 hover:text-coffee"
            } ${!hasDefDistractors ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            With Def Distractors
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-coffee border-t-transparent border-b-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-2 text-sm text-coffee/70 font-bold shrink-0">
                Seperated using |
              </div>
              <textarea
                readOnly
                value={exportText}
                className="flex-1 w-full p-4 font-mono text-sm border-2 border-coffee bg-light-vanilla/50 resize-none focus:outline-none mb-4"
                onClick={(e) => e.currentTarget.select()}
              />
              <div className="flex justify-end gap-4 shrink-0 border-t-3 border-coffee pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 font-bold border-2 border-coffee bg-vanilla text-coffee hover:bg-coffee hover:text-vanilla transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleCopy}
                  className="px-6 py-3 font-bold border-2 border-coffee bg-mint text-coffee hover:bg-coffee hover:text-vanilla transition-colors"
                >
                  {copySuccess ? "Copied!" : "Copy to Clipboard"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
