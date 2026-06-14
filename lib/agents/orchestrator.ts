import type { AnalysisResult } from "@/lib/schemas";
import { splitPaper, SplitterError } from "./splitter";
import { analyzeSection, AnalystError } from "./sectionAnalyst";
import { aggregate, AggregatorError } from "./aggregator";

export type OrchestratorEvent =
  | { type: "stage/start"; stage: "split" | "analyze" | "aggregate"; total: number; current: number }
  | { type: "section/parsed"; sectionId: string; sectionTitle: string; total: number }
  | { type: "section/analyzed"; sectionId: string; cardCount: number; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }
  | { type: "usage"; stage: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
  | { type: "error"; code: string; message: string; stage?: string };

export interface OrchestratorOptions {
  onEvent: (e: OrchestratorEvent) => void;
  signal?: AbortSignal;
}

export class OrchestratorError extends Error {
  code: string;
  stage: string;
  constructor(message: string, code: string, stage: string) {
    super(message);
    this.code = code;
    this.stage = stage;
  }
}

const MAX_PARALLEL = 3;

export async function runOrchestrator(
  text: string,
  opts: OrchestratorOptions,
): Promise<AnalysisResult> {
  const { onEvent, signal } = opts;

  // ============ Stage 1: Splitter ============
  onEvent({ type: "stage/start", stage: "split", total: 1, current: 0 });
  let split;
  try {
    split = await splitPaper(text);
  } catch (e) {
    if (signal?.aborted) throw new OrchestratorError("aborted", "ABORTED", "split");
    if (e instanceof SplitterError) {
      onEvent({ type: "error", code: e.code, message: e.message, stage: "split" });
      throw new OrchestratorError(e.message, e.code, "split");
    }
    throw new OrchestratorError(
      e instanceof Error ? e.message : "split 失败",
      "UNKNOWN",
      "split",
    );
  }

  for (const sec of split.sections) {
    onEvent({
      type: "section/parsed",
      sectionId: sec.sectionId,
      sectionTitle: sec.sectionTitle,
      total: split.sections.length,
    });
  }

  // ============ Stage 2: Section Analysts (with bounded parallelism) ============
  const sectionsCount = split.sections.length;
  onEvent({ type: "stage/start", stage: "analyze", total: sectionsCount, current: 0 });

  const analyzed: Awaited<ReturnType<typeof analyzeSection>>[] = [];
  const queue = [...split.sections];
  const paperContext = `标题: ${split.paperTitle}\n${split.venue ? `发表: ${split.venue} ${split.year ?? ""}` : ""}`.trim();

  let completed = 0;
  const workers: Array<Promise<void>> = [];

  for (let w = 0; w < Math.min(MAX_PARALLEL, queue.length); w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          if (signal?.aborted) {
            throw new OrchestratorError("aborted", "ABORTED", "analyze");
          }
          const next = queue.shift();
          if (!next) return;
          try {
            const result = await analyzeSection({
              sectionId: next.sectionId,
              sectionTitle: next.sectionTitle,
              content: next.content,
              paperContext,
            });
            analyzed.push(result);
            completed++;
            onEvent({
              type: "section/analyzed",
              sectionId: result.sectionId,
              cardCount: result.cards.length,
            });
            onEvent({
              type: "stage/start",
              stage: "analyze",
              total: sectionsCount,
              current: completed,
            });
          } catch (e) {
            // 兜底：本节 LLM 调用彻底失败时，塞入一张占位卡并继续
            const placeholder = {
              sectionId: next.sectionId,
              sectionTitle: next.sectionTitle,
              cards: [
                {
                  type: "method" as const,
                  badge: "function" as const,
                  badgeText: "段落功能",
                  title: "本节批注暂缺",
                  content: `本节 LLM 分析失败（${
                    e instanceof Error ? e.message : "未知错误"
                  }），已跳过。`,
                },
              ],
              localWeakness: undefined as string | undefined,
            };
            analyzed.push(placeholder);
            completed++;
            onEvent({
              type: "error",
              code: e instanceof AnalystError ? e.code : "ANALYST_FAIL",
              message: `[${next.sectionId}] ${e instanceof Error ? e.message : "失败"} (已降级继续)`,
              stage: "analyze",
            });
            onEvent({
              type: "section/analyzed",
              sectionId: placeholder.sectionId,
              cardCount: placeholder.cards.length,
            });
            onEvent({
              type: "stage/start",
              stage: "analyze",
              total: sectionsCount,
              current: completed,
            });
          }
        }
      })(),
    );
  }

  try {
    await Promise.all(workers);
  } catch (e) {
    if (e instanceof OrchestratorError) throw e;
    throw new OrchestratorError(
      e instanceof Error ? e.message : "analyze 失败",
      "UNKNOWN",
      "analyze",
    );
  }

  // ============ Stage 3: Aggregator ============
  onEvent({ type: "stage/start", stage: "aggregate", total: 1, current: 0 });
  let summary;
  try {
    summary = await aggregate({
      meta: {
        paperTitle: split.paperTitle,
        authors: split.authors,
        venue: split.venue,
        year: split.year,
      },
      sections: analyzed,
    });
  } catch (e) {
    if (signal?.aborted) throw new OrchestratorError("aborted", "ABORTED", "aggregate");
    // 兜底：aggregator 完全失败时用最小 summary 继续，保证 result 事件能送达
    const code = e instanceof AggregatorError ? e.code : "AGGREGATE_FAIL";
    onEvent({
      type: "error",
      code,
      message: `aggregate 失败（已降级为最小摘要）: ${
        e instanceof Error ? e.message : "未知"
      }`,
      stage: "aggregate",
    });
    const allCards = analyzed.flatMap((s) => s.cards);
    const lw = analyzed
      .map((s) => s.localWeakness)
      .filter((w): w is string => !!w);
    summary = {
      coreClaim:
        allCards[0]?.content.replace(/<[^>]+>/g, "").slice(0, 120) ||
        "（综合失败，未生成核心论点）",
      mainContributions: allCards
        .filter((c) => c.type === "thesis" || c.type === "method")
        .slice(0, 5)
        .map((c) => `${c.title}：${c.content.replace(/<[^>]+>/g, "").slice(0, 80)}`),
      datasets: [],
      mainMetrics: "（综合失败）",
      strengths: [],
      weaknesses: lw.slice(0, 5),
    };
  }

  return {
    summary: {
      title: split.paperTitle,
      authors: split.authors ?? "未知",
      journal: split.venue ?? "未知",
      year: split.year ?? "未知",
      coreClaim: summary.coreClaim,
      mainContributions: summary.mainContributions,
      datasets: summary.datasets,
      mainMetrics: summary.mainMetrics,
      strengths: summary.strengths,
      weaknesses: summary.weaknesses,
    },
    sections: analyzed.map((s) => ({
      sectionId: s.sectionId,
      sectionTitle: s.sectionTitle,
      cards: s.cards,
    })),
  };
}
