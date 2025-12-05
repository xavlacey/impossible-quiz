"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

export default function HostDashboard() {
  const params = useParams();
  const hostId = params.hostId as string;

  const [party, setParty] = useState<PartyData | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/quiz/host/${hostId}/status`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load party");
          return;
        }

        setParty(data.party);
        setContestants(data.contestants);
      } catch (err) {
        setError("Failed to load party data");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Poll every 2 seconds for updates
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [hostId]);

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
                <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
                  ◀
                </button>
                <span className="text-xl font-bold">{party.currentQuestion}</span>
                <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
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
                No contestants yet. Share code <span className="font-bold text-blue-600">{party.code}</span> to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Name</th>
                      {Array.from({ length: party.totalQuestions }, (_, i) => i + 1).map((q) => (
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
                        <td className="py-2 px-2 font-medium">{contestant.name}</td>
                        {Array.from({ length: party.totalQuestions }, (_, i) => i + 1).map((q) => (
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

          <button className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition">
            End Quiz & Enter Answers
          </button>
        </div>
      </div>
    </main>
  );
}
