import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

type Provider = "anthropic" | "openai" | "claude-cli" | "codex-cli";

function getProvider(): Provider {
  const raw = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  if (raw === "openai") return "openai";
  if (raw === "claude-cli") return "claude-cli";
  if (raw === "codex-cli") return "codex-cli";
  return "anthropic";
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

/**
 * Render a message history into a single prompt string for CLI providers
 * (`claude -p` / `codex exec`) that take a single prompt argument rather
 * than a structured message array. The system prompt is passed out-of-band
 * via a flag, so it's not included here.
 */
function renderMessagesAsPrompt(messages: LLMMessage[]): string {
  if (messages.length === 0) return "";
  // Single trailing user turn — common case — skip the role labels entirely.
  if (messages.length === 1 && messages[0].role === "user") {
    return messages[0].content;
  }
  const lines: string[] = [];
  for (const m of messages) {
    const label = m.role === "user" ? "User" : "Assistant";
    lines.push(`${label}: ${m.content}`);
  }
  lines.push("Assistant:");
  return lines.join("\n\n");
}

async function claudeCliChat(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const model = process.env.CLAUDE_CLI_MODEL ?? "sonnet";
  const bin = process.env.CLAUDE_CLI_BIN ?? "claude";
  const prompt = renderMessagesAsPrompt(messages);

  const effectiveSystem = options?.jsonMode
    ? `${systemPrompt}\n\nRespond ONLY with valid JSON. No prose, no code fences.`
    : systemPrompt;

  const args = [
    "-p",
    "--system-prompt",
    effectiveSystem,
    "--tools",
    "",
    "--model",
    model,
    "--output-format",
    "text",
    prompt,
  ];

  const { stdout } = await execFileAsync(bin, args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });
  return stdout.trim();
}

async function codexCliChat(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const bin = process.env.CODEX_CLI_BIN ?? "codex";
  const prompt = renderMessagesAsPrompt(messages);

  const effectiveSystem = options?.jsonMode
    ? `${systemPrompt}\n\nRespond ONLY with valid JSON. No prose, no code fences.`
    : systemPrompt;

  // `codex exec` takes a single prompt; we fold the system prompt into it
  // as a leading preamble since codex exec has no dedicated system flag.
  const fullPrompt = `${effectiveSystem}\n\n---\n\n${prompt}`;

  const args = ["exec", "--skip-git-repo-check", fullPrompt];

  const { stdout } = await execFileAsync(bin, args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });
  return stdout.trim();
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
  if (provider === "claude-cli") {
    return claudeCliChat(systemPrompt, messages, options);
  }
  if (provider === "codex-cli") {
    return codexCliChat(systemPrompt, messages, options);
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
    jsonMode:
      provider === "openai" ||
      provider === "claude-cli" ||
      provider === "codex-cli",
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
