import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generatePartyCode } from "@/lib/utils/codeGenerator";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    console.log("[/api/party/create] Received request");
    const body = await request.json();
    console.log("[/api/party/create] Request body:", body);
    const { totalQuestions } = body;

    // Validate input
    if (!totalQuestions || totalQuestions < 1 || totalQuestions > 50) {
      console.warn(
        "[/api/party/create] Invalid totalQuestions:",
        totalQuestions
      );
      return NextResponse.json(
        { error: "Total questions must be between 1 and 50" },
        { status: 400 }
      );
    }

    // Generate unique party code
    let code = generatePartyCode();
    let attempts = 0;
    const maxAttempts = 10;

    console.log("[/api/party/create] Attempting to generate unique party code");
    while (attempts < maxAttempts) {
      const existing = await prisma.party.findUnique({
        where: { code },
      });

      if (!existing) {
        console.log(
          `[/api/party/create] Found unique code "${code}" after ${attempts} attempts`
        );
        break;
      }
      console.warn(
        `[/api/party/create] Duplicate code "${code}" detected (attempt ${
          attempts + 1
        }), retrying`
      );
      code = generatePartyCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      console.error(
        "[/api/party/create] Failed to generate unique party code after max attempts"
      );
      return NextResponse.json(
        { error: "Failed to generate unique code. Please try again." },
        { status: 500 }
      );
    }

    // Generate unique hostId (secure random token)
    const hostId = randomBytes(32).toString("hex");
    console.log("[/api/party/create] Generated hostId:", hostId);

    // Create party
    console.log("[/api/party/create] Creating party in DB with code:", code);
    const party = await prisma.party.create({
      data: {
        code,
        hostId,
        totalQuestions,
      },
    });

    console.log("[/api/party/create] Party created:", {
      code: party.code,
      hostId: party.hostId,
      partyId: party.id,
      totalQuestions: party.totalQuestions,
    });

    // Return party info
    return NextResponse.json({
      code: party.code,
      hostId: party.hostId,
      partyId: party.id,
      totalQuestions: party.totalQuestions,
    });
  } catch (error) {
    console.error("Error creating party:", error);
    return NextResponse.json(
      { error: "Failed to create party" },
      { status: 500 }
    );
  }
}
