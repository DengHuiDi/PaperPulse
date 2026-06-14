import { z } from "zod";
import { callDeepseekWithRetry, LlmError, extractJson } from "@/lib/llm";

export const SectionBoundarySchema = z.object({
  sectionId: z.string().min(1),
  sectionTitle: z.string().min(1),
  // 关键：splitter 只标记章节边界 + 给该章节在原文中的字符起止范围
  // 不复制原文内容（避免输出超长 + 节省 token + 避免幻觉）
  charStart: z.number().int().nonnegative(),
  charEnd: z.number().int().nonnegative(),
});

export const SplitterOutputSchema = z.object({
  paperTitle: z.string(),
  // 宽松：允许 number / null / undefined / 字符串，统统归一化
  authors: z.union([z.string(), z.null()]).optional(),
  venue: z.union([z.string(), z.null()]).optional(),
  year: z.union([z.string(), z.number(), z.null()]).optional(),
  sections: z.array(SectionBoundarySchema).min(2).max(10),
});

export type SectionBoundary = z.infer<typeof SectionBoundarySchema>;
export type SplitterOutput = z.infer<typeof SplitterOutputSchema>;

const SPLITTER_SYSTEM = `你是学术论文结构化预处理专家。
任务：把输入的论文原文**按章节边界**切分为 5–8 个标准段落：
  abstract / introduction | related_work | methodology | experiments | discussion | conclusion | appendix
（总数 ≤8）

**关键约束：你只需要定位章节边界，禁止复制原文。**
调用方已经按 500 字符/块（带 50 字符重叠）把原文切成了 N 个窗口，并给你每个窗口的首尾预览 + 字符范围 [charStart, charEnd)。

**你的工作**：
1. 阅读每个窗口的预览
2. 判断该窗口属于哪个标准章节
3. 给出该章节的"全局字符起止"——即该章节在**整篇原文**中的 [charStart, charEnd)
4. 同一章节的连续窗口要**合并**为一个 section

**输出必须为严格 JSON**，禁止任何前缀文字、不要 markdown 代码块包裹。

## 输出 JSON Schema
{
  "paperTitle": "论文标题",
  "authors": "作者列表（若无则省略）",
  "venue": "期刊/会议（若无则省略）",
  "year": "发表年份（若无则省略）",
  "sections": [
    {
      "sectionId": "abstract",
      "sectionTitle": "摘要 / Abstract",
      "charStart": 0,
      "charEnd": 1234
    }
  ]
}

## 强约束
1. 只输出 JSON
2. sections 至少 2 个，至多 8 个
3. charStart/charEnd 是该章节在**整篇原文**中的字符索引（左闭右开）
4. sections 必须按原文顺序排列，相邻区段不重叠、不留缝
5. 第一段从 charStart=0 开始；最后一段 charEnd=原文总长度
6. sectionId 仅从以下枚举中选择：abstract | introduction | related_work | methodology | experiments | discussion | conclusion | appendix
7. 如果某些窗口属于"摘要"（标题下面第一段、无编号），合并为 abstract
8. 如果论文中某标准章节完全缺失（无 related work），则该 sectionId 不出现在 sections 数组中`;

export class SplitterError extends Error {
  code: string;
  constructor(message: string, code = "SPLITTER_FAIL") {
    super(message);
    this.code = code;
  }
}

export interface SplitterProgress {
  onMeta?: (info: { startedAt: number }) => void;
}

export async function splitPaper(
  text: string,
  progress: SplitterProgress = {},
): Promise<SplitterOutput> {
  const startedAt = Date.now();
  progress.onMeta?.({ startedAt });

  const totalLen = text.length;

  // 学术 PDF 提取出的文本通常无空行分隔，不能用 /\n\s*\n/ 切块
  // 改用"按行滑动窗口"：每块约 500 字符，相邻块重叠 50 字符（保留跨块上下文）
  const WINDOW = 500;
  const OVERLAP = 50;
  const stride = WINDOW - OVERLAP;
  const blocks: { text: string; charStart: number; charEnd: number }[] = [];
  for (let i = 0; i < totalLen; i += stride) {
    const start = i;
    const end = Math.min(totalLen, i + WINDOW);
    const piece = text.slice(start, end);
    if (piece.trim().length === 0) continue;
    blocks.push({ text: piece, charStart: start, charEnd: end });
    if (end >= totalLen) break;
  }

  if (blocks.length < 2) {
    throw new SplitterError(
      "原文段落数过少，无法识别章节结构",
      "TOO_FEW_BLOCKS",
    );
  }

  // 给每个 block 编号 + 头尾预览 + 字符范围，构造"目录"输入
  const preview = blocks
    .map((b, i) => {
      const head = b.text.slice(0, 200).replace(/\s+/g, " ");
      const tail =
        b.text.length > 200
          ? `…${b.text.slice(-80).replace(/\s+/g, " ")}`
          : "";
      return `[#${i}] (chars ${b.charStart}-${b.charEnd}, ${b.text.length}字) ${head}${tail}`;
    })
    .join("\n");

  let result;
  try {
    result = await callDeepseekWithRetry(
      [
        { role: "system", content: SPLITTER_SYSTEM },
        {
          role: "user",
          content: `原文总长 ${totalLen} 字符，共 ${blocks.length} 个段落块。
请根据下面的段落预览，输出每个标准章节在**整篇原文**中的字符起止范围 [charStart, charEnd)。

段落预览：
${preview}`,
        },
      ],
      { maxRetries: 2 },
    );
  } catch (e) {
    if (e instanceof LlmError) throw new SplitterError(e.message, e.code);
    throw new SplitterError(
      e instanceof Error ? e.message : "splitter 调用失败",
    );
  }

  const raw = extractJson(result.content);
  if (!raw) throw new SplitterError("splitter 未返回合法 JSON", "PARSE_FAIL");

  const check = SplitterOutputSchema.safeParse(raw);
  if (!check.success) {
    throw new SplitterError(
      `splitter 输出不符合 schema: ${check.error.issues
        .slice(0, 3)
        .map((i) => i.path.join("."))
        .join(", ")}`,
      "SCHEMA_INVALID",
    );
  }

  // 后处理：用 charStart/charEnd 从原文切片（这样不需要 LLM 搬运原文）
  // 1) 防御性 clamp 到 [0, totalLen]
  // 2) 排序 + 相邻区段首尾相接（后一段 charStart 提到前一段 charEnd）
  // 3) 第一段强制 charStart=0，最后一段强制 charEnd=totalLen
  const data = check.data;
  const sorted = [...data.sections].sort((a, b) => a.charStart - b.charStart);

  const clamped = sorted.map((s) => ({
    sectionId: s.sectionId,
    sectionTitle: s.sectionTitle,
    charStart: Math.max(0, Math.min(s.charStart, totalLen)),
    charEnd: Math.max(0, Math.min(s.charEnd, totalLen)),
  }));

  // 相邻区段首尾相接
  for (let i = 0; i < clamped.length - 1; i++) {
    clamped[i].charEnd = Math.max(clamped[i].charEnd, clamped[i + 1].charStart);
  }
  // 边界兜底
  if (clamped.length > 0) {
    clamped[0].charStart = 0;
    clamped[clamped.length - 1].charEnd = totalLen;
  }

  const sections: SectionBoundary[] = clamped.map((s) => ({
    sectionId: s.sectionId,
    sectionTitle: s.sectionTitle,
    content: text.slice(s.charStart, s.charEnd),
  }));

  // 归一化元信息：null/undefined → 留空；number → string
  const norm = (v: unknown): string | undefined => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "string") return v.trim() || undefined;
    if (typeof v === "number") return String(v);
    if (typeof v === "object" && v && "value" in v) return norm((v as { value: unknown }).value);
    return undefined;
  };

  return {
    paperTitle: norm(data.paperTitle) ?? "",
    authors: norm(data.authors),
    venue: norm(data.venue),
    year: norm(data.year),
    sections,
  };
}
