import { z } from "zod";
import {
  callDeepseekWithRetry,
  LlmError,
  extractJson,
} from "@/lib/llm";
import type { AnalystSection } from "./sectionAnalyst";
import type { SectionBoundary } from "./splitter";

export const AggregatorSummarySchema = z.object({
  coreClaim: z.string().min(1),
  mainContributions: z.array(z.string()).min(1).max(8),
  datasets: z.array(z.string()),
  mainMetrics: z.string(),
  strengths: z.array(z.string()).max(6),
  weaknesses: z.array(z.string()).max(6),
});

export type AggregatorSummary = z.infer<typeof AggregatorSummarySchema>;

const AGGREGATOR_SYSTEM = `你是学术论文综述专家，已经拿到论文的章节切分 + 每节批注 + 各节潜在漏洞。
任务：**综合**生成顶层摘要（summary），禁止简单堆叠，要做去重、归纳、提炼。

## 输出 JSON Schema
{
  "coreClaim": "一句话核心论点",
  "mainContributions": ["贡献1", "贡献2", "贡献3"],
  "datasets": ["数据集1", "数据集2"],
  "mainMetrics": "关键性能指标",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"]
}

## 强约束
1. 只输出 JSON
2. mainContributions 数量 1–8，去重、合并相似项
3. weaknesses 必须**跨章节归纳**，不能照抄单节 localWeakness
4. strengths 同理
5. datasets 仅列出论文中明确使用的数据集
6. mainMetrics 用一行表示，如 "mAP@0.5: 95.90% (RSOD)"`;

export class AggregatorError extends Error {
  code: string;
  constructor(message: string, code = "AGGREGATOR_FAIL") {
    super(message);
    this.code = code;
  }
}

export interface AggregatorInput {
  meta: {
    paperTitle: string;
    authors?: string;
    venue?: string;
    year?: string;
  };
  sections: AnalystSection[];
  rawBoundaries?: SectionBoundary[];
}

export async function aggregate(
  input: AggregatorInput,
): Promise<AggregatorSummary> {
  const condensedSections = input.sections
    .map(
      (s) =>
        `[${s.sectionId}] ${s.sectionTitle}\n  cards: ${s.cards.length} 张\n  localWeakness: ${s.localWeakness ?? "（无）"}`,
    )
    .join("\n\n");

  const condensedWeaknessList = input.sections
    .filter((s) => s.localWeakness)
    .map((s) => `- [${s.sectionId}] ${s.localWeakness}`)
    .join("\n");

  let result;
  try {
    result = await callDeepseekWithRetry([
      { role: "system", content: AGGREGATOR_SYSTEM },
      {
        role: "user",
        content: `## 论文元信息\n${JSON.stringify(input.meta, null, 2)}\n\n## 章节批注概览\n${condensedSections}\n\n## 跨章节漏洞列表\n${condensedWeaknessList || "（无）"}\n\n请输出顶层 summary。`,
      },
    ]);
  } catch (e) {
    if (e instanceof LlmError) throw new AggregatorError(e.message, e.code);
    throw new AggregatorError(
      e instanceof Error ? e.message : "aggregator 调用失败",
    );
  }

  const raw = extractJson(result.content);
  if (!raw) {
    return fallbackSummary(input);
  }

  const check = AggregatorSummarySchema.safeParse(raw);
  if (!check.success) {
    return fallbackSummary(input);
  }
  return check.data;
}

function fallbackSummary(input: AggregatorInput): AggregatorSummary {
  // 从各节批注里自动拼出兜底 summary
  const allCards = input.sections.flatMap((s) => s.cards);
  const mainContributions = allCards
    .filter((c) => c.type === "thesis" || c.type === "method")
    .slice(0, 5)
    .map((c) => `${c.title}：${c.content.replace(/<[^>]+>/g, "").slice(0, 80)}`);
  const weaknesses = input.sections
    .map((s) => s.localWeakness)
    .filter((w): w is string => !!w)
    .slice(0, 5);
  return {
    coreClaim: allCards[0]?.content.replace(/<[^>]+>/g, "").slice(0, 120) || "本论文核心论点待人工提炼",
    mainContributions: mainContributions.length ? mainContributions : ["（综合阶段失败，未生成核心贡献列表）"],
    datasets: [],
    mainMetrics: "（综合阶段失败，未生成指标摘要）",
    strengths: [],
    weaknesses: weaknesses.length ? weaknesses : [],
  };
}
