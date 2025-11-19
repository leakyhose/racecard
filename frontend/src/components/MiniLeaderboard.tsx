type FlashcardEndProps = {
    leaderboardName: string;
    playerList: { player: string; value: string | number | (string | number)[] }[];
};

export function MiniLeaderboard({ leaderboardName, playerList }: FlashcardEndProps) {
    return (
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 flex-1 max-w-md">
            <h3 className="text-xl font-semibold mb-3 text-blue-800">
                {leaderboardName}
            </h3>
            <div className="space-y-2">
                {playerList.map((player, index) => (
                    <div
                        key={index}
                        className={`p-2 bg-white rounded border ${Array.isArray(player.value) && player.value.length > 1 ? '' : 'flex justify-between items-center'}`}
                    >
                        <div className="font-medium">{player.player}</div>
                        {Array.isArray(player.value) && player.value.length > 1 ? (
                            <div className="space-y-1">
                                {player.value.map((item, idx) => (
                                    <div key={idx} className="text-sm text-gray-600 italic truncate">
                                        "{item}"
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600 italic">{player.value}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
