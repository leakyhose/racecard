import type { Player } from "@shared/types";
import { socket } from "../socket";

interface PlayersProps {
  players: Player[];
}

export function Players({ players }: PlayersProps) {
  const handleUpdateLeader = (nextLeaderId: string) => {
    if (players[0].id !== socket.id) return; // Only current leader can change leader
    socket.emit("updateLeader", nextLeaderId);
  };

  return (
    <div>
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            <div onClick={() => handleUpdateLeader(player.id)}>
              {player.name} - Score: {player.score}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
