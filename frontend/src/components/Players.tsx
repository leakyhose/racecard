import type { Player } from "@shared/types";
import { socket } from "../socket";

interface PlayersProps {
  players: Player[];
  gameStatus: string;
  isLeader: boolean;
  leader: string;
}

export function Players({
  players,
  gameStatus,
  isLeader,
  leader,
}: PlayersProps) {
  const handleUpdateLeader = (nextLeaderId: string) => {
    if (!isLeader) {
      return;
    }
    socket.emit("updateLeader", nextLeaderId);
  };

  const isOngoing = gameStatus === "ongoing";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-light-vanilla">
      <ul className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:absolute [&::-webkit-scrollbar-track]:bg-vanilla [&::-webkit-scrollbar-thumb]:bg-coffee [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-vanilla">
        {players.map((player) => {
          const hasMiniStatus = isOngoing && player.miniStatus !== null;

          const hasCorrectAnswer = player.isCorrect === true;

          return (
            <li
              key={player.id}
              className={`rounded-lg border-2 border-coffee flex w-full group relative h-14 hover:shadow-sm transition-all ${
                hasCorrectAnswer
                  ? "bg-mint/40"
                  : hasMiniStatus
                    ? "bg-terracotta/20"
                    : "bg-vanilla/80"
              }`}
            >
              <div
                className={`flex w-full overflow-hidden rounded-lg ${isLeader && player.id != socket.id ? "cursor-pointer" : ""}`}
                onClick={() => isLeader && handleUpdateLeader(player.id)}
              >
                <div className="flex-1 flex flex-col justify-center overflow-visible px-3 py-1 relative">
                  {hasMiniStatus ? (
                    <>
                      <div className="font-bold truncate leading-tight text-coffee">
                        {player.name}
                        {player.id === leader && (
                          <span className="text-[10px] align-middle"> 👑</span>
                        )}
                      </div>

                      <div className="text-sm truncate leading-tight text-coffee font-bold">
                        {typeof player.miniStatus === "number"
                          ? `${(Number(player.miniStatus) / 1000).toFixed(3)}s`
                          : player.miniStatus}
                      </div>
                    </>
                  ) : (
                    <div className="font-semibold truncate leading-tight text-coffee">
                      {player.name}
                      {player.id === leader && (
                        <span className="text-[10px] align-middle"> 👑</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-14 shrink-0 flex items-center justify-center font-bold text-base text-coffee/80">
                  {gameStatus === "waiting" || gameStatus === "finished" ? (
                    <div className="w-16 shrink-0 flex items-center justify-center">
                      {" "}
                      {player.wins}{" "}
                    </div>
                  ) : (
                    <div className="w-16 shrink-0 flex items-center justify-center">
                      {" "}
                      {player.score}{" "}
                    </div>
                  )}
                </div>
              </div>
              {isLeader && player.id != socket.id && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-terracotta text-vanilla font-bold tracking-wider text-sm rounded-lg">
                  Promote
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
