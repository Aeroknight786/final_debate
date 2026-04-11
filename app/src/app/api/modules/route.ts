import { NextRequest, NextResponse } from "next/server";
import { getModuleStates, advanceModule, assessReadiness } from "@/lib/services/stage-governor";

export const dynamic = "force-dynamic";
import { getConversationHistory } from "@/lib/services/conversation";
import { LLMMessage } from "@/lib/llm";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const modules = await getModuleStates(userId);
    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Modules fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
}

// Assess readiness and optionally advance
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (action === "assess") {
      const messages = await getConversationHistory(userId);
      const llmMessages: LLMMessage[] = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      const assessment = await assessReadiness(userId, llmMessages);
      return NextResponse.json({ assessment });
    }

    if (action === "advance") {
      const success = await advanceModule(userId);
      if (success) {
        const modules = await getModuleStates(userId);
        return NextResponse.json({ advanced: true, modules });
      }
      return NextResponse.json({ advanced: false, reason: "Cannot advance" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Module action error:", error);
    return NextResponse.json(
      { error: "Failed to process module action" },
      { status: 500 }
    );
  }
}
