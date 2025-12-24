"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [totalQuestions, setTotalQuestions] = useState<number | "">(10);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateParty = async () => {
    setError("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/party/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalQuestions }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Home] Error creating party:", {
          status: response.status,
          error: data.error,
          details: data.details,
          fullData: data,
        });
        setError(data.error || data.details || "Failed to create party");
        return;
      }

      // Store hostId in sessionStorage
      sessionStorage.setItem("hostId", data.hostId);

      // Redirect to host dashboard
      router.push(`/quiz/host/${data.hostId}`);
    } catch (err) {
      console.error("[Home] Exception in handleCreateParty:", {
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        errorName: err instanceof Error ? err.name : undefined,
      });
      setError(
        `Failed to create party: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!showNameInput) {
      // First step: validate code and show name input
      if (!joinCode || joinCode.trim().length !== 4) {
        setError("Please enter a valid 4-character code");
        return;
      }
      setShowNameInput(true);
      return;
    }

    // Second step: join with name
    if (!name || name.trim().length === 0) {
      setError("Please enter your name");
      return;
    }

    setIsJoining(true);

    try {
      const response = await fetch("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to join party");
        return;
      }

      // Store contestantId in sessionStorage
      sessionStorage.setItem("contestantId", data.contestantId);

      // Redirect to player view
      router.push(`/quiz/player/${data.contestantId}`);
    } catch (err) {
      setError("Failed to join party. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 font-typewriter tracking-widest">
          THE IMPOSSIBLE QUIZ
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <HostQuizButton
            setShowCreateModal={setShowCreateModal}
            isCreating={isCreating}
          />

          <Divider />
          <CodeEntry
            handleJoinParty={handleJoinParty}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            showNameInput={showNameInput}
            name={name}
            setName={setName}
            isJoining={isJoining}
          />
        </div>
      </div>

      {showCreateModal && (
        <CreatePartyModal
          totalQuestions={totalQuestions}
          setTotalQuestions={setTotalQuestions}
          setShowCreateModal={setShowCreateModal}
          handleCreateParty={handleCreateParty}
          isCreating={isCreating}
        />
      )}
    </main>
  );
}

function HostQuizButton({
  setShowCreateModal,
  isCreating,
}: {
  setShowCreateModal: (showCreateModal: boolean) => void;
  isCreating: boolean;
}) {
  // TODO: set default font somewhere
  return (
    <button
      onClick={() => setShowCreateModal(true)}
      disabled={isCreating}
      className="w-full bg-cyan-800 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-cyan-700 hover:cursor-pointer transition disabled:opacity-50 font-typewriter tracking-widest"
    >
      {isCreating ? "CREATING..." : "HOST QUIZ"}
    </button>
  );
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-orange-100 text-gray-500">or</span>
      </div>
    </div>
  );
}

function CodeEntry({
  handleJoinParty,
  joinCode,
  setJoinCode,
  showNameInput,
  name,
  setName,
  isJoining,
}: {
  handleJoinParty: (e: React.FormEvent) => Promise<void>;
  joinCode: string;
  setJoinCode: (joinCode: string) => void;
  showNameInput: boolean;
  name: string;
  setName: (name: string) => void;
  isJoining: boolean;
}) {
  return (
    <form
      onSubmit={handleJoinParty}
      className="space-y-2 font-typewriter tracking-widest"
    >
      <input
        type="text"
        placeholder="Enter party code"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
        className="w-full px-4 py-3 border text-lg border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        maxLength={4}
      />

      {showNameInput && (
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          maxLength={50}
          autoFocus
        />
      )}

      <button
        type="submit"
        disabled={isJoining}
        className="w-full bg-green-800 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-green-700 hover:cursor-pointer transition disabled:opacity-50"
      >
        {isJoining ? "JOINING..." : showNameInput ? "JOIN" : "CONTINUE"}
      </button>
    </form>
  );
}

function CreatePartyModal({
  totalQuestions,
  setTotalQuestions,
  setShowCreateModal,
  handleCreateParty,
  isCreating,
}: {
  totalQuestions: number | "";
  setTotalQuestions: (totalQuestions: number | "") => void;
  setShowCreateModal: (showCreateModal: boolean) => void;
  handleCreateParty: () => Promise<void>;
  isCreating: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Create quiz</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of questions
          </label>
          <input
            type="number"
            value={totalQuestions}
            onChange={(e) => setTotalQuestions(Number(e.target.value) || "")}
            min="1"
            max="50"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowCreateModal(false);
              handleCreateParty();
            }}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
