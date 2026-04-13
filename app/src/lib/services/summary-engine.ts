import { prisma } from "../db";
import { jsonCompletion, LLMMessage } from "../llm";
import { SUMMARY_PROMPT } from "../prompts/system";

interface SummaryLearning {
  original_belief: string;
  contradiction: string;
  corrected_frame: string;
  related_belief_labels: string[];
  strength: "strong" | "medium" | "weak";
}

interface SummaryResult {
  summary: string;
  learnings?: SummaryLearning[];
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

  // Persist any genuine shifts as Learning rows linked back to the
  // beliefs they undermined. The brief is explicit: do not invent shifts;
  // if the model returns an empty learnings array, write nothing.
  if (result.learnings && result.learnings.length > 0) {
    for (const l of result.learnings) {
      // Resolve canonical labels to belief ids for this user.
      const labels = (l.related_belief_labels ?? []).filter(Boolean);
      const relatedBeliefs = labels.length
        ? await prisma.belief.findMany({
            where: { userId, canonicalLabel: { in: labels } },
            select: { id: true },
          })
        : [];

      await prisma.learning.create({
        data: {
          userId,
          moduleId,
          summary: l.corrected_frame,
          originalBelief: l.original_belief || null,
          contradiction: l.contradiction || null,
          strength: ["strong", "medium", "weak"].includes(l.strength)
            ? l.strength
            : "medium",
          relatedBeliefIds: relatedBeliefs.length
            ? JSON.stringify(relatedBeliefs.map((b) => b.id))
            : null,
        },
      });
    }
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
