"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";

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
  currentContestantId?: string;
};

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

export default function Leaderboard({
  leaderboard,
  totalQuestions,
  correctAnswers,
  showQuestionBreakdown = false,
  currentContestantId,
}: LeaderboardProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Check if the current contestant is the winner (first place)
  const isWinner =
    currentContestantId &&
    leaderboard.length > 0 &&
    leaderboard[0].contestantId === currentContestantId;

  useEffect(() => {
    // Trigger animations when component mounts - only for winner
    if (isWinner) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
  }, [isWinner]);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={500}
          recycle={true}
          gravity={0.1}
        />
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 relative overflow-hidden">
        <h1 className="text-3xl font-bold text-center mb-3">Final results</h1>
        <LeaderboardContestants
          leaderboard={leaderboard}
          showQuestionBreakdown={showQuestionBreakdown}
        />
        {leaderboard.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No contestants submitted answers
          </div>
        )}
        {correctAnswers && showQuestionBreakdown && (
          <CorrectAnswers
            correctAnswers={correctAnswers}
            totalQuestions={totalQuestions}
            leaderboard={leaderboard}
          />
        )}
        <div className="mt-6 pt-4 border-t text-center text-sm text-gray-500">
          <p>Scoring: Nearest answer = 10pts, Within ±10% = 15pts</p>
        </div>
      </div>
      {isWinner && <WinnerPopup />}
      <Styles />
    </>
  );
}

function Styles() {
  return (
    <style jsx>{`
      @keyframes bounce-in {
        0% {
          transform: translateY(100%) translateX(-50%) scale(0.8);
          opacity: 0;
        }
        50% {
          transform: translateY(-10%) translateX(-50%) scale(1.05);
        }
        70% {
          transform: translateY(5%) translateX(-50%) scale(0.95);
        }
        100% {
          transform: translateY(0) translateX(-50%) scale(1);
          opacity: 1;
        }
      }
    `}</style>
  );
}

function LeaderboardContestants({
  leaderboard,
  showQuestionBreakdown,
}: {
  leaderboard: LeaderboardEntry[];
  showQuestionBreakdown: boolean;
}) {
  const getMedalEmoji = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3 items-center justify-center mb-6">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.contestantId}
            className={`px-4 py-2 rounded-lg border-2 ${
              index === 0
                ? "bg-yellow-50 border-yellow-400"
                : index === 1
                ? "bg-gray-50 border-gray-400"
                : index === 2
                ? "bg-orange-50 border-orange-400"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {getMedalEmoji(index) && (
                <span className="text-2xl">{getMedalEmoji(index)}</span>
              )}
              <div>
                <div className="text-sm font-semibold">
                  {entry.contestantName}
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {formatNumber(entry.totalScore)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrectAnswers({
  correctAnswers,
  totalQuestions,
  leaderboard,
}: {
  correctAnswers: Record<number, number>;
  totalQuestions: number;
  leaderboard: LeaderboardEntry[];
}) {
  const getScoreColor = (score: number) => {
    if (score >= 25) return "bg-green-100 text-green-800 font-bold";
    if (score >= 15) return "bg-blue-100 text-blue-800";
    if (score >= 10) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="mt-6 pt-3 border-t">
      <h3 className="font-semibold mb-3 text-gray-700">Question Details:</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                Q
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                Correct
              </th>
              {leaderboard.map((entry, idx) => (
                <th
                  key={entry.contestantId}
                  className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold"
                >
                  {entry.contestantName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(
              (q) => (
                <tr key={q} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                    {q}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                    {formatNumber(correctAnswers[q])}
                  </td>
                  {leaderboard.map((entry) => (
                    <td
                      key={entry.contestantId}
                      className="border border-gray-300 px-3 py-2 text-center"
                    >
                      <span
                        className={`inline-block px-2 py-1 rounded text-sm ${getScoreColor(
                          entry.questionScores[q - 1]
                        )}`}
                      >
                        {entry.questionScores[q - 1]}
                      </span>
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WinnerPopup() {
  const [showProfessorDad, setShowProfessorDad] = useState(true);

  return (
    <div
      className={`fixed bottom-[-3px] left-1/2 -translate-x-1/2 z-50 transition-all duration-1000 ease-out w-[400px] h-[400px] cursor-pointer ${
        showProfessorDad
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      }`}
      style={{
        animation: showProfessorDad ? "bounce-in 0.8s ease-out" : "none",
      }}
      onClick={() => setShowProfessorDad(false)}
    >
      <Image
        src="/professor-dad.png"
        alt="Professor Dad"
        className="object-contain drop-shadow-2xl w-full h-full"
        width={400}
        height={400}
      />
    </div>
  );
}
