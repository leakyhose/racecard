import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { FlashcardEnd } from "@shared/types";
import { MiniLeaderboard } from "./MiniLeaderboard";
import { useParams } from "react-router-dom";
import { useLobbyData } from "../hooks/useLobbyData";

export function Game() {
  const { code } = useParams();
  const lobby = useLobbyData(code);
  const [countdown, setCountdown] = useState<number | string | null>(
    lobby?.status === "ongoing" ? "Waiting for current round to end..." : 3
  );
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentChoices, setCurrentChoices] = useState<string[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerTime, setAnswerTime] = useState<number | null>(null);
  const [results, setResults] = useState<FlashcardEnd | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const isLeader = lobby?.leader === socket.id;

  // Update countdown message when lobby status changes to ongoing (for hot joins)
  useEffect(() => {
    if (lobby?.status === "ongoing" && currentQuestion === null && countdown === 3) {
      setCountdown("Waiting for current round to end");
    }
  }, [lobby?.status, currentQuestion, countdown]);

  useEffect(() => {
    const handleCountdown = (seconds: number | string) => {
      setCountdown(seconds);
    };

    const handleNewFlashcard = (question: string, choices: string[]| null) => {
      setCountdown(null); // Clear countdown when question arrives
      setCurrentQuestion(question);
      setAnswer("");
      setHasAnswered(false);
      setAnswerTime(null);
      setResults(null);
      setShowResults(false);
      setCurrentChoices(choices);
      setIsCorrect(null);
    };

    const handleEndGuess = (time: number, isCorrect: boolean) => {
      setHasAnswered(true);
      setAnswerTime(time);
      setIsCorrect(isCorrect);
    };

    const handleEndFlashcard = (flashcardEnd: FlashcardEnd) => {
      setResults(flashcardEnd);
      setShowResults(true);
    };

    socket.on("startCountdown", handleCountdown);
    socket.on("newFlashcard", handleNewFlashcard);
    socket.on("endGuess", handleEndGuess);
    socket.on("endFlashcard", handleEndFlashcard);

    return () => {
      socket.off("startCountdown", handleCountdown);
      socket.off("newFlashcard", handleNewFlashcard);
      socket.off("endGuess", handleEndGuess);
      socket.off("endFlashcard", handleEndFlashcard);
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
          <div className="text-3xl font-bold text-coffee uppercase tracking-wider text-center">
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
        <h2 className="text-4xl font-bold text-coffee tracking-widest uppercase">
          Game Finished
        </h2>
        <MiniLeaderboard
          leaderboardName="Final Scores"
          playerList={leaderboardData}
        />
        <div>
          {isLeader ? (
            <button
              onClick={() => socket.emit("continueGame")}
              className="px-8 py-4 bg-terracotta text-vanilla text-xl font-bold hover:bg-coffee hover:text-vanilla transition-all uppercase tracking-wider border-3 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <div className="text-xl text-coffee/50 font-bold uppercase">
              Waiting for leader to continue...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full text-coffee/50 font-bold uppercase">
        Waiting for game to start...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {!showResults && (
        <>
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-coffee/10 [&::-webkit-scrollbar-thumb]:bg-coffee [&::-webkit-scrollbar-thumb]:rounded-none">
            <div className="text-6xl font-bold text-center max-w-4xl text-coffee leading-tight drop-shadow-sm wrap-break-word">
              {currentQuestion}
            </div>
          </div>

          {!hasAnswered && (
            <div className="shrink-0 p-8">
              {currentChoices ? (
                <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {currentChoices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoiceClick(choice)}
                      className="px-6 py-4 text-xl bg-vanilla border-3 border-coffee text-coffee hover:bg-coffee hover:text-vanilla transition-all text-center font-bold shadow-[4px_4px_0px_0px_#644536] hover:shadow-[2px_2px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSubmitAnswer}>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="TYPE YOUR ANSWER..."
                    className="w-full px-6 py-4 text-2xl bg-vanilla border-3 border-coffee text-coffee placeholder-coffee/30 focus:outline-none focus:bg-white/50 transition-colors text-center font-bold"
                    autoFocus
                  />
                </form>
              )}
            </div>
          )}

          {hasAnswered && (
            <div className="shrink-0 p-8 flex items-center justify-center">
              <div className="text-center">
                
                {isCorrect == true ? (
                  <div>
                    <div className="text-6xl mb-4 text-coffee drop-shadow-[0_4px_16px_rgba(184,230,184,1)]">✓</div>
                    <div className="text-2xl font-bold text-coffee uppercase tracking-widest drop-shadow-[0_4px_16px_rgba(184,230,184,1)]">
                      Correct
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-6xl mb-4 text-terracotta">✗</div>
                    <div className="text-2xl font-bold text-terracotta uppercase tracking-widest drop-shadow-sm">
                      Incorrect
                    </div>
                  </div>
                )}

                
                {answerTime !== null && (
                  <div className="text-xl text-coffee mt-2 font-bold">
                    {(answerTime / 1000).toFixed(3)}s
                  </div>
                )}
                <div className="text-coffee/50 mt-2 font-bold uppercase">
                  Waiting for round to end...
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showResults && results && (
        <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-coffee/10 [&::-webkit-scrollbar-thumb]:bg-coffee [&::-webkit-scrollbar-thumb]:rounded-none">
          <div className="flex flex-col gap-8 max-w-6xl mx-auto">
            {/* Question */}
            <div className="text-center">
              <div className="text-5xl font-bold text-coffee leading-tight wrap-break-word mb-8">
                {currentQuestion}
              </div>
            </div>

            {/* Correct Answer */}
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4 text-coffee uppercase tracking-wider">
                Correct Answer
              </h3>
              <div className="text-3xl font-bold text-coffee p-4 bg-vanilla border-3 border-coffee shadow-[4px_4px_0px_0px_#644536] wrap-break-word max-w-3xl mx-auto">
                {results.Answer}
              </div>
            </div>

            {/* Leaderboards */}
            <div className="flex gap-6 justify-center flex-wrap w-full">
              {results.fastestPlayers.length > 0 ? (
                <>
                  <MiniLeaderboard
                    leaderboardName="Fastest Answers"
                    playerList={results.fastestPlayers.map((player) => ({
                      player: player.player,
                      value: `${(Number(player.time) / 1000).toFixed(3)}s`,
                    }))}
                  />

                  {results.wrongAnswers.length > 0 && (
                    <MiniLeaderboard
                      leaderboardName="Wrong Answers"
                      playerList={results.wrongAnswers.map((player) => ({
                        player: player.player,
                        value: player.answer,
                      }))}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center w-full gap-6">
                  {results.wrongAnswers.length > 0 ? (
                    <>
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-6xl text-coffee/50">✗</div>
                        <div className="text-3xl font-bold text-coffee uppercase tracking-widest">
                          No Correct Answers
                        </div>
                      </div>
                      <MiniLeaderboard
                        leaderboardName="Wrong Answers"
                        playerList={results.wrongAnswers.map((player) => ({
                          player: player.player,
                          value: player.answer,
                        }))}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
                      <div className="text-6xl text-coffee/50">✗</div>
                      <div className="text-3xl font-bold text-coffee uppercase tracking-widest">
                        No Correct Answers
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
