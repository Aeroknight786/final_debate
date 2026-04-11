import { prisma } from "../db";
import { jsonCompletion, LLMMessage } from "../llm";
import { SUMMARY_PROMPT } from "../prompts/system";

interface SummaryResult {
  summary: string;
  beliefs_updated: Array<{
    canonical_label: string;
    new_status: string;
    reason: string;
  }>;
  next_actions: string[];
  engagement_level: string;
}

export async function generateSessionSummary(
  userId: string,
  conversationId: string,
  moduleId: string,
  messages: LLMMessage[]
): Promise<void> {
  if (messages.length < 4) return; // Not enough conversation to summarize

  const conversationText = messages
    .slice(-20) // Last 20 messages for context
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  let result: SummaryResult;
  try {
    result = await jsonCompletion<SummaryResult>(
      SUMMARY_PROMPT,
      [{ role: "user", content: conversationText }],
      { maxTokens: 1024 }
    );
  } catch {
    return;
  }

  // Upsert the session summary
  const existing = await prisma.sessionSummary.findUnique({
    where: { conversationId },
  });

  if (existing) {
    await prisma.sessionSummary.update({
      where: { id: existing.id },
      data: {
        summaryText: result.summary,
        beliefsUpdated: JSON.stringify(result.beliefs_updated),
        nextActions: JSON.stringify(result.next_actions),
      },
    });
  } else {
    await prisma.sessionSummary.create({
      data: {
        userId,
        conversationId,
        currentModule: moduleId,
        summaryText: result.summary,
        beliefsUpdated: JSON.stringify(result.beliefs_updated),
        nextActions: JSON.stringify(result.next_actions),
      },
    });
  }
}

export async function getLatestSummary(
  userId: string
): Promise<string | null> {
  const summary = await prisma.sessionSummary.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return summary?.summaryText ?? null;
}

export async function getUserLearnings(userId: string) {
  return prisma.learning.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addLearning(
  userId: string,
  moduleId: string,
  summary: string,
  strength: string = "medium",
  evidence?: string[]
): Promise<void> {
  await prisma.learning.create({
    data: {
      userId,
      moduleId,
      summary,
      strength,
      evidence: evidence ? JSON.stringify(evidence) : null,
    },
  });
}
