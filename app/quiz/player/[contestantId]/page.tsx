"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Leaderboard from "@/components/quiz/Leaderboard";
import { getPusherClient } from "@/lib/pusher/client";

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
  const [savingStatus, setSavingStatus] = useState<Map<number, boolean>>(
    new Map()
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(
    null
  );
  const [correctAnswersMap, setCorrectAnswersMap] = useState<Record<
    number,
    number
  > | null>(null);
  const saveTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Fetch initial data and set up Pusher subscriptions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/quiz/player/${contestantId}/answers`
        );
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

        // Set up Pusher subscriptions after getting initial data
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`party-${data.party.id}`);

        // Listen for quiz status changes
        channel.bind("quiz-status-changed", (eventData: { status: string }) => {
          setParty((prev) =>
            prev ? { ...prev, status: eventData.status } : null
          );

          // Fetch leaderboard when quiz finishes
          if (eventData.status === "FINISHED") {
            fetch(`/api/quiz/player/${contestantId}/leaderboard`)
              .then((res) => res.json())
              .then((data) => {
                if (data.leaderboard) {
                  setLeaderboard(data.leaderboard);
                  setCorrectAnswersMap(data.correctAnswers);
                }
              });
          }
        });

        // Listen for quiz finished event with leaderboard data
        channel.bind(
          "quiz-finished",
          (eventData: {
            leaderboard: LeaderboardEntry[];
            correctAnswers: Record<number, number>;
          }) => {
            setParty((prev) => (prev ? { ...prev, status: "FINISHED" } : null));
            setLeaderboard(eventData.leaderboard);
            setCorrectAnswersMap(eventData.correctAnswers);
          }
        );

        // Listen for question navigation changes
        channel.bind(
          "question-changed",
          (eventData: { currentQuestion: number }) => {
            setParty((prev) => {
              if (prev) {
                return { ...prev, currentQuestion: eventData.currentQuestion };
              }
              return null;
            });
          }
        );

        return () => {
          channel.unbind_all();
          channel.unsubscribe();
        };
      } catch (err) {
        setError("Failed to load quiz data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup: clear all pending save timers when component unmounts
    return () => {
      saveTimers.current.forEach((timer) => clearTimeout(timer));
      saveTimers.current.clear();
    };
  }, [contestantId, leaderboard]);

  const saveAnswer = useCallback(
    async (questionNumber: number, value: number | null) => {
      setSavingStatus((prev) => new Map(prev).set(questionNumber, true));

      try {
        const response = await fetch(
          `/api/quiz/player/${contestantId}/answer`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionNumber, value }),
          }
        );

        if (!response.ok) {
          console.error("Failed to save answer");
        }
      } catch (err) {
        console.error("Error saving answer:", err);
      } finally {
        setSavingStatus((prev) => {
          const newMap = new Map(prev);
          newMap.delete(questionNumber);
          return newMap;
        });
      }
    },
    [contestantId]
  );

  const formatInputValue = (value: number | undefined): string => {
    if (value === undefined || isNaN(value)) return "";
    return value.toLocaleString("en-US");
  };

  const parseInputValue = (value: string): number | null => {
    // Remove commas and parse
    const cleaned = value.replace(/,/g, "");
    if (cleaned === "" || cleaned === "-") return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleAnswerChange = (questionNumber: number, value: string) => {
    // Clear any existing timer for this question
    const existingTimer = saveTimers.current.get(questionNumber);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const numValue = parseInputValue(value);
    if (numValue !== null) {
      setAnswers((prev) => new Map(prev).set(questionNumber, numValue));
      // Auto-save after 500ms of no typing
      const timer = setTimeout(() => {
        saveAnswer(questionNumber, numValue);
        saveTimers.current.delete(questionNumber);
      }, 500);
      saveTimers.current.set(questionNumber, timer);
    } else {
      // Allow empty or just minus sign while typing
      setAnswers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(questionNumber);
        return newMap;
      });
      // Auto-save deletion after 500ms of no typing
      const timer = setTimeout(() => {
        saveAnswer(questionNumber, null);
        saveTimers.current.delete(questionNumber);
      }, 500);
      saveTimers.current.set(questionNumber, timer);
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
            currentContestantId={contestantId}
          />
        </div>
      </main>
    );
  }

  const answeredCount = answers.size;

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-md mx-auto">
        <Header name={name} party={party} answeredCount={answeredCount} />

        <div className="space-y-4">
          <AnswersList
            answers={answers}
            party={party}
            savingStatus={savingStatus}
            formatInputValue={formatInputValue}
            handleAnswerChange={handleAnswerChange}
          />
        </div>
      </div>
    </main>
  );
}

function AnswersList({
  answers,
  party,
  savingStatus,
  formatInputValue,
  handleAnswerChange,
}: {
  answers: Map<number, number>;
  party: PartyData;
  savingStatus: Map<number, boolean>;
  formatInputValue: (value: number | undefined) => string;
  handleAnswerChange: (questionNumber: number, value: string) => void;
}) {
  return (
    <>
      {Array.from({ length: party.totalQuestions }, (_, i) => i + 1).map(
        (questionNum) => {
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
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                      🔒 Locked
                    </span>
                  )}
                  {isCurrent && !isLocked && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-sm">
                      CURRENT
                    </span>
                  )}
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder={
                  isLocked ? "Question not yet revealed" : "Enter your answer"
                }
                value={formatInputValue(answers.get(questionNum))}
                onChange={(e) =>
                  handleAnswerChange(questionNum, e.target.value)
                }
                disabled={isDisabled}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          );
        }
      )}
    </>
  );
}

function Header({
  name,
  party,
  answeredCount,
}: {
  name: string;
  party: PartyData;
  answeredCount: number;
}) {
  return (
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
  );
}
