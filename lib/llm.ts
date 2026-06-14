import { PROMPT_META } from "./prompts";
import { AnalysisResultSchema, type AnalysisResult } from "./schemas";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmResult {
  content: string;
  usage?: LlmUsage;
  elapsedMs: number;
}

export class LlmError extends Error {
  code: string;
  constructor(message: string, code = "LLM_ERROR") {
    super(message);
    this.code = code;
  }
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MoonshotResponse {
  choices: { message: { content: string } }[];
  usage?: LlmUsage;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callMoonshotOnce(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<LlmResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new LlmError("服务器配置错误：未设置 DEEPSEEK_API_KEY", "NO_API_KEY");
  }

  const t0 = Date.now();
  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PROMPT_META.model,
      messages,
      temperature: PROMPT_META.temperature,
      max_tokens: PROMPT_META.maxTokens,
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const msg =
      (detail as { error?: { message?: string } }).error?.message ??
      `${res.status} ${res.statusText}`;
    throw new LlmError(`DeepSeek API 调用失败: ${msg}`, `HTTP_${res.status}`);
  }

  const data = (await res.json()) as MoonshotResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmError("AI 返回内容为空", "EMPTY_CONTENT");
  }
  return {
    content,
    usage: data.usage,
    elapsedMs: Date.now() - t0,
  };
}

export async function callDeepseekWithRetry(
  messages: ChatMessage[],
  opts: { maxRetries?: number; signal?: AbortSignal } = {},
): Promise<LlmResult> {
  const maxRetries = opts.maxRetries ?? 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callMoonshotOnce(messages, opts.signal);
    } catch (err) {
      lastErr = err;
      if (err instanceof LlmError && err.code === "NO_API_KEY") break;
      if (err instanceof Error && err.name === "AbortError") break;
      if (attempt < maxRetries) {
        await sleep(400 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new LlmError("未知 LLM 错误", "UNKNOWN");
}

export function extractJson(content: string): unknown | null {
  const cleaned = content.trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function validateAnalysisResult(raw: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(raw) as AnalysisResult;
}
