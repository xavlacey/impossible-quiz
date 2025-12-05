import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type Params = {
  params: Promise<{
    contestantId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { contestantId } = await params;

    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        party: true,
        answers: {
          orderBy: { questionNumber: "asc" },
        },
      },
    });

    if (!contestant) {
      return NextResponse.json(
        { error: "Contestant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      party: {
        id: contestant.party.id,
        code: contestant.party.code,
        status: contestant.party.status,
        currentQuestion: contestant.party.currentQuestion,
        totalQuestions: contestant.party.totalQuestions,
      },
      contestant: {
        id: contestant.id,
        name: contestant.name,
      },
      answers: contestant.answers.map((a) => ({
        questionNumber: a.questionNumber,
        value: a.value,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching answers:", error);
    return NextResponse.json(
      { error: "Failed to fetch answers" },
      { status: 500 }
    );
  }
}
