import type { NextRequest } from "next/server";
import { buildSystemPrompt, buildUserPrompt, PROMPT_META } from "@/lib/prompts";
import {
  callDeepseekWithRetry,
  extractJson,
  validateAnalysisResult,
  LlmError,
} from "@/lib/llm";
import { AnalysisResultSchema, type SseEvent } from "@/lib/schemas";
import { runOrchestrator } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_TEXT_LEN = 100;
const MAX_TEXT_LEN = 150_000;

function sseEncode(event: SseEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

interface AnalyzeRequestBody {
  text: string;
  mode?: "single" | "multi-agent";
}

function makeStream(req: NextRequest): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (e: SseEvent) => {
        controller.enqueue(encoder.encode(sseEncode(e)));
      };
      const startedAt = Date.now();

      let body: AnalyzeRequestBody | null = null;
      try {
        body = (await req.json()) as AnalyzeRequestBody;
      } catch {
        body = null;
      }

      const text = body?.text;
      const mode: "single" | "multi-agent" = body?.mode === "multi-agent" ? "multi-agent" : "single";

      if (!text || typeof text !== "string") {
        send({
          event: "error",
          data: { code: "BAD_INPUT", message: "缺少 text 字段或格式无效" },
        });
        send({ event: "done", data: { at: Date.now() } });
        controller.close();
        return;
      }
      if (text.length < MIN_TEXT_LEN) {
        send({
          event: "error",
          data: { code: "TOO_SHORT", message: "文本过短，请提供完整论文内容" },
        });
        send({ event: "done", data: { at: Date.now() } });
        controller.close();
        return;
      }
      if (text.length > MAX_TEXT_LEN) {
        send({
          event: "error",
          data: { code: "TOO_LONG", message: "文本过长，请控制在 15 万字以内" },
        });
        send({ event: "done", data: { at: Date.now() } });
        controller.close();
        return;
      }

      send({
        event: "meta",
        data: { mode, model: PROMPT_META.model, startedAt },
      });

      try {
        if (mode === "multi-agent") {
          const stageTimings: { stage: string; elapsedMs: number }[] = [];
          const currentStageStart = new Map<string, number>();
          const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

          const result = await runOrchestrator(text, {
            onEvent: (e) => {
              switch (e.type) {
                case "stage/start": {
                  const prev = currentStageStart.get(e.stage);
                  if (prev && !stageTimings.find((s) => s.stage === e.stage)) {
                    stageTimings.push({ stage: e.stage, elapsedMs: Date.now() - prev });
                  }
                  currentStageStart.set(e.stage, Date.now());
                  send({
                    event: "stage",
                    data: { stage: e.stage, total: e.total, current: e.current },
                  });
                  break;
                }
                case "section/parsed":
                  send({
                    event: "section/parsed",
                    data: {
                      sectionId: e.sectionId,
                      sectionTitle: e.sectionTitle,
                      total: e.total,
                    },
                  });
                  break;
                case "section/analyzed":
                  send({
                    event: "section/analyzed",
                    data: { sectionId: e.sectionId, cardCount: e.cardCount },
                  });
                  break;
                case "usage":
                  totalUsage.promptTokens += e.usage.promptTokens;
                  totalUsage.completionTokens += e.usage.completionTokens;
                  totalUsage.totalTokens += e.usage.totalTokens;
                  break;
                case "error":
                  send({
                    event: "error",
                    data: { code: e.code, message: e.message, stage: e.stage },
                  });
                  break;
              }
            },
            signal: req.signal,
          });

          stageTimings.forEach((s) => {
            if (!stageTimings.find((x) => x.stage === s.stage && x !== s)) {
              s.elapsedMs = s.elapsedMs;
            }
          });

          const stages = Array.from(currentStageStart.entries()).map(([stage, start]) => ({
            stage,
            elapsedMs: Date.now() - start,
          }));

          send({
            event: "result",
            data: {
              result,
              usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
              elapsedMs: Date.now() - startedAt,
              stages,
            },
          });
        } else {
          const messages = [
            { role: "system" as const, content: buildSystemPrompt() },
            { role: "user" as const, content: buildUserPrompt(text) },
          ];

          let result;
          try {
            result = await callDeepseekWithRetry(messages, {
              signal: req.signal,
            });
          } catch (err) {
            handleLlmError(err, send);
            return;
          }

          send({
            event: "chunk",
            data: { delta: result.content },
          });

          const raw = extractJson(result.content);
          if (!raw) {
            send({
              event: "error",
              data: { code: "PARSE_FAIL", message: "AI 返回非 JSON 内容" },
            });
            return;
          }

          const schemaCheck = AnalysisResultSchema.safeParse(raw);
          if (!schemaCheck.success) {
            send({
              event: "error",
              data: {
                code: "SCHEMA_INVALID",
                message: `AI 返回结构不符合预期: ${schemaCheck.error.issues
                  .slice(0, 3)
                  .map((i) => i.path.join("."))
                  .join(", ")}`,
              },
            });
            return;
          }

          const parsed = validateAnalysisResult(raw);
          send({
            event: "result",
            data: {
              result: parsed,
              usage: result.usage,
              elapsedMs: Date.now() - startedAt,
            },
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          send({
            event: "error",
            data: { code: "ABORTED", message: "请求被中断" },
          });
        } else {
          send({
            event: "error",
            data: {
              code: "INTERNAL",
              message: err instanceof Error ? err.message : "服务器内部错误",
            },
          });
        }
      } finally {
        send({ event: "done", data: { at: Date.now() } });
        controller.close();
      }
    },
  });
}

function handleLlmError(
  err: unknown,
  send: (e: SseEvent) => void,
): void {
  if (err instanceof LlmError) {
    send({
      event: "error",
      data: { code: err.code, message: err.message },
    });
  } else if (err instanceof Error && err.name === "AbortError") {
    send({
      event: "error",
      data: { code: "ABORTED", message: "请求被中断" },
    });
  } else {
    send({
      event: "error",
      data: { code: "INTERNAL", message: "服务器内部错误" },
    });
  }
}

export async function POST(req: NextRequest) {
  return new Response(makeStream(req), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: "PaperPulse Analysis API (Streaming, Multi-mode)",
      version: "3.0",
      endpoint: "POST /api/analyze (SSE)",
      modes: ["single", "multi-agent"],
      events: [
        "meta",
        "stage",
        "section/parsed",
        "section/analyzed",
        "chunk",
        "result",
        "error",
        "done",
      ],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
