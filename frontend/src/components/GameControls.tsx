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

  const bestTime = answerTimes.length
    ? (Math.min(...answerTimes) / 1000).toFixed(3)
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
            <span>Best Time:</span>
            <span>{bestTime === "N/A" ? "N/A" : `${bestTime}s`}</span>
          </div>
          <div className="flex justify-between items-center text-coffee font-bold">
            <span>Correct %:</span>
            <span>{correctPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Commands Section */}
      <div className="flex flex-col w-full mt-4">
        <div className="flex justify-center items-center pb-3 border-b-2 border-coffee/50">
          <div className="h-4 flex items-center">
            <span className="text-sm font-bold text-coffee">Commands</span>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-2 items-center">
          {lobby.status === "ongoing" ? (
            <button
              onClick={handleVote}
              disabled={hasVoted}
              className={`text-coffee font-bold transition-colors cursor-pointer ${hasVoted ? "underline decoration-2 underline-offset-4 opacity-50 cursor-default" : "hover:text-terracotta"}`}
            >
              Vote to end game
            </button>
          ) : (
            <div className="text-coffee/50 font-bold italic">Game Finished</div>
          )}

          {votes > 0 && lobby.status === "ongoing" && (
            <div className="text-sm text-coffee/70 font-bold">
              Votes: {votes}/{totalPlayers} ({Math.max(0, votesNeeded - votes)}{" "}
              more needed)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
