type LeaderboardEntry = {
  contestantId: string;
  contestantName: string;
  totalScore: number;
  questionScores: number[];
};

type LeaderboardProps = {
  leaderboard: LeaderboardEntry[];
  totalQuestions: number;
  correctAnswers?: Record<number, number>;
  showQuestionBreakdown?: boolean;
};

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

export default function Leaderboard({
  leaderboard,
  totalQuestions,
  correctAnswers,
  showQuestionBreakdown = false,
}: LeaderboardProps) {
  const getMedalEmoji = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Final Results</h1>

      <div className="space-y-3 mb-6">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.contestantId}
            className={`p-4 rounded-lg border-2 ${
              index === 0
                ? "bg-yellow-50 border-yellow-400"
                : index === 1
                ? "bg-gray-50 border-gray-400"
                : index === 2
                ? "bg-orange-50 border-orange-400"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-gray-400 w-8">
                  #{index + 1}
                </div>
                {getMedalEmoji(index) && (
                  <span className="text-3xl">{getMedalEmoji(index)}</span>
                )}
                <div>
                  <div className="text-lg font-semibold">
                    {entry.contestantName}
                  </div>
                  {showQuestionBreakdown && (
                    <div className="text-sm text-gray-600 flex gap-1 mt-1">
                      {entry.questionScores.map((score, qIdx) => (
                        <span
                          key={qIdx}
                          className={`px-1.5 py-0.5 rounded ${
                            score >= 25
                              ? "bg-green-100 text-green-800 font-bold"
                              : score >= 15
                              ? "bg-blue-100 text-blue-800"
                              : score >= 10
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {score}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {formatNumber(entry.totalScore)}
                </div>
                <div className="text-sm text-gray-500">points</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No contestants submitted answers
        </div>
      )}

      {correctAnswers && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-3 text-gray-700">Correct Answers:</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(
              (q) => (
                <div
                  key={q}
                  className="text-center p-2 bg-gray-50 rounded border border-gray-200 min-w-0"
                >
                  <div className="text-xs text-gray-600">Q{q}</div>
                  <div className="font-semibold text-gray-900 break-words break-all">
                    {formatNumber(correctAnswers[q])}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t text-center text-sm text-gray-500">
        <p>Scoring: Nearest answer = 10pts, Within ±10% = 15pts</p>
      </div>
    </div>
  );
}
