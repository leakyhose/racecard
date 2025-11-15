import type { Lobby } from "@shared/types";

interface LobbyHeaderProps {
  code: string;
  nickname: string;
  isLeader: boolean;
  lobby: Lobby;
}

export function LobbyHeader({ code, nickname, isLeader, lobby}: LobbyHeaderProps) {
  return (
    <div className="flex p-3 border-b items-center">
      <div className="font-bold shrink-0 w-64">Lobby Code: {code}</div>
      <div className="flex-1 flex justify-center">
        {
          isLeader ? (
              lobby.flashcards.length == 0 ? (
                  <div>Upload or create Flashcards to start</div>
              ) : (
                  <div>Start</div>
              )
          ) : (
              lobby.flashcards.length == 0 ? (
                  <div>Waiting for leader to upload or create Flashcards...</div>
              ) : (
                  <div>Waiting for leader to start...</div>
              )
          )
        }
      </div>
      <div className="font-bold shrink-0 w-80 text-right">Nickname: {nickname}</div>
    </div>
  );
}
