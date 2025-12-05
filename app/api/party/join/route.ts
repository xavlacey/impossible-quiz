import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isValidPartyCode } from "@/lib/utils/codeGenerator";
import { pusherServer } from "@/lib/pusher/server";
import { PartyStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name } = body;

    // Validate input
    if (!code || !isValidPartyCode(code.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid party code format" },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: "Name must be 50 characters or less" },
        { status: 400 }
      );
    }

    const normalizedCode = code.toUpperCase();
    const trimmedName = name.trim();

    console.log(
      "[/api/party/join] Searching for party with code:",
      normalizedCode
    );

    // Find party
    const party = await prisma.party.findUnique({
      where: { code: normalizedCode },
      include: {
        contestants: {
          where: {
            name: trimmedName,
          },
        },
      },
    });

    console.log(
      "[/api/party/join] Party found:",
      party ? `Yes (${party.code})` : "No"
    );

    if (!party) {
      // Debug: List all parties
      const allParties = await prisma.party.findMany({
        select: { code: true },
      });
      console.log(
        "[/api/party/join] All party codes in DB:",
        allParties.map((p) => p.code)
      );

      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    // Check if party is finished
    if (party.status === "FINISHED") {
      return NextResponse.json(
        { error: "This quiz has already finished" },
        { status: 400 }
      );
    }

    // Check if name is already taken
    if (party.contestants.length > 0) {
      return NextResponse.json(
        { error: "Name already taken in this party" },
        { status: 409 }
      );
    }

    // Create contestant
    const contestant = await prisma.contestant.create({
      data: {
        name: trimmedName,
        partyId: party.id,
      },
    });

    // Update party status to ACTIVE if it was in LOBBY
    let finalPartyStatus: PartyStatus = party.status;
    if (party.status === "LOBBY") {
      const updatedParty = await prisma.party.update({
        where: { id: party.id },
        data: { status: "ACTIVE" },
      });
      finalPartyStatus = updatedParty.status;
    }

    // Trigger Pusher event to notify host of new contestant
    await pusherServer.trigger(`party-${party.id}`, "contestant-joined", {
      contestant: {
        id: contestant.id,
        name: contestant.name,
        answeredQuestions: [],
        totalAnswered: 0,
      },
      partyStatus: finalPartyStatus as string,
    });

    return NextResponse.json({
      contestantId: contestant.id,
      partyId: party.id,
      code: party.code,
      totalQuestions: party.totalQuestions,
      currentQuestion: party.currentQuestion,
    });
  } catch (error) {
    console.error("Error joining party:", error);
    return NextResponse.json(
      { error: "Failed to join party" },
      { status: 500 }
    );
  }
}
