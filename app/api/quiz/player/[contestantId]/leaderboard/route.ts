import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateFinalScores } from "@/lib/utils/scoring";

type Params = {
  params: Promise<{
    contestantId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { contestantId } = await params;

    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        party: {
          include: {
            contestants: true,
            answers: {
              include: {
                contestant: true,
              },
            },
          },
        },
      },
    });

    if (!contestant) {
      return NextResponse.json(
        { error: "Contestant not found" },
        { status: 404 }
      );
    }

    if (contestant.party.status !== "FINISHED") {
      return NextResponse.json(
        { error: "Quiz not finished yet" },
        { status: 400 }
      );
    }

    if (!contestant.party.correctAnswers) {
      return NextResponse.json(
        { error: "No correct answers recorded" },
        { status: 400 }
      );
    }

    const correctAnswersMap = JSON.parse(
      contestant.party.correctAnswers as string
    );

    const answersForScoring = contestant.party.answers.map((a) => ({
      questionNumber: a.questionNumber,
      contestantId: a.contestantId,
      contestantName: a.contestant.name,
      value: a.value,
    }));

    const leaderboard = calculateFinalScores(
      answersForScoring,
      correctAnswersMap,
      contestant.party.totalQuestions
    );

    return NextResponse.json({
      leaderboard,
      correctAnswers: correctAnswersMap,
      party: {
        code: contestant.party.code,
        totalQuestions: contestant.party.totalQuestions,
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
