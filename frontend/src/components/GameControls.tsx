import { socket } from "../socket";
import type { Lobby } from "@shared/types";

interface GameControlsProps {
  lobby: Lobby;
  userId: string;
}

export function GameControls({ lobby, userId }: GameControlsProps) {
  const player = lobby.players.find((p) => p.id === userId);
  const answerTimes = player?.answerTimes || [];

  const averageTime = answerTimes.length
    ? (
        answerTimes.reduce((a, b) => a + b, 0) /
        answerTimes.length /
        1000
      ).toFixed(3)
    : "N/A";

  const correctPercentage =
    player?.totalAnswers && player.totalAnswers > 0
      ? Math.round((player.correctAnswers / player.totalAnswers) * 100)
      : 0;

  const totalPlayers = lobby.players.length;
  const votes = lobby.endGameVotes?.length || 0;
  // Logic: votes / total > 0.75
  const votesNeeded = Math.floor(totalPlayers * 0.75) + 1;
  const hasVoted = lobby.endGameVotes?.includes(userId);

  const handleVote = () => {
    if (!hasVoted && lobby.status === "ongoing") {
      socket.emit("voteEndGame");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full relative">
      {/* Game Header */}
      <div className="flex justify-center items-center pb-3 border-b-2 border-coffee/50">
        <div className="h-4 flex items-center">
          <span className="text-sm font-bold text-coffee">Game</span>
        </div>
      </div>

      {/* Flashcard Info Section */}
      <div className="flex flex-col w-full mb-4 text-center px-4 pt-2">
        <h2 className="text-lg font-bold text-coffee wrap-break-words w-full">
          {lobby.flashcardName || "Unnamed Flashcard Set"}
        </h2>
        <p className="text-xs text-coffee/70 italic warp-break-words w-full pt-4">
          {lobby.flashcardDescription || "No description"}
        </p>
      </div>

      {/* Stats Section */}
      <div className="flex flex-col w-full">
        <div className="flex justify-center items-center pb-3 border-b-2 border-coffee/50 pt-2">
          <div className="h-4 flex items-center">
            <span className="text-sm font-bold text-coffee">Stats</span>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center text-coffee font-bold">
            <span>Average Time:</span>
            <span>{averageTime === "N/A" ? "N/A" : `${averageTime}s`}</span>
          </div>
          <div className="flex justify-between items-center text-coffee font-bold">
            <span>Correct %:</span>
            <span>{correctPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Vote Button */}
      <div className="flex flex-col w-full mt-2 p-4 pt-0 items-center">
        {lobby.status === "ongoing" ? (
          <button
            onClick={handleVote}
            disabled={hasVoted}
            className="group relative rounded-lg bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            <span
              className={`text-xs block w-full h-full rounded-lg border-2 border-coffee px-4 py-2 font-bold text-vanilla bg-terracotta tracking-widest -translate-y-[0.05rem] transition-transform duration-100 ease-out ${
                !hasVoted
                  ? "group-hover:-translate-y-[0.175rem] group-active:translate-y-0"
                  : ""
              }`}
            >
              {hasVoted ? "Voted to End" : "Vote to End Game"}
            </span>
          </button>
        ) : (
          <div className="text-coffee/50 font-bold italic">Game Finished</div>
        )}

        {votes > 0 && lobby.status === "ongoing" && (
          <div className="text-sm text-coffee/70 font-bold text-center mt-1">
            {votes}/{totalPlayers} votes. {Math.max(0, votesNeeded - votes)}{" "}
            more needed to end game.
          </div>
        )}
      </div>
    </div>
  );
}
