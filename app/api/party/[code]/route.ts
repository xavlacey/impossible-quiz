import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isValidPartyCode } from "@/lib/utils/codeGenerator";

type Params = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;

    if (!isValidPartyCode(code.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid party code format" },
        { status: 400 }
      );
    }

    const party = await prisma.party.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        code: true,
        status: true,
        totalQuestions: true,
        currentQuestion: true,
        createdAt: true,
        _count: {
          select: {
            contestants: true,
          },
        },
      },
    });

    if (!party) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: party.code,
      status: party.status,
      totalQuestions: party.totalQuestions,
      currentQuestion: party.currentQuestion,
      contestantCount: party._count.contestants,
      createdAt: party.createdAt,
    });
  } catch (error) {
    console.error("Error fetching party:", error);
    return NextResponse.json(
      { error: "Failed to fetch party" },
      { status: 500 }
    );
  }
}
