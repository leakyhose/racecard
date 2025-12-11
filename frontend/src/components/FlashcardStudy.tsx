import { useState } from "react";
import type { Flashcard } from "@shared/types";
import { ArrowButton } from "./ArrowButton";

interface FlashcardStudyProps {
  flashcards: Flashcard[];
  answerByTerm?: boolean;
  multipleChoice?: boolean;
}

export function FlashcardStudy({
  flashcards,
  answerByTerm,
  multipleChoice,
}: FlashcardStudyProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  
  if (!flashcards.length) {
    return (
      <div className="flex items-center h-full justify-center text-sm italic text-center">
        No flashcards uploaded yet.
      </div>
    );
  }

  // Ensure currentIndex is within bounds
  const safeIndex = Math.min(currentIndex, flashcards.length - 1);
  const currentCard = flashcards[safeIndex];
  const showMC = multipleChoice && currentCard?.isGenerated;

  const handlePrevious = () => {
    setIsSwitching(true);
    setCurrentIndex((prev) => (prev === 0 ? flashcards.length - 1 : prev - 1));
    setIsFlipped(false);
    setTimeout(() => setIsSwitching(false), 50);
  };

  const handleNext = () => {
    setIsSwitching(true);
    setCurrentIndex((prev) => (prev === flashcards.length - 1 ? 0 : prev + 1));
    setIsFlipped(false);
    setTimeout(() => setIsSwitching(false), 50);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSwitching(true);
    setCurrentIndex(parseInt(e.target.value));
    setIsFlipped(false);
    setTimeout(() => setIsSwitching(false), 50);
  };

  const question = answerByTerm ? currentCard.answer : currentCard.question;
  const answer = answerByTerm ? currentCard.question : currentCard.answer;

  return (
    <div className="flex items-center justify-center w-full p-8">
      <div className="flex flex-col items-center justify-center w-full max-w-3xl gap-6">
        {/* Flashcard */}
        <div className="group relative w-full max-w-3xl min-h-[60vh] flex flex-col perspective-[1000px]">
          <div
            onClick={handleFlip}
            className={`
              grid grid-cols-1 w-full flex-1 transition-transform transform-3d cursor-pointer
              ${isSwitching ? "duration-0" : "duration-1000"}
              ${isFlipped ? "transform-[rotateY(180deg)]" : ""}
            `}
          >
            {/* Front Face */}
            <div className="col-start-1 row-start-1 backface-hidden relative w-full h-full">
              {/* Under Card (Front) */}
              <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[20px] bg-vanilla flex items-end justify-center pb-1 -z-10">
                <div className="text-center text-coffee/80 text-[0.69rem] font-bold tracking-[0.2em]">
                  click for answer
                </div>
              </div>

              {/* Top Card (Front) */}
              <div className="w-full h-full transition-transform duration-400 group-hover:-translate-y-[23px]">
                <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[20px] shadow-[inset_0_0_0_1px_var(--color-powder)] flex flex-col items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-coffee/60 mb-4 font-bold">
                      {safeIndex + 1} of {flashcards.length}
                    </div>
                    <div className="text-2xl font-bold text-coffee whitespace-pre-wrap wrap-break-word">
                      {question}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Face */}
            <div className="col-start-1 row-start-1 backface-hidden transform-[rotateY(180deg)] relative w-full h-full">
              {/* Under Card (Back) */}
              <div className="shadow-[0_0_10px_rgba(0,0,0,0.212)] border-2 border-coffee absolute inset-0 rounded-[20px] bg-vanilla flex items-end justify-center pb-1 -z-10">
                <div className="text-center text-coffee/80 text-[0.69rem] font-bold tracking-[0.2em]">
                  click for question
                </div>
              </div>

              {/* Top Card (Back) */}
              <div className="w-full h-full transition-transform duration-400 group-hover:-translate-y-[23px]">
                <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[20px] shadow-[inset_0_0_0_1px_var(--color-terracotta)] flex flex-col items-center justify-center gap-4">
                  <div className="w-full">
                    <div className="text-sm text-coffee/60 mb-4 font-bold text-center">
                      Answer
                    </div>
                    {showMC ? (
                      // Multiple choice view
                      <div className="space-y-2">
                        <div className="p-3 border-2 border-coffee bg-mint/30 text-center font-bold">
                          ✓ {answer}
                        </div>
                        {(answerByTerm
                          ? currentCard.trickDefinitions
                          : currentCard.trickTerms
                        )?.map((trick, idx) => (
                          <div
                            key={idx}
                            className="p-3 border border-coffee bg-vanilla/50 text-center"
                          >
                            {trick}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Simple answer view
                      <div className="text-xl font-bold text-coffee text-center whitespace-pre-wrap wrap-break-word">
                        {answer}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full">
          <ArrowButton
            onClick={handlePrevious}
            direction="right"
          />

          <input
            type="range"
            min="0"
            max={flashcards.length - 1}
            value={safeIndex}
            onChange={handleSliderChange}
            className="flex-1 h-0 bg-vanilla border rounded-xl border-coffee appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-coffee [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-coffee [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />

          <ArrowButton
            onClick={handleNext}
            direction="left"
          />
        </div>
      </div>
    </div>
  );
}
