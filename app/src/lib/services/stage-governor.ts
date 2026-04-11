import { prisma } from "../db";
import { jsonCompletion, LLMMessage } from "../llm";
import { READINESS_ASSESSMENT_PROMPT } from "../prompts/system";
import { getModule, getNextModule, MODULES } from "../modules/definitions";

interface ReadinessResult {
  ready: boolean;
  readiness_score: number;
  reason: string;
  unresolved_beliefs: string[];
  suggested_action: string;
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
      suggested_action: "continue_current",
    };
  }

  const beliefs = await prisma.belief.findMany({ where: { userId } });
  const beliefSummary = beliefs
    .map((b) => `${b.canonicalLabel}: ${b.status} (${b.confidence})`)
    .join(", ");

  const contextMessage = `Current module: ${state.module.name}
Module goal: ${state.module.goal}
Completion criteria: ${state.module.completionCriteria.join("; ")}
User's current beliefs: ${beliefSummary || "none tracked yet"}

Recent conversation:
${conversationHistory.slice(-10).map((m) => `${m.role}: ${m.content}`).join("\n")}`;

  try {
    return await jsonCompletion<ReadinessResult>(
      READINESS_ASSESSMENT_PROMPT,
      [{ role: "user", content: contextMessage }],
      { maxTokens: 512 }
    );
  } catch {
    return {
      ready: false,
      readiness_score: 0.3,
      reason: "Assessment failed, continuing current module",
      unresolved_beliefs: [],
      suggested_action: "continue_current",
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
  // Modules 0-6 must be completed
  const requiredModules = MODULES.filter((m) => m.order >= 0 && m.order <= 6);

  for (const mod of requiredModules) {
    const state = await prisma.userModuleState.findUnique({
      where: { userId_moduleId: { userId, moduleId: mod.id } },
    });
    if (!state || state.status !== "completed") {
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
