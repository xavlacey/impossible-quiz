import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

type Params = {
  params: Promise<{
    contestantId: string;
  }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { contestantId } = await params;
    const body = await request.json();
    const { questionNumber, value } = body;

    // Validate input
    if (!questionNumber || questionNumber < 1) {
      return NextResponse.json(
        { error: "Invalid question number" },
        { status: 400 }
      );
    }

    // Get contestant and party info
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: { party: true },
    });

    if (!contestant) {
      return NextResponse.json(
        { error: "Contestant not found" },
        { status: 404 }
      );
    }

    // Check if quiz is finished
    if (contestant.party.status === "FINISHED") {
      return NextResponse.json({ error: "Quiz has ended" }, { status: 400 });
    }

    // Validate question number is within range
    if (questionNumber > contestant.party.totalQuestions) {
      return NextResponse.json(
        {
          error: `Question number must be between 1 and ${contestant.party.totalQuestions}`,
        },
        { status: 400 }
      );
    }

    // Handle answer deletion (when value is null, undefined, empty string, or NaN)
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      isNaN(Number(value))
    ) {
      // Delete the answer if it exists
      await prisma.answer.deleteMany({
        where: {
          partyId: contestant.partyId,
          contestantId: contestantId,
          questionNumber: questionNumber,
        },
      });

      // Trigger Pusher event for answer deletion
      await pusherServer.trigger(
        `party-${contestant.partyId}`,
        "answer-deleted",
        {
          contestantId: contestantId,
          questionNumber: questionNumber,
        }
      );

      return NextResponse.json({
        success: true,
        deleted: true,
      });
    }

    // Upsert answer (create or update)
    const answer = await prisma.answer.upsert({
      where: {
        partyId_contestantId_questionNumber: {
          partyId: contestant.partyId,
          contestantId: contestantId,
          questionNumber: questionNumber,
        },
      },
      create: {
        partyId: contestant.partyId,
        contestantId: contestantId,
        questionNumber: questionNumber,
        value: Number(value),
      },
      update: {
        value: Number(value),
      },
    });

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(
      `party-${contestant.partyId}`,
      "answer-submitted",
      {
        contestantId: contestantId,
        questionNumber: questionNumber,
      }
    );

    return NextResponse.json({
      success: true,
      answer: {
        questionNumber: answer.questionNumber,
        value: answer.value,
        updatedAt: answer.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
