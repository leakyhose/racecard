interface FlashcardPreviewProps {
  flashcards: { id: string; question: string; answer: string }[]
  answerByTerm?: boolean;
}

export function FlashcardPreview({ flashcards, answerByTerm }: FlashcardPreviewProps) {
  if (!flashcards.length) {
    return <div className="flex items-center h-full justify-center text-sm italic text-center">No flashcards uploaded yet.</div>;
  }

  return (
    <div className="space-y-4">
      {flashcards.map((flashcard) => (
        <div
          key={flashcard.id}
          className="group relative border p-4 flex items-stretch transition-transform duration-50 ease-out hover:scale-[1.005]"
        >
          <div className="grid grid-cols-2 gap-4 grow pr-0 ">
            <div className="whitespace-pre-wrap wrap-break-word p-1 rounded text-center">
              {answerByTerm ? flashcard.answer :
              flashcard.question
              }
            </div>
            <div className="whitespace-pre-wrap wrap-break-word p-1 rounded text-center">
              {answerByTerm ? flashcard.question :
              flashcard.answer
              }
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
