import { useState, useEffect, useRef } from "react";
import type { Flashcard } from "@shared/types";

interface FlashcardPreviewProps {
  flashcards: Flashcard[];
  answerByTerm?: boolean;
  multipleChoice?: boolean;
}

const BATCH_SIZE = 20;

export function FlashcardPreview({
  flashcards,
  answerByTerm,
  multipleChoice,
}: FlashcardPreviewProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [flashcards]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          setVisibleCount((prev) => prev + BATCH_SIZE);
        }
      },
      { threshold: 0.1 },
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [visibleCount, flashcards.length]);

  if (!flashcards.length) {
    return (
      <div className="flex items-center h-full justify-center text-sm italic text-center">
        No flashcards uploaded yet.
      </div>
    );
  }

  const showMCPreview =
    multipleChoice &&
    (answerByTerm
      ? flashcards[0]?.termGenerated
      : flashcards[0]?.definitionGenerated);

  const visibleFlashcards = flashcards.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      {visibleFlashcards.map((flashcard, index) => (
        <div
          key={flashcard.id}
          className="group relative border-2 border-coffee p-8 flex items-stretch transition-transform duration-50 ease-out hover:scale-[1.005] bg-vanilla shadow-[4px_4px_0px_0px_#644536] select-text"
        >
          <div className="absolute top-2 left-2 text-xs text-coffee font-bold">
            {index + 1}
          </div>
          {showMCPreview ? (
            <div className="w-full space-y-3">
              <div className="font-bold text-coffee text-center border-b-2 border-coffee pb-2">
                {answerByTerm ? flashcard.answer : flashcard.question}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {answerByTerm ? (
                  <>
                    <div className="p-2 border border-coffee bg-mint/30 text-sm text-center">
                      ✓ {flashcard.question}
                    </div>
                    {Array.from(new Set(flashcard.trickTerms))
                      .filter((trick) => trick !== flashcard.question)
                      .map((trick, idx) => (
                        <div
                          key={idx}
                          className="p-2 border border-coffee bg-vanilla text-sm text-center"
                        >
                          {trick}
                        </div>
                      ))}
                  </>
                ) : (
                  <>
                    <div className="p-2 border border-coffee bg-mint/30 text-sm text-center">
                      ✓ {flashcard.answer}
                    </div>
                    {Array.from(new Set(flashcard.trickDefinitions))
                      .filter((trick) => trick !== flashcard.answer)
                      .map((trick, idx) => (
                        <div
                          key={idx}
                          className="p-2 border border-coffee bg-vanilla text-sm text-center"
                        >
                          {trick}
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 grow pr-0 ">
              <div className="whitespace-pre-wrap wrap-break-words hyphens-auto p-1 rounded-none text-center font-bold text-coffee">
                {answerByTerm ? flashcard.answer : flashcard.question}
              </div>
              <div className="whitespace-pre-wrap wrap-break-words hyphens-auto p-1 rounded-none text-center font-bold text-coffee">
                {answerByTerm ? flashcard.question : flashcard.answer}
              </div>
            </div>
          )}
        </div>
      ))}
      {visibleCount < flashcards.length && (
        <div ref={loaderRef} className="h-10 flex justify-center items-center">
          <div className="text-coffee/50 text-sm">Loading more...</div>
        </div>
      )}
    </div>
  );
}
