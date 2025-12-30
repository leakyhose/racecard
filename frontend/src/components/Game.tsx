import { useEffect, useState, useRef } from "react";
import { socket } from "../socket";
import type { FlashcardEnd, Lobby } from "@shared/types";
import { MiniLeaderboard } from "./MiniLeaderboard";

const getChoiceFontSize = (text: string) => {
  if (text.length > 50) return "text-xs md:text-sm";
  if (text.length > 25) return "text-sm md:text-base";
  return "text-base md:text-xl";
};

interface GameProps {
  lobby: Lobby;
}

export function Game({ lobby }: GameProps) {
  const [countdown, setCountdown] = useState<number | string | null>(
    lobby?.status === "ongoing" ? "Waiting for current round to end..." : 3,
  );
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentChoices, setCurrentChoices] = useState<string[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerTime, setAnswerTime] = useState<number | null>(null);
  const [results, setResults] = useState<FlashcardEnd | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");
  const [lastResults, setLastResults] = useState<FlashcardEnd | null>(null);
  const isLeader = lobby?.leader === socket.id;
  const gameInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isResultsVisible, setIsResultsVisible] = useState(false);

  // Delay results visibility to prevent scroll jump
  useEffect(() => {
    if (showResults) {
      setIsResultsVisible(true);
    } else {
      const timer = setTimeout(() => setIsResultsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [showResults]);

  // Reset scroll on new question
  useEffect(() => {
    if (currentQuestion && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentQuestion]);

  // Manage input focus
  useEffect(() => {
    if (hasAnswered || showResults) {
      document.getElementById("chat-input")?.focus();
    } else if (!currentChoices) {
      setTimeout(() => {
        gameInputRef.current?.focus();
      }, 50);
    }
  }, [hasAnswered, showResults, currentChoices]);

  useEffect(() => {
    return () => {
      document.getElementById("chat-input")?.focus();
    };
  }, []);

  // Update countdown for hot joins
  useEffect(() => {
    if (
      lobby?.status === "ongoing" &&
      currentQuestion === null &&
      countdown === 3
    ) {
      setCountdown("Waiting for current round to end");
    }
  }, [lobby?.status, currentQuestion, countdown]);

  useEffect(() => {
    const handleCountdown = (seconds: number | string) => {
      setCountdown(seconds);
    };

    const handleNewFlashcard = (
      question: string,
      choices: string[] | null,
    ) => {
      setCountdown(null); // Clear countdown on question
      setCurrentQuestion(question);
      setAnswer("");
      setHasAnswered(false);
      setAnswerTime(null);
      setResults(null);
      setShowResults(false);
      setCurrentChoices(choices);
      setIsCorrect(null);
    };

    const handleEndFlashcard = (flashcardEnd: FlashcardEnd) => {
      setResults(flashcardEnd);
      setLastAnswer(flashcardEnd.Answer);
      setLastResults(flashcardEnd);
      setShowResults(true);
      setAnswer("");
    };

    const handleEndGuess = (timeTaken: number, correct: boolean) => {
      setHasAnswered(true);
      setAnswerTime(timeTaken);
      setIsCorrect(correct);
    };

    socket.on("startCountdown", handleCountdown);
    socket.on("newFlashcard", handleNewFlashcard);
    socket.on("endFlashcard", handleEndFlashcard);
    socket.on("endGuess", handleEndGuess);

    return () => {
      socket.off("startCountdown", handleCountdown);
      socket.off("newFlashcard", handleNewFlashcard);
      socket.off("endFlashcard", handleEndFlashcard);
      socket.off("endGuess", handleEndGuess);
    };
  }, []);

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !hasAnswered) {
      socket.emit("answer", answer.trim());
      setAnswer("");
    }
  };

  const handleChoiceClick = (choice: string) => {
    if (!hasAnswered) {
      socket.emit("answer", choice);
    }
  };

  if (countdown !== null) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        {typeof countdown === "number" ? (
          <div className="text-9xl font-bold text-coffee">{countdown}</div>
        ) : (
          <div className="text-3xl font-bold text-coffee tracking-wider text-center">
            {countdown}
          </div>
        )}
      </div>
    );
  }

  if (lobby?.status === "finished") {
    const leaderboardData = lobby.players.map((player) => ({
      player: player.name,
      value: player.score,
    }));

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-8">
        <h2 className="text-4xl font-bold text-coffee tracking-widest">
          Game Finished
        </h2>
        <MiniLeaderboard
          leaderboardName="Final Scores"
          playerList={leaderboardData}
          maxHeight="max-h-[50vh]"
        />
        <div>
          {isLeader ? (
            <button
              onClick={() => socket.emit("continueGame")}
              className="px-8 py-4 bg-terracotta text-vanilla text-xl font-bold hover:bg-coffee hover:text-vanilla transition-all tracking-wider border-3 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <div className="text-xl text-coffee/50 font-bold">
              Waiting for leader to continue...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full text-coffee/50 font-bold">
        Waiting for game to start...
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 flex flex-col overflow-hidden w-full"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      <div
        className={`w-full max-w-3xl mx-auto flex flex-col min-h-full p-4 justify-center ${currentChoices ? "pb-4" : "pb-20"}`}
      >
        <div
          className={`my-auto w-full flex flex-col ${currentChoices ? "gap-6" : "gap-14"}`}
        >
          <div
            className={`
                relative z-20 w-full transition-all duration-800 ease-in-out perspective-[1000px] shrink-0
            ${showResults ? "h-[200px]" : "h-[200px] sm:h-[300px] md:h-[450px]"}
        `}
          >
            <div
              className={`
                relative w-full h-full transition-transform duration-800 transform-3d rounded-[20px]
                ${showResults ? "transform-[rotateY(180deg)]" : "transform-[rotateY(0deg)]"}
            `}
            >
              <div className="absolute inset-0 backface-hidden bg-vanilla border-2 border-coffee rounded-[20px] flex items-center justify-center p-8 shadow-[inset_0_0_0_2px_var(--color-terracotta)] select-none">
                <div className="text-3xl font-bold text-coffee text-center wrap-break-word w-full max-w-full overflow-hidden">
                  {currentQuestion}
                </div>
              </div>

              <div className="absolute inset-0 backface-hidden transform-[rotateY(180deg)] bg-vanilla border-3 border-coffee rounded-[20px] flex flex-col items-center justify-center p-8 shadow-[inset_0_0_0_2px_var(--color-powder)] select-none">
                <div className="text-sm text-coffee/60 mb-2 font-bold uppercase tracking-widest">
                  Correct Answer
                </div>
                <div className="text-3xl font-bold text-coffee text-center wrap-break-word w-full max-w-full overflow-hidden">
                  {results?.Answer || lastAnswer}
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-1 grid-rows-1 w-full">
            <div
              className={`
                    col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out flex flex-col
                ${showResults ? "opacity-0 pointer-events-none" : "opacity-100 z-10"}
            `}
            >
              <div className="w-full max-w-2xl mx-auto p-6 relative">
                <div
                  className={`${hasAnswered ? "opacity-0 pointer-events-none" : ""}`}
                >
                  {currentChoices ? (
                    <div className="grid grid-cols-2 gap-6 auto-rows-fr min-h-46">
                      {Array.from(new Set(currentChoices)).map(
                        (choice, index) => (
                          <button
                            key={index}
                            onClick={() => handleChoiceClick(choice)}
                            className="group relative w-full h-full rounded-lg bg-coffee border-none p-0 cursor-pointer outline-none select-none"
                          >
                            <span className="w-full h-full rounded-lg border-[0.2rem] border-coffee p-4 text-center -translate-y-0.5 transition-transform duration-100 ease-out group-hover:-translate-y-1 group-active:translate-y-0 flex flex-col justify-center min-h-20 bg-vanilla text-coffee font-bold">
                              <span
                                className={`w-full line-clamp-2 wrap-break-word ${getChoiceFontSize(choice)}`}
                              >
                                {choice}
                              </span>
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmitAnswer}
                      className="relative group rounded-xl bg-coffee"
                    >
                      <input
                        ref={gameInputRef}
                        type="text"
                        autoComplete="off"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Answer here..."
                        className="w-full px-6 py-4 text-2xl bg-vanilla border-2 border-coffee rounded-xl text-coffee placeholder:text-coffee/30 -translate-y-0.5 transition-transform duration-100 ease-out hover:-translate-y-1 focus:-translate-y-1 font-bold outline-none focus:shadow-[inset_0_0_0_1px_var(--color-terracotta)] text-center"
                        autoFocus
                        disabled={showResults}
                        onPaste={(e) => e.preventDefault()}
                        onCopy={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                      />
                    </form>
                  )}
                </div>

                {hasAnswered && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {isCorrect === true ? (
                        <div>
                          <div className="text-4xl mb-2 text-coffee">✓</div>
                          <div className="text-xl font-bold text-coffee tracking-widest">
                            Correct
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-4xl mb-2 text-terracotta">✗</div>
                          <div className="text-xl font-bold text-terracotta tracking-widest">
                            Incorrect
                          </div>
                        </div>
                      )}
                      {answerTime !== null && (
                        <div className="text-lg text-coffee mt-2 font-bold">
                          {(answerTime / 1000).toFixed(3)}s
                        </div>
                      )}
                      <div className="text-coffee/50 mt-2 font-bold text-sm">
                        Please wait for current flashcard to end...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`
                    col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out absolute top-0 left-0
                    ${showResults ? "opacity-100 z-20" : "opacity-0 pointer-events-none"}
                    ${isResultsVisible ? "" : "hidden"}
                `}
            >
              <div className="w-full p-6">
                {(results || lastResults) && (
                  <div className="flex gap-6 justify-center flex-wrap w-full">
                    {(results || lastResults)?.fastestPlayers &&
                    (results || lastResults)!.fastestPlayers.length > 0 ? (
                      <>
                        <MiniLeaderboard
                          leaderboardName="Fastest Answers"
                          playerList={(results ||
                            lastResults)!.fastestPlayers.map((player) => ({
                            player: player.player,
                            value: `${(Number(player.time) / 1000).toFixed(3)}s`,
                          }))}
                        />
                        {(results || lastResults)!.wrongAnswers.length > 0 && (
                          <MiniLeaderboard
                            leaderboardName="Wrong Answers"
                            valueDisplay="under"
                            playerList={(results ||
                              lastResults)!.wrongAnswers.map((player) => ({
                              player: player.player,
                              value: player.answer,
                            }))}
                          />
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center w-full gap-6">
                        {(results || lastResults)?.wrongAnswers &&
                        (results || lastResults)!.wrongAnswers.length > 0 ? (
                          <MiniLeaderboard
                            leaderboardName="Wrong Answers"
                            valueDisplay="under"
                            playerList={(results ||
                              lastResults)!.wrongAnswers.map((player) => ({
                              player: player.player,
                              value: player.answer,
                            }))}
                          />
                        ) : (
                          <div className="text-center p-6">
                            <div className="text-4xl text-coffee/50 mb-2">
                              ✗
                            </div>
                            <div className="text-xl font-bold text-coffee tracking-widest">
                              No Correct Answers
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
