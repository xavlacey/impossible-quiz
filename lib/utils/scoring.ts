type AnswerWithContestant = {
  contestantId: string;
  contestantName: string;
  value: number;
};

type ScoreResult = {
  contestantId: string;
  contestantName: string;
  score: number;
};

/**
 * Calculates scores for a single question
 * - Nearest answer(s): 10 points
 * - Within ±10% of correct answer: 15 points
 * - Both: 25 points total
 */
export function calculateQuestionScores(
  answers: AnswerWithContestant[],
  correctAnswer: number
): ScoreResult[] {
  if (answers.length === 0) return [];

  // Calculate distances and find minimum
  const distances = answers.map((a) => ({
    ...a,
    distance: Math.abs(a.value - correctAnswer),
  }));

  const minDistance = Math.min(...distances.map((d) => d.distance));

  // Score each answer
  return distances.map((d) => {
    let score = 0;

    // Within ±10%: 15 points
    const percentDiff =
      correctAnswer !== 0
        ? Math.abs((d.value - correctAnswer) / correctAnswer) * 100
        : d.value === 0
        ? 0
        : 100;

    if (percentDiff <= 10) {
      score += 15;
    }

    // Nearest answer: 10 points (can be multiple if tied)
    if (d.distance === minDistance) {
      score += 10;
    }

    return {
      contestantId: d.contestantId,
      contestantName: d.contestantName,
      score,
    };
  });
}

export type LeaderboardEntry = {
  contestantId: string;
  contestantName: string;
  totalScore: number;
  questionScores: number[]; // Score for each question
};

/**
 * Calculates final scores across all questions
 */
export function calculateFinalScores(
  allAnswers: Array<{
    questionNumber: number;
    contestantId: string;
    contestantName: string;
    value: number;
  }>,
  correctAnswers: Record<number, number>,
  totalQuestions: number
): LeaderboardEntry[] {
  const scoresByContestant = new Map<
    string,
    {
      name: string;
      total: number;
      questionScores: number[];
    }
  >();

  // Initialize all contestants
  const uniqueContestants = new Map<string, string>();
  allAnswers.forEach((a) => {
    uniqueContestants.set(a.contestantId, a.contestantName);
  });

  uniqueContestants.forEach((name, id) => {
    scoresByContestant.set(id, {
      name,
      total: 0,
      questionScores: Array(totalQuestions).fill(0),
    });
  });

  // Calculate score for each question
  for (let q = 1; q <= totalQuestions; q++) {
    const correctAnswer = correctAnswers[q];
    if (correctAnswer === undefined || correctAnswer === null) continue;

    const questionAnswers = allAnswers
      .filter((a) => a.questionNumber === q)
      .map((a) => ({
        contestantId: a.contestantId,
        contestantName: a.contestantName,
        value: a.value,
      }));

    const scores = calculateQuestionScores(questionAnswers, correctAnswer);

    scores.forEach((s) => {
      const contestant = scoresByContestant.get(s.contestantId);
      if (contestant) {
        contestant.total += s.score;
        contestant.questionScores[q - 1] = s.score;
      }
    });
  }

  // Convert to array and sort by total score (descending)
  return Array.from(scoresByContestant.entries())
    .map(([id, data]) => ({
      contestantId: id,
      contestantName: data.name,
      totalScore: data.total,
      questionScores: data.questionScores,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}
