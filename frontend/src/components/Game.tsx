import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { FlashcardEnd } from "@shared/types";
import { MiniLeaderboard } from "./MiniLeaderboard";
import { useParams } from "react-router-dom";
import { useLobbyData } from "../hooks/useLobbyData";

export function Game() {
  const { code } = useParams();
  const lobby = useLobbyData(code);
  const [countdown, setCountdown] = useState<number | string | null>(3);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [results, setResults] = useState<FlashcardEnd | null>(null);
  const [showResults, setShowResults] = useState(false);
  const isLeader = lobby?.leader === socket.id;

  useEffect(() => {
    const handleCountdown = (seconds: number | string) => {
      console.log(seconds);
      setCountdown(seconds);
    };

    const handleNewFlashcard = (question: string) => {
      console.log(question);
      setCountdown(null); // Clear countdown when question arrives
      setCurrentQuestion(question);
      setAnswer("");
      setHasAnsweredCorrectly(false);
      setResults(null);
      setShowResults(false);
    };

    const handleCorrectGuess = () => {
      setHasAnsweredCorrectly(true);
    };

    const handleEndFlashcard = (flashcardEnd: FlashcardEnd) => {
      setResults(flashcardEnd);
      setShowResults(true);
    };

    socket.on("startCountdown", handleCountdown);
    socket.on("newFlashcard", handleNewFlashcard);
    socket.on("correctGuess", handleCorrectGuess);
    socket.on("endFlashcard", handleEndFlashcard);

    return () => {
      socket.off("startCountdown", handleCountdown);
      socket.off("newFlashcard", handleNewFlashcard);
      socket.off("correctGuess", handleCorrectGuess);
      socket.off("endFlashcard", handleEndFlashcard);
    };
  }, []);

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !hasAnsweredCorrectly) {
      socket.emit("answer", answer.trim());
      setAnswer("");
    }
  };

  if (countdown !== null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-9xl font-bold text-coffee">{countdown}</div>
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
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-light-vanilla [&::-webkit-scrollbar-thumb]:bg-coffee [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-light-vanilla">
        <div className="text-6xl font-bold text-center max-w-4xl text-coffee leading-tight drop-shadow-sm uppercase wrap-break-word">
          {currentQuestion}
        </div>
      </div>

      {!showResults && !hasAnsweredCorrectly && (
        <div className="p-8">
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
        </div>
      )}

      {!showResults && hasAnsweredCorrectly && (
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 text-coffee">✓</div>
            <div className="text-2xl font-bold text-coffee uppercase tracking-widest">
              Correct
            </div>
            <div className="text-coffee/50 mt-2 font-bold uppercase">
              Waiting for round to end...
            </div>
          </div>
        </div>
      )}

      {showResults && results && (
        <>
          <div className="flex items-center justify-center p-8 shrink-0">
            <div className="text-center w-full max-w-2xl ">
              <h3 className="text-xl font-semibold mb-4 text-coffee uppercase tracking-wider">
                Correct Answer
              </h3>
              <div className="text-4xl font-bold text-coffee p-6 bg-vanilla border-3 border-coffee shadow-[4px_4px_0px_0px_#644536] uppercase wrap-break-word">
                {results.Answer}
              </div>
            </div>
          </div>

          <div className="flex gap-6 flex-1 p-8 pt-0 justify-center overflow-y-auto">
            {results && results.fastestPlayers.length > 0 && (
              <MiniLeaderboard
                leaderboardName="Fastest Answers"
                playerList={results.fastestPlayers.map((player) => ({
                  player: player.player,
                  value: `${(Number(player.time) / 1000).toFixed(3)}s`,
                }))}
              />
            )}

            {results.wrongAnswers.length > 0 && (
              <MiniLeaderboard
                leaderboardName="Wrong Answers"
                playerList={results.wrongAnswers.map((player) => ({
                  player: player.player,
                  value: player.answer,
                }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
