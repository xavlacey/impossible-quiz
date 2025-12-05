import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

type Params = {
  params: Promise<{
    hostId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { hostId } = await params;

    const party = await prisma.party.findUnique({
      where: { hostId },
      include: {
        contestants: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    // Build answer status for each contestant
    const contestants = party.contestants.map((contestant) => {
      const answeredQuestions = contestant.answers.map((a) => a.questionNumber);
      return {
        id: contestant.id,
        name: contestant.name,
        answeredQuestions,
        totalAnswered: answeredQuestions.length,
      };
    });

    return NextResponse.json({
      party: {
        id: party.id,
        code: party.code,
        status: party.status,
        currentQuestion: party.currentQuestion,
        totalQuestions: party.totalQuestions,
      },
      contestants,
    });
  } catch (error) {
    console.error("Error fetching host status:", error);
    return NextResponse.json(
      { error: "Failed to fetch party status" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { hostId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["LOBBY", "ACTIVE", "FINISHED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const party = await prisma.party.findUnique({
      where: { hostId },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    const updatedParty = await prisma.party.update({
      where: { hostId },
      data: { status },
    });

    // Trigger Pusher event for real-time status updates
    await pusherServer.trigger(
      `party-${updatedParty.id}`,
      "quiz-status-changed",
      {
        status,
      }
    );

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error("Error updating party status:", error);
    return NextResponse.json(
      { error: "Failed to update party status" },
      { status: 500 }
    );
  }
}
