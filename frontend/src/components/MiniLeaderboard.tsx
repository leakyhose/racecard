type FlashcardEndProps = {
  leaderboardName: string;
  playerList: {
    player: string;
    value: string | number | (string | number)[];
  }[];
};

export function MiniLeaderboard({
  leaderboardName,
  playerList,
}: FlashcardEndProps) {
  return (
    <div className="border-3 border-coffee p-4 bg-vanilla w-80 shadow-[8px_8px_0px_0px_#644536] flex flex-col max-h-full">
      <h3 className="text-xl font-bold mb-3 text-coffee uppercase tracking-wide border-b-2 border-coffee pb-2 shrink-0">
        {leaderboardName}
      </h3>
      <div className="space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-vanilla [&::-webkit-scrollbar-thumb]:bg-coffee [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-vanilla">
        {playerList.map((player, index) => (
          <div
            key={index}
            className={`p-2 bg-white/50 border-2 border-coffee ${Array.isArray(player.value) && player.value.length > 1 ? "" : "flex justify-between items-center"}`}
          >
            <div className="font-bold text-coffee uppercase">
              {player.player}
            </div>
            {Array.isArray(player.value) && player.value.length > 1 ? (
              <div className="space-y-1">
                {player.value.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-coffee/70 wrap-break-word"
                  >
                    "{item}"
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1 text-sm text-coffee/70 font-bold wrap-break-word">
                {player.value}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
