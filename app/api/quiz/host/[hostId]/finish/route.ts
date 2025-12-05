import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateFinalScores } from "@/lib/utils/scoring";
import { pusherServer } from "@/lib/pusher/server";

type Params = {
  params: Promise<{
    hostId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { hostId } = await params;
    const body = await request.json();
    const { correctAnswers } = body; // { "1": 42, "2": 100, ... }

    // Validate correct answers
    if (!correctAnswers || typeof correctAnswers !== "object") {
      return NextResponse.json(
        { error: "Correct answers are required" },
        { status: 400 }
      );
    }

    // Get party
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

    // Validate all questions have answers
    const correctAnswersMap: Record<number, number> = {};
    for (let q = 1; q <= party.totalQuestions; q++) {
      const answer = correctAnswers[q.toString()];
      if (answer === undefined || answer === null || isNaN(Number(answer))) {
        return NextResponse.json(
          { error: `Missing or invalid correct answer for question ${q}` },
          { status: 400 }
        );
      }
      correctAnswersMap[q] = Number(answer);
    }

    // Calculate scores
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

    // Update party status and save correct answers
    await prisma.party.update({
      where: { id: party.id },
      data: {
        status: "FINISHED",
        correctAnswers: JSON.stringify(correctAnswersMap),
      },
    });

    // Trigger Pusher event to notify contestants that quiz is finished with leaderboard
    await pusherServer.trigger(`party-${party.id}`, "quiz-finished", {
      leaderboard,
      correctAnswers: correctAnswersMap,
    });

    return NextResponse.json({
      success: true,
      leaderboard,
      correctAnswers: correctAnswersMap,
    });
  } catch (error) {
    console.error("Error finishing quiz:", error);
    return NextResponse.json(
      { error: "Failed to finish quiz" },
      { status: 500 }
    );
  }
}
