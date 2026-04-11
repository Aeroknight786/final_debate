import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/services/conversation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await getOrCreateUser(body.userId);
    return NextResponse.json({ userId: user.id, currentModule: user.currentModule });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
