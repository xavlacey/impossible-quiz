"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Leaderboard from "@/components/quiz/Leaderboard";

type Answer = {
  questionNumber: number;
  value: number;
  updatedAt: string;
};

type PartyData = {
  id: string;
  code: string;
  status: string;
  currentQuestion: number;
  totalQuestions: number;
};

type LeaderboardEntry = {
  contestantId: string;
  contestantName: string;
  totalScore: number;
  questionScores: number[];
};

export default function PlayerView() {
  const params = useParams();
  const contestantId = params.contestantId as string;

  const [party, setParty] = useState<PartyData | null>(null);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingStatus, setSavingStatus] = useState<Map<number, boolean>>(new Map());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [correctAnswersMap, setCorrectAnswersMap] = useState<Record<number, number> | null>(null);

  // Fetch initial data and poll for status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/quiz/player/${contestantId}/answers`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load quiz");
          return;
        }

        setParty(data.party);
        setName(data.contestant.name);

        const answerMap = new Map<number, number>();
        data.answers.forEach((a: Answer) => {
          answerMap.set(a.questionNumber, a.value);
        });
        setAnswers(answerMap);

        // If quiz is finished, fetch leaderboard
        if (data.party.status === "FINISHED" && !leaderboard) {
          const leaderboardResponse = await fetch(
            `/api/quiz/player/${contestantId}/leaderboard`
          );
          const leaderboardData = await leaderboardResponse.json();

          if (leaderboardResponse.ok) {
            setLeaderboard(leaderboardData.leaderboard);
            setCorrectAnswersMap(leaderboardData.correctAnswers);
          }
        }
      } catch (err) {
        setError("Failed to load quiz data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Poll every 2 seconds to check for quiz end
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [contestantId, leaderboard]);

  const saveAnswer = useCallback(async (questionNumber: number, value: number) => {
    setSavingStatus(prev => new Map(prev).set(questionNumber, true));

    try {
      const response = await fetch(`/api/quiz/player/${contestantId}/answer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionNumber, value }),
      });

      if (!response.ok) {
        console.error("Failed to save answer");
      }
    } catch (err) {
      console.error("Error saving answer:", err);
    } finally {
      setSavingStatus(prev => {
        const newMap = new Map(prev);
        newMap.delete(questionNumber);
        return newMap;
      });
    }
  }, [contestantId]);

  const handleAnswerChange = (questionNumber: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAnswers(prev => new Map(prev).set(questionNumber, numValue));
      // Auto-save after 500ms of no typing
      setTimeout(() => saveAnswer(questionNumber, numValue), 500);
    } else if (value === "" || value === "-") {
      // Allow empty or just minus sign while typing
      setAnswers(prev => {
        const newMap = new Map(prev);
        newMap.delete(questionNumber);
        return newMap;
      });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{error || "Quiz not found"}</div>
      </main>
    );
  }

  // Show leaderboard if quiz is finished
  if (party.status === "FINISHED" && leaderboard && correctAnswersMap) {
    return (
      <main className="min-h-screen p-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Leaderboard
            leaderboard={leaderboard}
            totalQuestions={party.totalQuestions}
            correctAnswers={correctAnswersMap}
            showQuestionBreakdown={false}
          />
        </div>
      </main>
    );
  }

  const answeredCount = answers.size;

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-600">Quiz:</p>
              <p className="text-lg font-bold">{party.code}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Progress:</p>
              <p className="text-lg font-bold">
                {answeredCount}/{party.totalQuestions}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Playing as: <span className="font-semibold">{name}</span>
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: party.totalQuestions }, (_, i) => i + 1).map(
            (questionNum) => {
              const hasAnswer = answers.has(questionNum);
              const isSaving = savingStatus.get(questionNum);
              const isCurrent = questionNum === party.currentQuestion;
              const isLocked = questionNum > party.currentQuestion;
              const isDisabled = party.status === "FINISHED" || isLocked;

              return (
                <div
                  key={questionNum}
                  className={`bg-white rounded-lg shadow p-4 ${
                    isCurrent ? "ring-2 ring-blue-500" : ""
                  } ${isLocked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Question {questionNum}</h3>
                    <div className="flex items-center gap-2">
                      {isLocked && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          🔒 Locked
                        </span>
                      )}
                      {!isLocked && isSaving && (
                        <span className="text-xs text-gray-500">Saving...</span>
                      )}
                      {!isLocked && hasAnswer && !isSaving && (
                        <span className="text-green-600 text-xl">✓</span>
                      )}
                      {isCurrent && !isLocked && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          CURRENT
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder={isLocked ? "Question not yet revealed" : "Enter your answer"}
                    value={answers.get(questionNum) ?? ""}
                    onChange={(e) => handleAnswerChange(questionNum, e.target.value)}
                    disabled={isDisabled}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              );
            }
          )}
        </div>
      </div>
    </main>
  );
}
