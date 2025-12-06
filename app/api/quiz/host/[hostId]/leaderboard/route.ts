import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateFinalScores } from "@/lib/utils/scoring";

type Params = {
  params: Promise<{
    hostId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { hostId } = await params;

    const party = await prisma.party.findUnique({
      where: { hostId },
      include: {
        contestants: true,
        answers: {
          include: {
            contestant: true,
          },
        },
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    if (party.status !== "FINISHED") {
      return NextResponse.json(
        { error: "Quiz not finished yet" },
        { status: 400 }
      );
    }

    if (!party.correctAnswers) {
      return NextResponse.json(
        { error: "No correct answers recorded" },
        { status: 400 }
      );
    }

    const correctAnswersMap = JSON.parse(party.correctAnswers as string);

    const answersForScoring = party.answers.map((a) => ({
      questionNumber: a.questionNumber,
      contestantId: a.contestantId,
      contestantName: a.contestant.name,
      value: a.value,
    }));

    const leaderboard = calculateFinalScores(
      answersForScoring,
      correctAnswersMap,
      party.totalQuestions
    );

    return NextResponse.json({
      leaderboard,
      correctAnswers: correctAnswersMap,
      party: {
        code: party.code,
        totalQuestions: party.totalQuestions,
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
