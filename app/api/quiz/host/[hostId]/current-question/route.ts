import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

type Params = {
  params: Promise<{
    hostId: string;
  }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { hostId } = await params;
    const body = await request.json();
    const { currentQuestion } = body;

    if (!currentQuestion || currentQuestion < 1) {
      return NextResponse.json(
        { error: "Invalid question number" },
        { status: 400 }
      );
    }

    const party = await prisma.party.findUnique({
      where: { hostId },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    if (currentQuestion > party.totalQuestions) {
      return NextResponse.json(
        {
          error: `Question number must be between 1 and ${party.totalQuestions}`,
        },
        { status: 400 }
      );
    }

    const updatedParty = await prisma.party.update({
      where: { hostId },
      data: { currentQuestion },
    });

    // Trigger Pusher event for real-time question navigation
    try {
      await pusherServer.trigger(
        `party-${updatedParty.id}`,
        "question-changed",
        { currentQuestion }
      );
    } catch (pusherError) {
      console.error("Error triggering Pusher event:", pusherError);
      // Don't fail the request if Pusher fails - the DB update succeeded
    }

    return NextResponse.json({
      success: true,
      currentQuestion,
    });
  } catch (error) {
    console.error("Error updating current question:", error);
    return NextResponse.json(
      { error: "Failed to update current question" },
      { status: 500 }
    );
  }
}
