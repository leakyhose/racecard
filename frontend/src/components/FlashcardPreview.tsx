import type { Flashcard } from "@shared/types";

interface FlashcardPreviewProps {
  flashcards: Flashcard[];
  answerByTerm?: boolean;
  multipleChoice?: boolean;
}

export function FlashcardPreview({
  flashcards,
  answerByTerm,
  multipleChoice,
}: FlashcardPreviewProps) {
  if (!flashcards.length) {
    return (
      <div className="flex items-center h-full justify-center text-sm italic text-center">
        No flashcards uploaded yet.
      </div>
    );
  }

  const showMCPreview = multipleChoice && flashcards[0]?.isGenerated;

  return (
    <div className="space-y-6">
      {flashcards.map((flashcard) => (
        <div
          key={flashcard.id}
          className="group relative border-2 border-coffee p-8 flex items-stretch transition-transform duration-50 ease-out hover:scale-[1.005] bg-vanilla shadow-[4px_4px_0px_0px_#644536]"
        >
          {showMCPreview ? (
            <div className="w-full space-y-3">
              <div className="font-bold text-coffee text-center border-b-2 border-coffee pb-2">
                {answerByTerm ? flashcard.answer : flashcard.question}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Show correct answer and trick options */}
                {answerByTerm ? (
                  <>
                    <div className="p-2 border border-coffee bg-mint/30 text-sm text-center">
                      ✓ {flashcard.question}
                    </div>
                    {flashcard.trickTerms?.map((trick, idx) => (
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
                    {flashcard.trickDefinitions?.map((trick, idx) => (
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
              <div className="whitespace-pre-wrap wrap-break-word p-1 rounded-none text-center font-bold text-coffee">
                {answerByTerm ? flashcard.answer : flashcard.question}
              </div>
              <div className="whitespace-pre-wrap wrap-break-word p-1 rounded-none text-center font-bold text-coffee">
                {answerByTerm ? flashcard.question : flashcard.answer}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
