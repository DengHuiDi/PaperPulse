import type { NextRequest } from "next/server";
import { LlmError } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "缺少 PDF 文件" }, { status: 400 });
    }
    if (file.type && file.type !== "application/pdf") {
      return Response.json(
        { error: "仅支持 application/pdf 类型" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "PDF 超过 20MB 限制" },
        { status: 413 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    let text = "";
    let pageCount = 0;
    try {
      // 用 pdfjs-dist 的核心 API（PDFJS）+ 关闭 worker 完全在主线程跑
      // 关键：必须传 `GlobalWorkerOptions.workerSrc = ""` 或者设置一个真实存在的 worker
      // 最稳的办法是用 unpdf，它是 pdfjs-dist 包装的纯 Node 友好方案
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(data);
      const { totalPages, text: extracted } = await extractText(pdf, {
        mergePages: true,
      });
      text = extracted;
      pageCount = totalPages;
    } catch (e) {
      return Response.json(
        { error: `PDF 解析失败: ${(e as Error).message}` },
        { status: 500 },
      );
    }

    text = text.replace(/\u0000/g, "").trim();
    if (text.length < 100) {
      return Response.json(
        { error: "PDF 可提取文本过短（<100 字符），可能是扫描件" },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      data: {
        text,
        pages: pageCount,
        filename: file.name,
        size: file.size,
      },
    });
  } catch (e) {
    if (e instanceof LlmError) {
      return Response.json({ error: e.message }, { status: 500 });
    }
    return Response.json(
      { error: `服务器错误: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({
    message: "PaperPulse PDF Parse API",
    version: "3.0",
    engine: "unpdf (pdfjs-dist wrapper, worker-free)",
    endpoint: "POST /api/parse-pdf (multipart/form-data, field=file)",
  });
}
