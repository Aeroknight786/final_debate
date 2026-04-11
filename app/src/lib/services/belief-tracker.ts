import { prisma } from "../db";
import { jsonCompletion, LLMMessage } from "../llm";
import { BELIEF_EXTRACTION_PROMPT } from "../prompts/system";

interface ExtractedBelief {
  canonical_label: string;
  label: string;
  user_wording: string;
  confidence: "high" | "medium" | "low";
  status: "active" | "under_challenge" | "weakened" | "resolved";
  contradiction: string | null;
}

interface BeliefExtractionResult {
  beliefs: ExtractedBelief[];
  contradictions: string[];
}

export async function extractAndUpdateBeliefs(
  userId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  const messages: LLMMessage[] = [
    {
      role: "user",
      content: `User said: "${userMessage}"\n\nAssistant responded: "${assistantMessage}"`,
    },
  ];

  let result: BeliefExtractionResult;
  try {
    result = await jsonCompletion<BeliefExtractionResult>(
      BELIEF_EXTRACTION_PROMPT,
      messages,
      { maxTokens: 1024 }
    );
  } catch {
    // Extraction failed, skip silently rather than blocking the conversation
    return;
  }

  if (!result.beliefs || result.beliefs.length === 0) return;

  for (const extracted of result.beliefs) {
    const existing = await prisma.belief.findFirst({
      where: {
        userId,
        canonicalLabel: extracted.canonical_label,
      },
    });

    if (existing) {
      // Update existing belief
      const updates: Record<string, unknown> = {
        lastReviewedAt: new Date(),
      };

      // Only update status if it's progressing (not regressing)
      const statusOrder = ["active", "under_challenge", "weakened", "deferred", "resolved"];
      const currentIdx = statusOrder.indexOf(existing.status);
      const newIdx = statusOrder.indexOf(extracted.status);
      if (newIdx > currentIdx) {
        updates.status = extracted.status;
      }

      // Update confidence if it has decreased (progress)
      const confOrder = ["high", "medium", "low"];
      const currentConf = confOrder.indexOf(existing.confidence);
      const newConf = confOrder.indexOf(extracted.confidence);
      if (newConf > currentConf) {
        updates.confidence = extracted.confidence;
      }

      // Append new contradictions
      if (extracted.contradiction) {
        const existingContradictions = existing.contradictions
          ? JSON.parse(existing.contradictions)
          : [];
        if (!existingContradictions.includes(extracted.contradiction)) {
          existingContradictions.push(extracted.contradiction);
          updates.contradictions = JSON.stringify(existingContradictions);
        }
      }

      // Update user wording if we have a new one
      if (extracted.user_wording && !existing.userWording) {
        updates.userWording = extracted.user_wording;
      }

      await prisma.belief.update({
        where: { id: existing.id },
        data: updates,
      });
    } else {
      // Create new belief
      await prisma.belief.create({
        data: {
          userId,
          canonicalLabel: extracted.canonical_label,
          label: extracted.label,
          userWording: extracted.user_wording || null,
          confidence: extracted.confidence,
          status: extracted.status,
          contradictions: extracted.contradiction
            ? JSON.stringify([extracted.contradiction])
            : null,
        },
      });
    }
  }
}

export async function getUserBeliefs(userId: string) {
  return prisma.belief.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getActiveBeliefs(userId: string) {
  return prisma.belief.findMany({
    where: {
      userId,
      status: { in: ["active", "under_challenge", "weakened", "deferred"] },
    },
    orderBy: { updatedAt: "desc" },
  });
}
