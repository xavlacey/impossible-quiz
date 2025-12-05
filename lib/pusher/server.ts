import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Event types for type safety
export type PusherEvents = {
  "answer-submitted": {
    contestantId: string;
    questionNumber: number;
  };
  "answer-deleted": {
    contestantId: string;
    questionNumber: number;
  };
  "quiz-status-changed": {
    status: string;
  };
  "question-changed": {
    currentQuestion: number;
  };
  "contestant-joined": {
    contestant: {
      id: string;
      name: string;
      answeredQuestions: number[];
      totalAnswered: number;
    };
    partyStatus: string;
  };
  "quiz-finished": {
    leaderboard: Array<{
      contestantId: string;
      contestantName: string;
      totalScore: number;
      questionScores: number[];
    }>;
    correctAnswers: Record<number, number>;
  };
};
