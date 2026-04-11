import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const block = response.content[0];
  if (block.type === "text") {
    return block.text;
  }
  return "";
}

export async function jsonCompletion<T>(
  systemPrompt: string,
  messages: LLMMessage[],
  options?: { maxTokens?: number }
): Promise<T> {
  const response = await chatCompletion(systemPrompt, messages, {
    maxTokens: options?.maxTokens ?? 2048,
    temperature: 0.3,
  });

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
    throw new Error(`Failed to parse LLM JSON response: ${response.slice(0, 200)}`);
  }
}
