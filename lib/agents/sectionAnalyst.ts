import { z } from "zod";
import {
  callDeepseekWithRetry,
  LlmError,
  extractJson,
} from "@/lib/llm";
import { CardTypeSchema, BadgeTypeSchema } from "@/lib/schemas";
import { sanitizeAnalystSection } from "./sanitize";

export const AnalystCardSchema = z.object({
  type: CardTypeSchema,
  badge: BadgeTypeSchema,
  badgeText: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

export const AnalystSectionSchema = z.object({
  sectionId: z.string().min(1),
  sectionTitle: z.string().min(1),
  cards: z.array(AnalystCardSchema).min(1).max(8),
  localWeakness: z.string().optional(),
});

export const AnalystOutputSchema = z.object({
  section: AnalystSectionSchema,
});

export type AnalystCard = z.infer<typeof AnalystCardSchema>;
export type AnalystSection = z.infer<typeof AnalystSectionSchema>;
export type AnalystOutput = z.infer<typeof AnalystOutputSchema>;

const ANALYST_SYSTEM = `你是顶尖学术审稿人，正在分析一篇论文中的**单个章节**。
你需要根据该章节的原文，输出 2–6 张**批注卡**（cards），每张卡只描述该章节内的一个核心观察。

## 输出 JSON Schema
{
  "section": {
    "sectionId": "原样回传",
    "sectionTitle": "原样回传",
    "cards": [
      {
        "type": "thesis | concept | evidence | concession | method",
        "badge": "function | logic | technique | weakness",
        "badgeText": "段落功能 / 逻辑结构 / 技术细节 / 潜在漏洞（中文）",
        "title": "卡片标题（中文，10 字内）",
        "content": "卡片正文，<br> 换行、<strong> 强调"
      }
    ],
    "localWeakness": "本章节最关键的潜在漏洞（可空）"
  }
}

## type 字段枚举
- thesis — 核心论点/论文贡献（黄色）
- concept — 关键概念/术语定义（红色）
- evidence — 实证证据/实验数据（蓝色）
- concession — 让步/反驳处理（绿色）
- method — 方法论说明（紫色）

## badge 字段枚举
- function — 段落功能
- logic — 逻辑位置/论证结构
- technique — 让步处理/技术细节
- weakness — 潜在漏洞

## 强约束
1. 只输出 JSON
2. cards 数量 2–6 张（强制范围）
3. content 中可使用 <br> 换行、<strong> 强调，不要其它 HTML
4. type / badge 字段值必须严格使用枚举
5. localWeakness 只在你观察到明显漏洞时填写，不要为每节都写
6. 不要复述原文，要做**分析性观察**（"段落功能是..."、"论证链是..."）`;

export class AnalystError extends Error {
  code: string;
  constructor(message: string, code = "ANALYST_FAIL") {
    super(message);
    this.code = code;
  }
}

export interface SectionAnalystInput {
  sectionId: string;
  sectionTitle: string;
  content: string;
  paperContext?: string;
}

export async function analyzeSection(
  input: SectionAnalystInput,
): Promise<AnalystSection> {
  const context = input.paperContext
    ? `\n\n## 论文背景（仅作上下文参考）\n${input.paperContext.slice(0, 2000)}`
    : "";

  let result;
  try {
    result = await callDeepseekWithRetry([
      { role: "system", content: ANALYST_SYSTEM },
      {
        role: "user",
        content: `请分析以下章节：\n\n## 章节 ID\n${input.sectionId}\n\n## 章节标题\n${input.sectionTitle}\n\n## 章节原文\n${input.content}${context}`,
      },
    ]);
  } catch (e) {
    if (e instanceof LlmError) throw new AnalystError(e.message, e.code);
    throw new AnalystError(
      e instanceof Error ? e.message : "analyst 调用失败",
    );
  }

  const raw = extractJson(result.content);
  if (!raw) {
    return sanitizeAnalystSection(
      { section: { cards: [] } },
      { sectionId: input.sectionId, sectionTitle: input.sectionTitle },
    );
  }

  // 先尝试 schema 校验（拿准确错误信息用于埋点），但失败时走兜底而非抛错
  const check = AnalystOutputSchema.safeParse(raw);
  if (!check.success) {
    // 兜底：拿 raw.section 直接做 sanitize
    return sanitizeAnalystSection(raw, {
      sectionId: input.sectionId,
      sectionTitle: input.sectionTitle,
    });
  }

  const parsed = check.data.section;
  // 强制回填 id/title（防止 LLM 改了它）
  parsed.sectionId = input.sectionId;
  parsed.sectionTitle = input.sectionTitle;

  // 即便 schema 通过，也过一遍 sanitize（防止 cards 里有空字段混入）
  return sanitizeAnalystSection({ section: parsed }, {
    sectionId: input.sectionId,
    sectionTitle: input.sectionTitle,
  });
}
