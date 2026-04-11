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

  const openingPrompt = `Generate your opening message to start the debate program. This is the user's first interaction.

Your goal: get them talking about why they smoke. Open with something that feels like a genuine challenge, not a lecture. Make them want to defend smoking — because that's where the real work begins.

Keep it to 2-3 sentences. Be direct, warm, and intriguing.`;

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
