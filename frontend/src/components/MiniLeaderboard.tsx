type FlashcardEndProps = {
  leaderboardName: string;
  playerList: {
    player: string;
    value: string | number | (string | number)[];
  }[];
  maxHeight?: string;
};

export function MiniLeaderboard({
  leaderboardName,
  playerList,
  maxHeight = "max-h-[200px]",
}: FlashcardEndProps) {
  let tintColor = "";
  if (leaderboardName === "Fastest Answers") {
    tintColor = "bg-mint/0";
  } else if (leaderboardName === "Wrong5Answers") {
    tintColor = "bg-terracotta/0";
  }

  return (
    <div className="relative border-3 border-coffee p-4 bg-vanilla w-80 rounded-md flex flex-col max-h-full overflow-hidden">
      {tintColor && (
        <div className={`absolute inset-0 ${tintColor} pointer-events-none`} />
      )}
      <h3 className="relative text-xl font-bold mb-3 text-coffee tracking-wide border-b-2 border-coffee pb-2 shrink-0 text-center">
        {leaderboardName}
      </h3>
      <div
        className={`relative space-y-2 overflow-y-auto ${maxHeight} pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-coffee/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40`}
      >
        {playerList.map((player, index) => (
          <div
            key={index}
            className={`p-2 rounded-md  ${Array.isArray(player.value) && player.value.length > 1 ? "" : "flex justify-between items-center"}`}
          >
            <div className="font-bold text-coffee">{player.player}</div>
            {Array.isArray(player.value) && player.value.length > 1 ? (
              <div className="space-y-1 mt-1">
                {player.value.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-coffee/70 wrap-break-word italic"
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
