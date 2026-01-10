import { useState, useEffect } from "react";
import type { Flashcard } from "@shared/types";
import { ArrowButton } from "./ArrowButton";
import { SaveButton } from "./SaveButton";
import { getRelativeTime } from "../utils/flashcardUtils";
import type { LoadedPublicSet } from "../utils/loadPublicSet";

interface FlashcardStudyProps {
  flashcards: Flashcard[];
  flashcardName?: string;
  flashcardDescription?: string;
  answerByTerm?: boolean;
  multipleChoice?: boolean;
  isSaved?: boolean;
  onSave?: () => void;
  saveShake?: boolean;
  publicSetInfo?: LoadedPublicSet | null;
}

export function FlashcardStudy({
  flashcards,
  flashcardName = "Unnamed Set",
  flashcardDescription,
  answerByTerm,
  multipleChoice,
  isSaved = false,
  onSave,
  saveShake,
  publicSetInfo,
}: FlashcardStudyProps) {
  const [currentIndex, setCurrentIndex] = useState(
    publicSetInfo || flashcardDescription ? -1 : 0,
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (publicSetInfo || flashcardDescription) {
      setCurrentIndex(-1);
    } else {
      setCurrentIndex(0);
    }
    // Reset on new set
    setIsFlipped(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicSetInfo?.id, flashcardDescription]);

  if (!flashcards.length) {
    return (
      <div className="flex items-center h-full justify-center text-sm italic text-center">
        No flashcards uploaded yet.
      </div>
    );
  }

  // Ensure currentIndex is within bounds
  const safeIndex = Math.min(currentIndex, flashcards.length - 1);
  const currentCard = safeIndex >= 0 ? flashcards[safeIndex] : null;
  const showMC =
    multipleChoice &&
    (answerByTerm
      ? currentCard?.termGenerated
      : currentCard?.definitionGenerated);

  const allowView = publicSetInfo ? publicSetInfo.allow_view !== false : true;
  const allowSave = publicSetInfo ? publicSetInfo.allow_save !== false : true;

  const handlePrevious = () => {
    if (!allowView) return;
    setIsSwitching(true);
    setCurrentIndex((prev) => {
      if (publicSetInfo || flashcardDescription) {
        return prev === -1 ? flashcards.length - 1 : prev - 1;
      }
      return prev === 0 ? flashcards.length - 1 : prev - 1;
    });
    setIsFlipped(false);
    setTimeout(() => setIsSwitching(false), 50);
  };

  const handleNext = () => {
    if (!allowView) return;
    setIsSwitching(true);
    setCurrentIndex((prev) => {
      if (publicSetInfo || flashcardDescription) {
        return prev === flashcards.length - 1 ? -1 : prev + 1;
      }
      return prev === flashcards.length - 1 ? 0 : prev + 1;
    });
    setIsFlipped(false);
    setTimeout(() => setIsSwitching(false), 50);
  };

  const handleFlip = () => {
    if (currentIndex === -1) return; // Don't flip cover card
    setIsFlipped(!isFlipped);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!allowView) return;
    setIsSwitching(true);
    setCurrentIndex(parseInt(e.target.value));
    setIsFlipped(false);
    setTimeout(() => setIsSwitching(false), 50);
  };

  const question = currentCard
    ? answerByTerm
      ? currentCard.answer
      : currentCard.question
    : "";
  const answer = currentCard
    ? answerByTerm
      ? currentCard.question
      : currentCard.answer
    : "";

  return (
    <div className="flex items-center justify-center w-full p-8 relative">
      <div className="flex flex-col items-center justify-center w-full max-w-5xl gap-6">
        <div className="flex flex-col-reverse items-center justify-center w-full gap-6">
          <div className="peer flex items-center justify-center w-full gap-4">
            <ArrowButton
              onClick={handlePrevious}
              direction="right"
              disabled={!allowView}
              className={!allowView ? "cursor-not-allowed opacity-50" : ""}
            />
            <div
              className="peer group relative w-full max-w-3xl min-h-[60vh] flex flex-col perspective-[1000px] z-40"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div
                onClick={handleFlip}
              className={`
              grid grid-cols-1 w-full flex-1 transition-transform transform-3d cursor-pointer
              ${isSwitching ? "duration-0" : "duration-1000"}
              ${isFlipped ? "transform-[rotateY(180deg)]" : ""}
            `}
            >
              {currentIndex === -1 && (publicSetInfo || flashcardDescription) ? (
                <div className="col-start-1 row-start-1 backface-hidden relative w-full h-full">
                  <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[20px] bg-vanilla flex items-end justify-center pb-1 -z-10">
                    <div className="text-center text-coffee/80 text-[0.69rem] font-bold tracking-wider flex gap-2 px-4">
                      {publicSetInfo?.username && (
                        <span>Created by {publicSetInfo.username}</span>
                      )}
                      {publicSetInfo?.username && <span>•</span>}
                      {(publicSetInfo?.updatedAt || publicSetInfo?.createdAt) && (
                        <span>
                          Updated{" "}
                          {getRelativeTime(
                            publicSetInfo.updatedAt ||
                              publicSetInfo.createdAt ||
                              "",
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-full transition-transform duration-400 group-hover:-translate-y-[23px]">
                    <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[20px] shadow-[inset_0_0_0_3px_var(--color-terracotta)] flex flex-col items-center justify-center gap-6 select-none">
                      <div className="w-full flex flex-col items-center justify-center">
                        {publicSetInfo?.user_id ===
                          "d0c1b157-eb1f-42a9-bf67-c6384b7ca278" && (
                          <div className="flex flex-col items-center mb-2 gap-1">
                            <div className="text-xl">⭐</div>
                            <div className="text-xs font-bold text-coffee/80 uppercase tracking-wider">
                              Featured Set
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 justify-center max-w-full">
                          <div className="text-3xl font-bold text-coffee whitespace-pre-wrap wrap-break-word hyphens-auto text-center">
                            {publicSetInfo?.name || flashcardName}
                          </div>
                          {onSave && allowSave && (
                            <SaveButton
                              isSaved={isSaved}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSave();
                              }}
                              className={`shrink-0 ${saveShake ? "animate-shake" : ""}`}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-center w-full px-8">
                        <div className="text-lg text-center font-bold text-coffee/80 whitespace-pre-wrap wrap-break-word hyphens-auto w-full max-w-full overflow-hidden">
                          {publicSetInfo?.description ||
                            flashcardDescription || (
                              <span className="opacity-50">
                                No description provided
                              </span>
                            )}
                        </div>
                      </div>

                      <div className="w-full flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-coffee/60 font-bold">
                        <span>{flashcards.length} flashcards</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="col-start-1 row-start-1 backface-hidden relative w-full h-full">
                    <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[20px] bg-vanilla flex items-end justify-center pb-1 -z-10">
                      <div className="text-center text-coffee/80 text-[0.69rem] font-bold tracking-[0.2em]">
                        click for answer
                      </div>
                    </div>

                    <div className="w-full h-full transition-transform duration-400 group-hover:-translate-y-[23px]">
                      <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[20px] shadow-[inset_0_0_0_3px_var(--color-terracotta)] flex flex-col items-center justify-center gap-4 select-none">
                        <div className="text-center w-full">
                          <div className="text-sm text-coffee/60 mb-4 font-bold">
                            {safeIndex + 1} of {flashcards.length}
                          </div>
                          <div className="text-2xl font-bold text-coffee whitespace-pre-wrap wrap-break-word hyphens-auto w-full max-w-full overflow-hidden">
                            {question}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-start-1 row-start-1 backface-hidden transform-[rotateY(180deg)] relative w-full h-full">
                    <div className="border-2 border-coffee absolute inset-0 rounded-[20px] bg-vanilla flex items-end justify-center pb-1 -z-10">
                      <div className="text-center text-coffee/80 text-[0.69rem] font-bold tracking-[0.2em]">
                        click for question
                      </div>
                    </div>

                    <div className="w-full h-full transition-transform duration-400 group-hover:-translate-y-[23px]">
                      <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[20px] shadow-[inset_0_0_0_3px_var(--color-powder)] flex flex-col items-center justify-center gap-4 select-none">
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
                              {Array.from(
                                new Set(
                                  answerByTerm
                                    ? currentCard?.trickTerms
                                    : currentCard?.trickDefinitions,
                                ),
                              )
                                .filter((trick) => trick !== answer)
                                .map((trick, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 border border-coffee bg-vanilla/50 text-center"
                                  >
                                    {trick}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="text-xl font-bold text-coffee text-center whitespace-pre-wrap warp-break-words hyphens-auto w-full max-w-full overflow-hidden">
                              {answer}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
            <ArrowButton
              onClick={handleNext}
              direction="left"
              disabled={!allowView}
              className={!allowView ? "cursor-not-allowed opacity-50" : ""}
            />
          </div>
          <div
            className={`transition-all duration-400 flex items-center gap-3 ${currentIndex === -1 ? "opacity-0 pointer-events-none" : "opacity-100"} ${isHovered ? "-translate-y-[23px]" : ""}`}
          >
            <div className="font-bold text-xl">{flashcardName}</div>
            {onSave && allowSave && (
              <SaveButton
                isSaved={isSaved}
                onClick={onSave}
                className={saveShake ? "animate-shake" : ""}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 w-full max-w-3xl relative z-40 mt-6">
          {allowView ? (
            <input
              type="range"
              min={publicSetInfo ? -1 : 0}
              max={flashcards.length - 1}
              value={currentIndex}
              onChange={handleSliderChange}
              className="flex-1 h-0 bg-vanilla border rounded-xl border-coffee appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-coffee [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-coffee [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          ) : (
            <div className="w-full text-center text-sm font-bold text-coffee/60">
              Viewing all flashcards disabled by publisher.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
