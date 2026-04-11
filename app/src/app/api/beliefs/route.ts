import { NextRequest, NextResponse } from "next/server";
import { getUserBeliefs } from "@/lib/services/belief-tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const beliefs = await getUserBeliefs(userId);
    return NextResponse.json({ beliefs });
  } catch (error) {
    console.error("Beliefs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch beliefs" },
      { status: 500 }
    );
  }
}
