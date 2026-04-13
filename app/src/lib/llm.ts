import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

type Provider = "anthropic" | "openai";

function getProvider(): Provider {
  const raw = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  return raw === "openai" ? "openai" : "anthropic";
}

// Lazy clients so missing API keys on one side don't crash the other.
let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

async function anthropicChat(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const response = await getAnthropic().messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const block = response.content[0];
  if (block && block.type === "text") {
    return block.text;
  }
  return "";
}

async function openaiChat(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
    ...(options?.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function chatCompletion(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const provider = getProvider();
  if (provider === "openai") {
    return openaiChat(systemPrompt, messages, options);
  }
  return anthropicChat(systemPrompt, messages, options);
}

export async function jsonCompletion<T>(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number }
): Promise<T> {
  const provider = getProvider();

  // For OpenAI we ask for native JSON mode and require the system prompt
  // to contain the word "json" (OpenAI's response_format requirement).
  const systemWithJsonMarker =
    provider === "openai" && !/json/i.test(systemPrompt)
      ? `${systemPrompt}\n\nRespond ONLY with valid JSON.`
      : systemPrompt;

  const response = await chatCompletion(systemWithJsonMarker, messages, {
    maxTokens: options?.maxTokens ?? 2048,
    temperature: 0.3,
    jsonMode: provider === "openai",
  });

  // Fast path: native JSON
  try {
    return JSON.parse(response) as T;
  } catch {
    // fall through to robust extraction
  }

  // Extract JSON from potential markdown code blocks
  let jsonStr = response;
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // Try to find JSON object in the response
    const objMatch = response.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]) as T;
    }
    throw new Error(
      `Failed to parse LLM JSON response: ${response.slice(0, 200)}`
    );
  }
}
