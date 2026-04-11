import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { isRitualEligible } from "@/lib/services/stage-governor";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const eligible = await isRitualEligible(userId);
    const ritualEvent = await prisma.ritualEvent.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      eligible,
      ritual: ritualEvent,
    });
  } catch (error) {
    console.error("Ritual check error:", error);
    return NextResponse.json(
      { error: "Failed to check ritual status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, statementText } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const eligible = await isRitualEligible(userId);
    if (!eligible) {
      return NextResponse.json(
        { error: "Not yet eligible for the final ritual" },
        { status: 403 }
      );
    }

    if (action === "begin") {
      const ritual = await prisma.ritualEvent.upsert({
        where: { userId },
        update: { eligible: true, eligibleAt: new Date() },
        create: {
          userId,
          eligible: true,
          eligibleAt: new Date(),
        },
      });
      return NextResponse.json({ ritual });
    }

    if (action === "complete") {
      const ritual = await prisma.ritualEvent.update({
        where: { userId },
        data: {
          completedAt: new Date(),
          confirmedFinal: true,
          statementText: statementText || null,
        },
      });

      // Mark user program as completed
      await prisma.user.update({
        where: { id: userId },
        data: { programStatus: "completed" },
      });

      return NextResponse.json({ ritual, programCompleted: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Ritual action error:", error);
    return NextResponse.json(
      { error: "Failed to process ritual action" },
      { status: 500 }
    );
  }
}
