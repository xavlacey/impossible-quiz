import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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
