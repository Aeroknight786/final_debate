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

      // Status discipline:
      // - "deferred" is a parking action, not progress. A belief in
      //   `deferred` may NOT be silently bumped to `weakened` by a stray
      //   extraction; it must first re-enter `under_challenge`.
      // - Otherwise progress only forward along the lifecycle.
      const progressOrder = [
        "active",
        "under_challenge",
        "weakened",
        "resolved",
      ];
      const isDeferred = existing.status === "deferred";
      if (isDeferred) {
        if (extracted.status === "under_challenge") {
          updates.status = "under_challenge";
        }
        // weakened/resolved/active from a deferred state are ignored —
        // the model must re-engage the belief explicitly.
      } else {
        const currentIdx = progressOrder.indexOf(existing.status);
        const newIdx = progressOrder.indexOf(extracted.status);
        if (currentIdx >= 0 && newIdx > currentIdx) {
          updates.status = extracted.status;
        }
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

/**
 * Three honest buckets for the UI and for prompt context:
 * - underExamination: live debate work (active, under_challenge, weakened)
 * - deferred: explicitly parked for a later module
 * - cracked: resolved
 *
 * The brief: the system should make unresolved tension visible, not pretend
 * every module ends in clean agreement. Lumping deferred into "active" hides
 * the parking lot.
 */
export async function getBeliefsByBucket(userId: string) {
  const all = await prisma.belief.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const underExamination = all.filter((b) =>
    ["active", "under_challenge", "weakened"].includes(b.status)
  );
  const deferred = all.filter((b) => b.status === "deferred");
  const cracked = all.filter((b) => b.status === "resolved");

  return { underExamination, deferred, cracked };
}
