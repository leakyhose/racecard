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
    <div className="flex-1 flex flex-col overflow-hidden bg-vanilla">
      <ul className="flex-1 overflow-y-auto overflow-x-hidden ">
        {players.map((player) => {
          const hasMiniStatus = isOngoing && player.miniStatus !== null;

          return (
            <li
              key={player.id}
              className="border-b-4 border-coffee flex w-full group relative h-16 hover:bg-terracotta/20 transition-colors bg-vanilla"
            >
              <div
                className={`flex w-full ${isLeader && player.id != socket.id ? "cursor-pointer" : ""}`}
                onClick={() => isLeader && handleUpdateLeader(player.id)}
              >
                <div className="flex-1 flex flex-col justify-center overflow-hidden px-4 py-1">
                  {hasMiniStatus ? (
                    <>
                      {player.id === leader ? (
                        <div className="truncate leading-tight text-coffee font-bold uppercase">
                          👑 {player.name}
                        </div>
                      ) : (
                        <div className="truncate leading-tight text-coffee font-bold uppercase">
                          {player.name}
                        </div>
                      )}

                      <div className="text-sm truncate leading-tight mt-1 text-coffee/70 font-bold">
                        {typeof player.miniStatus === "number"
                          ? `${(Number(player.miniStatus) / 1000).toFixed(3)}s`
                          : player.miniStatus}
                      </div>
                    </>
                  ) : (
                    <div className="truncate">
                      {player.id === leader ? (
                        <div className="truncate leading-tight text-coffee font-bold uppercase">
                           👑 {player.name}
                        </div>
                      ) : (
                        <div className="truncate leading-tight text-coffee font-bold uppercase">
                          {player.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-16 shrink-0 flex items-center justify-center font-bold text-lg text-coffee bg-coffee/10 border-l-4 border-coffee">
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
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-coffee text-vanilla font-bold uppercase tracking-wider text-xs">
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
