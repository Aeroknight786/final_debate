import { NextRequest, NextResponse } from "next/server";
import { sendMessage, startProgram, getConversationHistory } from "@/lib/services/conversation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, message } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await sendMessage(userId, message);
    return NextResponse.json({
      response: result.response,
      moduleId: result.moduleId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const moduleId = req.nextUrl.searchParams.get("moduleId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const messages = await getConversationHistory(userId, moduleId || undefined);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Chat history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// Start the program (get opening message)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const openingMessage = await startProgram(userId);
    return NextResponse.json({ response: openingMessage });
  } catch (error) {
    console.error("Start program error:", error);
    return NextResponse.json(
      { error: "Failed to start program" },
      { status: 500 }
    );
  }
}
