import { prisma } from "../db";
import { chatCompletion, LLMMessage } from "../llm";
import { GLOBAL_SYSTEM_PROMPT } from "../prompts/system";
import { buildModulePrompt, buildMemoryPrompt, buildStageGovernorPrompt } from "../prompts/modules";
import { getModule, MODULES } from "../modules/definitions";
import { extractAndUpdateBeliefs, getActiveBeliefs } from "./belief-tracker";
import { getLatestSummary, generateSessionSummary } from "./summary-engine";
import { initializeModuleStates, assessReadiness, advanceModule } from "./stage-governor";

export async function getOrCreateUser(userId?: string) {
  if (userId) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) return existing;
  }

  const user = await prisma.user.create({
    data: {
      currentModule: "module_0",
      programStatus: "active",
    },
  });

  await initializeModuleStates(user.id);
  return user;
}

export async function getOrCreateConversation(userId: string, moduleId: string) {
  // Find the most recent conversation for this module
  let conversation = await prisma.conversation.findFirst({
    where: { userId, moduleId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId, moduleId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  return conversation;
}

export async function sendMessage(
  userId: string,
  userMessage: string
): Promise<{ response: string; moduleId: string; isFirstMessage: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new Error("User not found");

  const moduleId = user.currentModule;
  const currentMod = getModule(moduleId);
  if (!currentMod) throw new Error("Module not found");

  const conversation = await getOrCreateConversation(userId, moduleId);
  const isFirstMessage = conversation.messages.length === 0;

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: userMessage,
    },
  });

  // Build context
  const activeBeliefs = await getActiveBeliefs(userId);
  const lastSummary = await getLatestSummary(userId);
  const recentLearnings = await prisma.learning.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Construct the full system prompt
  const systemParts = [
    GLOBAL_SYSTEM_PROMPT,
    buildModulePrompt(currentMod),
    buildStageGovernorPrompt(currentMod.order, MODULES.length),
    buildMemoryPrompt({
      userProfile: user.profile,
      currentModule: moduleId,
      activeBeliefs: activeBeliefs.map((b) => ({
        label: b.label,
        userWording: b.userWording,
        status: b.status,
        confidence: b.confidence,
      })),
      recentLearnings: recentLearnings.map((l) => ({
        summary: l.summary,
        strength: l.strength,
      })),
      lastSummary,
    }),
  ];

  const systemPrompt = systemParts.join("\n\n---\n\n");

  // Build message history for the LLM
  const historyMessages: LLMMessage[] = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Add the new user message
  historyMessages.push({ role: "user", content: userMessage });

  // Get LLM response
  const response = await chatCompletion(systemPrompt, historyMessages, {
    maxTokens: 800,
    temperature: 0.7,
  });

  // Save assistant response
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: response,
    },
  });

  // Background processing: belief extraction and periodic readiness checks
  const messageCount = conversation.messages.length + 2; // +2 for the new user+assistant msgs

  extractAndUpdateBeliefs(userId, userMessage, response).catch(() => {
    // Silent failure — belief extraction is enhancement, not critical path
  });

  // Every ~10 messages, generate a session summary
  if (messageCount % 10 === 0) {
    const allMessages: LLMMessage[] = [...historyMessages.slice(0, -1),
      { role: "user" as const, content: userMessage },
      { role: "assistant" as const, content: response }
    ];
    generateSessionSummary(userId, conversation.id, moduleId, allMessages).catch(() => {});
  }

  // Every ~8 messages, assess readiness to advance
  if (messageCount >= 8 && messageCount % 8 === 0) {
    const allMessages: LLMMessage[] = [...historyMessages.slice(0, -1),
      { role: "user" as const, content: userMessage },
      { role: "assistant" as const, content: response }
    ];
    assessReadiness(userId, allMessages).then(async (assessment) => {
      if (assessment.ready && assessment.readiness_score >= 0.7) {
        await advanceModule(userId);
      }
    }).catch(() => {});
  }

  return { response, moduleId, isFirstMessage };
}

export async function getConversationHistory(userId: string, moduleId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const targetModule = moduleId || user.currentModule;
  const conversation = await prisma.conversation.findFirst({
    where: { userId, moduleId: targetModule },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return conversation?.messages ?? [];
}

// Hard-edged opening challenges. The assistant MUST anchor on one of these,
// not drift into "tell me about your relationship with smoking" territory.
const OPENING_CHALLENGES = [
  "Bring me your strongest argument for smoking.",
  "Tell me exactly what a cigarette gives you.",
  "You think smoking helps. Let's test that.",
];

export async function startProgram(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const openingMod = getModule(user.currentModule);
  if (!openingMod) throw new Error("Module not found");

  // Generate opening message
  const systemPrompt = [
    GLOBAL_SYSTEM_PROMPT,
    buildModulePrompt(openingMod),
    buildStageGovernorPrompt(openingMod.order, MODULES.length),
  ].join("\n\n---\n\n");

  // Pick a deterministic-but-varied anchor per user. We don't want pure
  // random — we want every user to get a sharp challenge, not onboarding.
  const anchor =
    OPENING_CHALLENGES[
      Math.abs(hashUserId(userId)) % OPENING_CHALLENGES.length
    ];

  const openingPrompt = `This is the user's FIRST message. You are opening a smoker's debate, not a wellness intake. Do not ask how they're feeling. Do not ask about their "relationship with smoking." Do not describe the program.

Open with a direct challenge anchored on this line (use it verbatim or very close to it, then add ONE short follow-up sentence that invites them to defend smoking):

"${anchor}"

Keep it to 2-3 sentences total. Warm toward the smoker, sharp toward the logic. No lectures. No soft framing. No "I'm here to help." Make them want to argue back.`;

  const response = await chatCompletion(systemPrompt, [
    { role: "user", content: openingPrompt },
  ]);

  // Save as first message in conversation
  const conversation = await getOrCreateConversation(userId, user.currentModule);

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: response,
    },
  });

  return response;
}

function hashUserId(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h << 5) - h + userId.charCodeAt(i);
    h |= 0;
  }
  return h;
}
