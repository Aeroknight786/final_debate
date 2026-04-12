import { prisma } from "../db";
import { jsonCompletion, LLMMessage } from "../llm";
import { READINESS_ASSESSMENT_PROMPT } from "../prompts/system";
import {
  getModule,
  getNextModule,
  MODULES,
  ModuleDefinition,
} from "../modules/definitions";

export interface ReadinessResult {
  ready: boolean;
  readiness_score: number;
  reason: string;
  covered_concepts?: string[];
  stress_tested_beliefs?: string[];
  unresolved_beliefs: string[];
  blockers: string[];
  suggested_action: string;
  // True when the rules pre-check alone is enough to block advancement,
  // before any model judgment is consulted.
  rules_blocked?: boolean;
}

export async function initializeModuleStates(userId: string): Promise<void> {
  for (const mod of MODULES) {
    const existing = await prisma.userModuleState.findUnique({
      where: { userId_moduleId: { userId, moduleId: mod.id } },
    });
    if (!existing) {
      await prisma.userModuleState.create({
        data: {
          userId,
          moduleId: mod.id,
          status: mod.order === 0 ? "active" : "locked",
        },
      });
    }
  }
}

export async function getCurrentModuleState(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const moduleState = await prisma.userModuleState.findUnique({
    where: { userId_moduleId: { userId, moduleId: user.currentModule } },
  });

  return {
    user,
    moduleState,
    module: getModule(user.currentModule),
  };
}

/**
 * Rules pre-check for module readiness.
 *
 * Returns a list of structured blockers. If the list is empty, the user
 * has cleared the hard gates and we can consult model judgment for the
 * final call. Otherwise, the user is not ready regardless of what the
 * model thinks, and the blockers should surface to the UI.
 */
async function runReadinessRules(
  userId: string,
  mod: ModuleDefinition,
  assistantHistory: string[]
): Promise<{ blockers: string[]; stressTested: string[] }> {
  const blockers: string[] = [];

  // Ritual and post-program modules have their own gating.
  if (mod.order >= 7) {
    return { blockers, stressTested: [] };
  }

  const beliefs = await prisma.belief.findMany({ where: { userId } });
  const inThisModule = beliefs.filter(
    (b) => !b.targetModule || b.targetModule === mod.id
  );

  // Rule 1: every target belief for this module has been confronted
  // (i.e. at least one row in under_challenge/weakened/deferred/resolved
  // exists under that canonical label OR its label). If the user never
  // even mentioned a target belief, we surface the specific gap.
  const confrontedStatuses = new Set([
    "under_challenge",
    "weakened",
    "deferred",
    "resolved",
  ]);
  const missing = mod.targetBeliefs.filter((tb) => {
    return !beliefs.some(
      (b) =>
        (b.canonicalLabel === tb || b.label.toLowerCase().includes(tb)) &&
        confrontedStatuses.has(b.status)
    );
  });
  if (missing.length > 0) {
    blockers.push(
      `Target beliefs not yet confronted: ${missing.join(", ")}`
    );
  }

  // Rule 2: at least ONE belief in this module has actually been
  // stress-tested (reached weakened or resolved).
  const stressTested = inThisModule
    .filter((b) => b.status === "weakened" || b.status === "resolved")
    .map((b) => b.canonicalLabel);
  if (stressTested.length === 0) {
    blockers.push(
      "No belief has been genuinely stress-tested yet (nothing has reached weakened or resolved)."
    );
  }

  // Rule 3: at least one of the module's derivative tests must have
  // been asked by the assistant. Match by significant substring overlap.
  if (mod.derivativeTests.length > 0) {
    const joined = assistantHistory.join("\n").toLowerCase();
    const anyDeployed = mod.derivativeTests.some((t) => {
      const needle = t
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5)
        .slice(0, 5)
        .join(" ");
      return needle.length > 0 && joined.includes(needle);
    });
    if (!anyDeployed) {
      // Softer match: look for any 4-word run from any derivative test
      const softHit = mod.derivativeTests.some((t) => {
        const words = t
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, " ")
          .split(/\s+/)
          .filter(Boolean);
        for (let i = 0; i + 4 <= words.length; i++) {
          const run = words.slice(i, i + 4).join(" ");
          if (joined.includes(run)) return true;
        }
        return false;
      });
      if (!softHit) {
        blockers.push(
          "No derivative belief test has been deployed yet for this module."
        );
      }
    }
  }

  // Rule 4: no active/under_challenge belief that clearly belongs to
  // this module may be left unresolved unless explicitly deferred.
  const hangingActive = inThisModule.filter(
    (b) => b.status === "active" || b.status === "under_challenge"
  );
  if (hangingActive.length > 0) {
    const labels = hangingActive.map((b) => b.canonicalLabel).join(", ");
    blockers.push(
      `Unresolved beliefs still open in this module (resolve, weaken, or formally defer): ${labels}`
    );
  }

  return { blockers, stressTested };
}

export async function assessReadiness(
  userId: string,
  conversationHistory: LLMMessage[]
): Promise<ReadinessResult> {
  const state = await getCurrentModuleState(userId);
  if (!state || !state.module) {
    return {
      ready: false,
      readiness_score: 0,
      reason: "No active module found",
      unresolved_beliefs: [],
      blockers: ["No active module found"],
      suggested_action: "continue_current",
      rules_blocked: true,
    };
  }

  const mod = state.module;

  // Pull the assistant's recent history for derivative-test detection.
  const conv = await prisma.conversation.findFirst({
    where: { userId, moduleId: mod.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        where: { role: "assistant" },
        orderBy: { createdAt: "desc" },
        take: 40,
      },
    },
  });
  const assistantHistory = (conv?.messages ?? []).map((m) => m.content);

  const { blockers, stressTested } = await runReadinessRules(
    userId,
    mod,
    assistantHistory
  );

  // Rules failed — short-circuit. Do not waste a model call.
  if (blockers.length > 0) {
    return {
      ready: false,
      readiness_score: 0.2,
      reason:
        "Rules pre-check blocked advancement. The debate work for this module isn't done yet.",
      covered_concepts: [],
      stress_tested_beliefs: stressTested,
      unresolved_beliefs: [],
      blockers,
      suggested_action: "continue_current",
      rules_blocked: true,
    };
  }

  // Rules passed — consult model judgment for the final call.
  const beliefs = await prisma.belief.findMany({ where: { userId } });
  const beliefSummary = beliefs
    .map((b) => `${b.canonicalLabel}: ${b.status} (${b.confidence})`)
    .join(", ");

  const contextMessage = `Current module: ${mod.name}
Module goal: ${mod.goal}
Target beliefs: ${mod.targetBeliefs.join(", ") || "none"}
Completion criteria: ${mod.completionCriteria.join("; ")}
Derivative tests defined: ${mod.derivativeTests.join(" / ") || "none"}
Belief stress-tested (weakened/resolved): ${stressTested.join(", ") || "none"}
User's current beliefs: ${beliefSummary || "none tracked yet"}

Recent conversation:
${conversationHistory.slice(-12).map((m) => `${m.role}: ${m.content}`).join("\n")}`;

  try {
    const modelResult = await jsonCompletion<ReadinessResult>(
      READINESS_ASSESSMENT_PROMPT,
      [{ role: "user", content: contextMessage }],
      { maxTokens: 700 }
    );
    return {
      ready:
        modelResult.ready === true &&
        (modelResult.readiness_score ?? 0) >= 0.7,
      readiness_score: modelResult.readiness_score ?? 0,
      reason: modelResult.reason ?? "Model assessed readiness.",
      covered_concepts: modelResult.covered_concepts ?? [],
      stress_tested_beliefs:
        modelResult.stress_tested_beliefs ?? stressTested,
      unresolved_beliefs: modelResult.unresolved_beliefs ?? [],
      blockers: modelResult.blockers ?? [],
      suggested_action: modelResult.suggested_action ?? "continue_current",
      rules_blocked: false,
    };
  } catch {
    return {
      ready: false,
      readiness_score: 0.3,
      reason: "Assessment failed, continuing current module",
      unresolved_beliefs: [],
      blockers: ["Model-side assessment failed."],
      suggested_action: "continue_current",
      rules_blocked: false,
    };
  }
}

export async function advanceModule(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  const currentModule = getModule(user.currentModule);
  if (!currentModule) return false;

  const nextModule = getNextModule(user.currentModule);
  if (!nextModule) return false;

  // Re-run the rules-based gate before trusting any prior assessment.
  // advanceModule must NEVER promote on stale state.
  if (currentModule.order < 7) {
    const conv = await prisma.conversation.findFirst({
      where: { userId, moduleId: currentModule.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          where: { role: "assistant" },
          orderBy: { createdAt: "desc" },
          take: 40,
        },
      },
    });
    const assistantHistory = (conv?.messages ?? []).map((m) => m.content);
    const { blockers } = await runReadinessRules(
      userId,
      currentModule,
      assistantHistory
    );
    if (blockers.length > 0) {
      return false;
    }
  }

  // Mark current as completed
  await prisma.userModuleState.update({
    where: { userId_moduleId: { userId, moduleId: currentModule.id } },
    data: { status: "completed", completedAt: new Date() },
  });

  // Unlock and activate next module
  await prisma.userModuleState.upsert({
    where: { userId_moduleId: { userId, moduleId: nextModule.id } },
    update: { status: "active" },
    create: { userId, moduleId: nextModule.id, status: "active" },
  });

  // Update user's current module
  await prisma.user.update({
    where: { id: userId },
    data: { currentModule: nextModule.id },
  });

  return true;
}

export async function isRitualEligible(userId: string): Promise<boolean> {
  // Modules 0-6 must be completed AND must each currently satisfy the
  // rules-based gate. A marked-complete module from an earlier soft
  // run should not satisfy the ritual threshold on its own.
  const requiredModules = MODULES.filter((m) => m.order >= 0 && m.order <= 6);

  for (const mod of requiredModules) {
    const state = await prisma.userModuleState.findUnique({
      where: { userId_moduleId: { userId, moduleId: mod.id } },
    });
    if (!state || state.status !== "completed") {
      return false;
    }
    const conv = await prisma.conversation.findFirst({
      where: { userId, moduleId: mod.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          where: { role: "assistant" },
          orderBy: { createdAt: "desc" },
          take: 40,
        },
      },
    });
    const assistantHistory = (conv?.messages ?? []).map((m) => m.content);
    const { blockers } = await runReadinessRules(userId, mod, assistantHistory);
    if (blockers.length > 0) {
      return false;
    }
  }

  return true;
}

export async function getModuleStates(userId: string) {
  const states = await prisma.userModuleState.findMany({
    where: { userId },
    orderBy: { moduleId: "asc" },
  });

  return MODULES.map((mod) => {
    const state = states.find((s) => s.moduleId === mod.id);
    return {
      ...mod,
      status: state?.status ?? "locked",
      readinessScore: state?.readinessScore ?? 0,
      testOutcome: state?.testOutcome ?? null,
      completedAt: state?.completedAt ?? null,
    };
  });
}
