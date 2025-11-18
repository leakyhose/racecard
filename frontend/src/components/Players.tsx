import type { Player } from "@shared/types";
import { socket } from "../socket";

interface PlayersProps {
  players: Player[];
  gameStatus: string;
  isLeader: boolean;
  leader: string;
}

export function Players({ players, gameStatus, isLeader, leader }: PlayersProps) {
  const handleUpdateLeader = (nextLeaderId: string) => {
    if (!isLeader){return;}
    socket.emit("updateLeader", nextLeaderId);
  };

  const isOngoing = gameStatus === "ongoing";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ul className="flex-1 overflow-auto border border-grey-100">
        {players.map((player) => {
          const hasMiniStatus = isOngoing && player.miniStatus !== null;
          
          return (
            <li
              key={player.id}
              className="border border-grey-100 flex w-full group relative h-16"
            >
              <div
                className={`flex w-full ${isLeader && player.id != socket.id ? "cursor-pointer group-hover:opacity-30 transition-opacity" : ""}`}
                onClick={() => isLeader && handleUpdateLeader(player.id)}
              >
                <div className="flex-1 flex flex-col justify-center overflow-hidden p-2">
                  {hasMiniStatus ? (
                    <>
                      {player.id === leader ? (
                        <div className="truncate leading-tight">
                        👑{player.name}
                        </div>
                      ) : (
                        <div className="truncate leading-tight">
                        {player.name}
                        </div>
                      )}
                      
                      <div className="text-sm truncate leading-tight mt-1">
                        {(typeof player.miniStatus) === 'number'
                          ? `${(Number(player.miniStatus) / 1000).toFixed(3)}s`
                          : ((player.miniStatus))}

                      </div>
                    </>
                  ) : (
                    <div className="truncate">
                      {player.id === leader ? (
                        <div className="truncate leading-tight">
                        👑 {player.name}
                        </div>
                      ) : (
                        <div className="truncate leading-tight">
                        {player.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="w-16 shrink-0 flex items-center justify-center">
                  {gameStatus === "waiting" || gameStatus === "finished" ? (
                    <div className="w-16 shrink-0 flex items-center justify-center"> {player.wins} </div>) : (
                    <div className="w-16 shrink-0 flex items-center justify-center"> {player.score} </div>
                    )}
                </div>
              </div>
              {isLeader && player.id != socket.id && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-sm font-semibold">Click to promote</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
