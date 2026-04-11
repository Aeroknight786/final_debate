import { NextRequest, NextResponse } from "next/server";
import { getUserLearnings } from "@/lib/services/summary-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const learnings = await getUserLearnings(userId);
    return NextResponse.json({ learnings });
  } catch (error) {
    console.error("Learnings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnings" },
      { status: 500 }
    );
  }
}
