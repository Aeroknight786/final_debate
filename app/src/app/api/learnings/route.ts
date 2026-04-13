import { NextRequest, NextResponse } from "next/server";
import { getUserLearnings } from "@/lib/services/summary-engine";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const learnings = await getUserLearnings(userId);
    // Hydrate related beliefs so the UI can show "still resists" links
    // alongside the corrected frame without a second roundtrip.
    const beliefs = await prisma.belief.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        canonicalLabel: true,
        status: true,
      },
    });
    return NextResponse.json({ learnings, beliefs });
  } catch (error) {
    console.error("Learnings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnings" },
      { status: 500 }
    );
  }
}
