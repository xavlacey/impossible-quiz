"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Leaderboard from "@/components/quiz/Leaderboard";
import { getPusherClient } from "@/lib/pusher/client";

type Contestant = {
  id: string;
  name: string;
  answeredQuestions: number[];
  totalAnswered: number;
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

export default function HostDashboard() {
  const params = useParams();
  const hostId = params.hostId as string;

  const [party, setParty] = useState<PartyData | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEndQuizModal, setShowEndQuizModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, string>>(
    {}
  );

  const formatInputValue = (value: string | undefined): string => {
    if (!value || value === "") return "";
    const num = parseFloat(value.replace(/,/g, ""));
    if (isNaN(num)) return value; // Return as-is if not a valid number
    return num.toLocaleString("en-US");
  };

  const parseInputValue = (value: string): string => {
    // Remove commas for storage, but allow other characters for partial input
    return value.replace(/,/g, "");
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(
    null
  );
  const [correctAnswersMap, setCorrectAnswersMap] = useState<Record<
    number,
    number
  > | null>(null);
  const [currentRevealQuestion, setCurrentRevealQuestion] = useState(1);
  const [questionResults, setQuestionResults] = useState<
    Array<{
      questionNumber: number;
      correctAnswer: number;
      playerAnswers: Array<{
        contestantId: string;
        name: string;
        answer: number;
        score: number;
      }>;
    }>
  >([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/quiz/host/${hostId}/status`);

        if (!response.ok) {
          const errorData = await response.json().catch((parseError) => {
            console.error(
              "[HostDashboard] Failed to parse error response:",
              parseError
            );
            return { error: `HTTP ${response.status}` };
          });
          console.error("[HostDashboard] API error response:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            hostId,
          });
          setError(
            errorData.error || `Failed to load party (${response.status})`
          );
          return;
        }

        const data = await response.json();

        setParty(data.party);
        setContestants(data.contestants);

        // If quiz is finished, fetch leaderboard
        if (data.party.status === "FINISHED" && !leaderboard) {
          const leaderboardResponse = await fetch(
            `/api/quiz/host/${hostId}/leaderboard`
          );
          const leaderboardData = await leaderboardResponse.json();

          if (leaderboardResponse.ok) {
            setLeaderboard(leaderboardData.leaderboard);
            setCorrectAnswersMap(leaderboardData.correctAnswers);
          }
        }

        // Set up Pusher subscriptions after getting initial data
        let pusher;
        let channel;
        try {
          pusher = getPusherClient();
          channel = pusher.subscribe(`party-${data.party.id}`);
        } catch (pusherError) {
          console.error("[HostDashboard] Error setting up Pusher:", {
            error: pusherError,
            errorMessage:
              pusherError instanceof Error
                ? pusherError.message
                : String(pusherError),
            errorStack:
              pusherError instanceof Error ? pusherError.stack : undefined,
            partyId: data.party.id,
          });
          // Continue without Pusher - the app can still work, just without real-time updates
          throw pusherError;
        }

        // Listen for answer submissions to update contestant status in real-time
        channel.bind("answer-submitted", () => {
          // Re-fetch status to get updated answer counts
          fetch(`/api/quiz/host/${hostId}/status`)
            .then((res) => res.json())
            .then((data) => {
              if (data.party && data.contestants) {
                setContestants(data.contestants);
              }
            });
        });

        // Listen for answer deletions to update contestant status in real-time
        channel.bind("answer-deleted", () => {
          // Re-fetch status to get updated answer counts
          fetch(`/api/quiz/host/${hostId}/status`)
            .then((res) => res.json())
            .then((data) => {
              if (data.party && data.contestants) {
                setContestants(data.contestants);
              }
            });
        });

        // Listen for new contestants joining
        channel.bind(
          "contestant-joined",
          (event: {
            contestant: {
              id: string;
              name: string;
              answeredQuestions: number[];
              totalAnswered: number;
            };
            partyStatus: string;
          }) => {
            // Add the new contestant to the list
            setContestants((prev) => {
              // Check if contestant already exists to avoid duplicates
              if (prev.some((c) => c.id === event.contestant.id)) {
                return prev;
              }
              return [...prev, event.contestant];
            });

            // Update party status if it changed
            setParty((prevParty) => {
              if (prevParty && event.partyStatus !== prevParty.status) {
                return { ...prevParty, status: event.partyStatus };
              }
              return prevParty;
            });
          }
        );

        // Listen for question changes (for consistency and multi-host scenarios)
        channel.bind(
          "question-changed",
          (eventData: { currentQuestion: number }) => {
            setParty((prev) => {
              if (prev && prev.currentQuestion !== eventData.currentQuestion) {
                return { ...prev, currentQuestion: eventData.currentQuestion };
              }
              return prev;
            });
          }
        );

        return () => {
          channel.unbind_all();
          channel.unsubscribe();
        };
      } catch (err) {
        console.error("[HostDashboard] Error in fetchStatus:", {
          error: err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
          hostId,
        });
        setError(
          `Failed to load party data: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostId, leaderboard]);

  const handleRevealQuestion = async () => {
    setIsSubmitting(true);
    setError("");

    const answer = correctAnswers[currentRevealQuestion];
    const parsedAnswer = answer ? parseInputValue(answer) : "";
    if (
      !parsedAnswer ||
      parsedAnswer.trim() === "" ||
      isNaN(Number(parsedAnswer))
    ) {
      setError(
        `Please enter a valid answer for question ${currentRevealQuestion}`
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/quiz/host/${hostId}/question/${currentRevealQuestion}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correctAnswer: Number(parsedAnswer) }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reveal question");
        return;
      }

      // Add to question results
      setQuestionResults((prev) => [...prev, data]);
    } catch (err) {
      setError("Failed to reveal question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setCurrentRevealQuestion((prev) => prev + 1);
    setError("");
  };

  const handleChangeCurrentQuestion = async (newQuestion: number) => {
    if (!party) return;
    if (newQuestion < 1 || newQuestion > party.totalQuestions) return;

    try {
      const response = await fetch(
        `/api/quiz/host/${hostId}/current-question`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentQuestion: newQuestion }),
        }
      );

      if (response.ok) {
        setParty({ ...party, currentQuestion: newQuestion });
      }
    } catch (err) {
      console.error("Failed to update current question:", err);
    }
  };

  const handleStartEndQuiz = async () => {
    if (!party) return;

    // Update party status to FINISHED to lock all answers
    try {
      await fetch(`/api/quiz/host/${hostId}/current-question`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentQuestion: party.currentQuestion,
        }),
      });

      // Update status to FINISHED
      const response = await fetch(`/api/quiz/host/${hostId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINISHED" }),
      });

      if (response.ok) {
        setParty({ ...party, status: "FINISHED" });
      }
    } catch (err) {
      console.error("Failed to lock quiz:", err);
    }

    setShowEndQuizModal(true);
  };

  const handleFinishQuiz = async () => {
    setIsSubmitting(true);

    try {
      // Build correct answers map from revealed questions
      const answersToSubmit: Record<string, number> = {};
      questionResults.forEach((result) => {
        answersToSubmit[result.questionNumber.toString()] =
          result.correctAnswer;
      });

      const response = await fetch(`/api/quiz/host/${hostId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctAnswers: answersToSubmit }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to finish quiz");
        return;
      }

      setLeaderboard(data.leaderboard);
      setCorrectAnswersMap(data.correctAnswers);
      setShowEndQuizModal(false);
      setQuestionResults([]);
      setCurrentRevealQuestion(1);

      // Update party status
      if (party) {
        setParty({ ...party, status: "FINISHED" });
      }
    } catch (err) {
      setError("Failed to finish quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
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
        <div className="text-xl text-red-600">{error || "Party not found"}</div>
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
            showQuestionBreakdown={true}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Quiz Master Dashboard</h1>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Party Code:</p>
            <p className="text-4xl font-bold text-blue-600 tracking-wider">
              {party.code}
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Question</h2>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">
                  {party.currentQuestion}
                </span>
                <button
                  onClick={() =>
                    handleChangeCurrentQuestion(party.currentQuestion + 1)
                  }
                  disabled={party.currentQuestion >= party.totalQuestions}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Answer Status ({contestants.length} contestants)
            </h2>

            {contestants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No contestants yet. Share code{" "}
                <span className="font-bold text-blue-600">{party.code}</span> to
                get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Name</th>
                      {Array.from(
                        { length: party.totalQuestions },
                        (_, i) => i + 1
                      ).map((q) => (
                        <th key={q} className="text-center py-2 px-1 w-8">
                          {q}
                        </th>
                      ))}
                      <th className="text-center py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contestants.map((contestant) => (
                      <tr key={contestant.id} className="border-b">
                        <td className="py-2 px-2 font-medium">
                          {contestant.name}
                        </td>
                        {Array.from(
                          { length: party.totalQuestions },
                          (_, i) => i + 1
                        ).map((q) => (
                          <td key={q} className="text-center py-2 px-1">
                            {contestant.answeredQuestions.includes(q) ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        ))}
                        <td className="text-center py-2 px-2 font-semibold">
                          {contestant.totalAnswered}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {party.currentQuestion === party.totalQuestions && (
            <button
              onClick={() => {
                // Check if all contestants have answered all questions
                const allQuestionsAnswered = contestants.every((contestant) => {
                  const expectedQuestions = Array.from(
                    { length: party.totalQuestions },
                    (_, i) => i + 1
                  );
                  return (
                    contestant.answeredQuestions.length ===
                      party.totalQuestions &&
                    expectedQuestions.every((q) =>
                      contestant.answeredQuestions.includes(q)
                    )
                  );
                });

                if (!allQuestionsAnswered && contestants.length > 0) {
                  // Show confirmation modal if not all questions are answered
                  setShowConfirmModal(true);
                } else {
                  // Proceed directly to end quiz modal
                  handleStartEndQuiz();
                }
              }}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              End Quiz & Enter Answers
            </button>
          )}
        </div>

        {/* Confirmation Modal for Unanswered Questions */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Confirm End Quiz</h2>
              <p className="text-gray-700 mb-6">
                Not all contestants have answered all questions. Are you sure
                you want to end the quiz?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleStartEndQuiz();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, end quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* End Quiz Modal - Progressive Reveal */}
        {showEndQuizModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg p-3 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Question {currentRevealQuestion} of {party.totalQuestions}
                  </h2>
                  <div className="text-xs sm:text-sm text-gray-500">
                    Progress: {questionResults.length}/{party.totalQuestions}
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (questionResults.length / party.totalQuestions) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Show previous results */}
              {questionResults.map((result) => (
                <div
                  key={result.questionNumber}
                  className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="font-bold text-base sm:text-lg">
                      Question {result.questionNumber}
                    </h3>
                    <div className="text-xs sm:text-sm">
                      Correct Answer:{" "}
                      <span className="font-bold text-green-600">
                        {result.correctAnswer.toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {result.playerAnswers.map((pa, idx) => {
                      const distance = Math.abs(
                        pa.answer - result.correctAnswer
                      );
                      const isTooHigh = pa.answer > result.correctAnswer;
                      const isTooLow = pa.answer < result.correctAnswer;
                      const percentDiff =
                        result.correctAnswer !== 0
                          ? ((distance / result.correctAnswer) * 100).toFixed(1)
                          : pa.answer === 0
                          ? "0"
                          : "∞";
                      return (
                        <div
                          key={pa.contestantId}
                          className="p-2 bg-white rounded border"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-400 text-sm">
                                #{idx + 1}
                              </span>
                              <span className="font-medium">{pa.name}</span>
                              <span className="text-gray-600">
                                → {pa.answer.toLocaleString("en-US")}
                              </span>
                            </div>
                            <div
                              className={`font-bold ${
                                pa.score >= 25
                                  ? "text-green-600"
                                  : pa.score >= 15
                                  ? "text-blue-600"
                                  : pa.score >= 10
                                  ? "text-yellow-600"
                                  : "text-gray-400"
                              }`}
                            >
                              {pa.score > 0 ? `+${pa.score}` : pa.score} pts
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 ml-6">
                            {distance === 0
                              ? "exact"
                              : isTooHigh
                              ? `${distance.toLocaleString("en-US")} too high`
                              : `${distance.toLocaleString("en-US")} too low`}
                            {result.correctAnswer !== 0 &&
                              distance > 0 &&
                              ` (${percentDiff}% off)`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Current question input - only show if we haven't revealed it yet */}
              {currentRevealQuestion <= party.totalQuestions &&
                questionResults.length < currentRevealQuestion && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                    <label className="block text-base sm:text-lg font-semibold text-gray-800 mb-2">
                      What is the correct answer for Question{" "}
                      {currentRevealQuestion}?
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatInputValue(
                        correctAnswers[currentRevealQuestion]
                      )}
                      onChange={(e) => {
                        const parsed = parseInputValue(e.target.value);
                        setCorrectAnswers((prev) => ({
                          ...prev,
                          [currentRevealQuestion]: parsed,
                        }));
                      }}
                      placeholder="Enter correct answer"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-lg"
                      autoFocus
                    />
                  </div>
                )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEndQuizModal(false);
                    setError("");
                    setQuestionResults([]);
                    setCurrentRevealQuestion(1);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <div className="flex-1" />

                {/* Show "Reveal Scores" if we haven't revealed the current question yet */}
                {questionResults.length === currentRevealQuestion - 1 &&
                  currentRevealQuestion <= party.totalQuestions && (
                    <button
                      onClick={handleRevealQuestion}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Revealing..." : "Reveal Scores"}
                    </button>
                  )}

                {/* Show "Next Question" if we just revealed current question but haven't moved to next */}
                {questionResults.length === currentRevealQuestion &&
                  currentRevealQuestion < party.totalQuestions && (
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Next Question →
                    </button>
                  )}

                {/* Show "Show Final Leaderboard" if we've revealed all questions */}
                {questionResults.length === party.totalQuestions &&
                  questionResults.length === currentRevealQuestion && (
                    <button
                      onClick={handleFinishQuiz}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting
                        ? "Calculating..."
                        : "Show Final Leaderboard"}
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
