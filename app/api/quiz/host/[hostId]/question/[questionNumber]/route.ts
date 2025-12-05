import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateQuestionScores } from "@/lib/utils/scoring";

type Params = {
  params: Promise<{
    hostId: string;
    questionNumber: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { hostId, questionNumber } = await params;
    const body = await request.json();
    const { correctAnswer } = body;

    const qNum = parseInt(questionNumber);

    if (isNaN(qNum) || qNum < 1) {
      return NextResponse.json(
        { error: "Invalid question number" },
        { status: 400 }
      );
    }

    if (correctAnswer === undefined || correctAnswer === null || isNaN(Number(correctAnswer))) {
      return NextResponse.json(
        { error: "Valid correct answer is required" },
        { status: 400 }
      );
    }

    const party = await prisma.party.findUnique({
      where: { hostId },
      include: {
        answers: {
          where: { questionNumber: qNum },
          include: { contestant: true },
        },
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    // Calculate scores for this question
    const answersForScoring = party.answers.map((a) => ({
      contestantId: a.contestantId,
      contestantName: a.contestant.name,
      value: a.value,
    }));

    const scores = calculateQuestionScores(answersForScoring, Number(correctAnswer));

    // Format results
    const playerAnswers = scores.map((s) => ({
      contestantId: s.contestantId,
      name: s.contestantName,
      answer: answersForScoring.find((a) => a.contestantId === s.contestantId)?.value || 0,
      score: s.score,
    }));

    // Sort by score (highest first), then by answer (closest to correct)
    playerAnswers.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Math.abs(a.answer - Number(correctAnswer)) - Math.abs(b.answer - Number(correctAnswer));
    });

    return NextResponse.json({
      questionNumber: qNum,
      correctAnswer: Number(correctAnswer),
      playerAnswers,
    });
  } catch (error) {
    console.error("Error calculating question scores:", error);
    return NextResponse.json(
      { error: "Failed to calculate scores" },
      { status: 500 }
    );
  }
}
