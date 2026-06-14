"use client";

import { useRef, useState } from "react";
import TopNav from "@/components/TopNav";
import SectionNav from "@/components/SectionNav";
import AnnotationRenderer, { DemoRenderer } from "@/components/AnnotationRenderer";
import ArgumentOverview from "@/components/ArgumentOverview";
import TokenUsagePanel from "@/components/TokenUsagePanel";
import AgentPipeline from "@/components/AgentPipeline";
import { useStreamAnalyze, type Mode } from "@/lib/hooks/useStreamAnalyze";
import { DEMO_ANALYSIS } from "@/lib/demoData";

const PROMPT_META_MODEL = "deepseek-chat";

type AppMode = "idle" | "live" | "demo";

export default function Home() {
  const { state, analyze, parsePdf, reset, cancel } = useStreamAnalyze();
  const [mode, setMode] = useState<AppMode>("idle");
  const [pastedText, setPastedText] = useState("");
  const [analyzeMode, setAnalyzeMode] = useState<Mode>("multi-agent");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickingFile, setPickingFile] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setPickingFile(false);
    if (!file) return;
    const text = await parsePdf(file);
    if (!text) return;
    setMode("live");
    await analyze(text, analyzeMode);
  };

  const openFilePicker = () => {
    if (pickingFile) return;
    setPickingFile(true);
    fileInputRef.current?.click();
  };

  const handlePasteSubmit = async () => {
    if (pastedText.trim().length < 100) {
      alert("文本太短，至少 100 字符");
      return;
    }
    setMode("live");
    await analyze(pastedText, analyzeMode);
  };

  const handleDemo = () => {
    setMode("demo");
  };

  const handleBack = () => {
    setMode("idle");
    reset();
    setPastedText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const idlePhaseError =
    mode === "idle" && state.phase === "error"
      ? { error: state.error, code: state.errorCode }
      : null;

  return (
    <div className="min-h-screen paper-texture text-text-primary">
      <TopNav
        paperTitle={
          mode === "live" && state.result
            ? state.result.summary.title
            : undefined
        }
        authors={
          mode === "live" && state.result
            ? state.result.summary.authors
            : undefined
        }
        venue={
          mode === "live" && state.result
            ? state.result.summary.journal
            : undefined
        }
        year={
          mode === "live" && state.result
            ? state.result.summary.year
            : undefined
        }
        currentSection={
          activeSectionId
            ? state.result?.sections.find((s) => s.sectionId === activeSectionId)
                ?.sectionTitle
            : state.result?.sections[0]?.sectionTitle
        }
        sectionCount={state.result?.sections.length}
      />

      {mode === "idle" && (
        <main className="max-w-4xl mx-auto px-8 pt-32 pb-16">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl font-semibold text-nav-bg mb-4">
              PaperPulse
            </h1>
            <p className="text-text-secondary text-lg">
              学术论文智能批注 · 基于 LLM 的深度结构化分析
            </p>
          </div>

          {idlePhaseError && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700 flex justify-between items-start">
              <div>
                <strong>出错了：</strong>
                {idlePhaseError.error}
                {idlePhaseError.code && (
                  <span className="ml-2 text-xs text-red-500">
                    [{idlePhaseError.code}]
                  </span>
                )}
              </div>
              <button
                onClick={reset}
                className="text-xs text-red-600 hover:underline shrink-0 ml-3"
              >
                关闭
              </button>
            </div>
          )}

          <div className="mb-6 flex items-center justify-center gap-2 text-sm">
            <span className="text-text-secondary">分析模式：</span>
            <button
              onClick={() => setAnalyzeMode("multi-agent")}
              className={`px-3 py-1.5 rounded transition-colors ${
                analyzeMode === "multi-agent"
                  ? "bg-accent text-white"
                  : "bg-white text-accent border border-border-color hover:bg-accent hover:text-white"
              }`}
            >
              🤖 多 Agent 编排（推荐）
            </button>
            <button
              onClick={() => setAnalyzeMode("single")}
              className={`px-3 py-1.5 rounded transition-colors ${
                analyzeMode === "single"
                  ? "bg-accent text-white"
                  : "bg-white text-accent border border-border-color hover:bg-accent hover:text-white"
              }`}
            >
              ⚡ 单 Agent 快速模式
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <button
              type="button"
              onClick={openFilePicker}
              className="bg-white rounded-lg p-8 border-2 border-dashed border-border-color hover:border-accent hover:shadow-lg transition-all text-left cursor-pointer"
            >
              <div className="text-3xl mb-3">📄</div>
              <h3 className="font-serif text-lg font-semibold text-accent mb-2">
                上传 PDF
              </h3>
              <p className="text-text-secondary text-sm">
                自动提取文本（≤20MB），交给 AI 生成结构化批注
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFile}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
              />
            </button>

            <div className="bg-white rounded-lg p-8 border-2 border-border-color hover:border-accent transition-all">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="font-serif text-lg font-semibold text-accent mb-2">
                粘贴文本
              </h3>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="将论文摘要 / 全文粘贴到这里..."
                className="w-full h-24 text-sm border border-border-color rounded p-2 mb-3 resize-none focus:outline-none focus:border-accent"
              />
              <button
                onClick={handlePasteSubmit}
                disabled={pastedText.trim().length < 100}
                className="w-full bg-accent text-white py-2 rounded text-sm font-medium hover:bg-nav-bg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                开始分析
              </button>
            </div>

            <button
              onClick={handleDemo}
              className="bg-white rounded-lg p-8 border-2 border-border-color hover:border-accent hover:shadow-lg transition-all text-left"
            >
              <div className="text-3xl mb-3">🎬</div>
              <h3 className="font-serif text-lg font-semibold text-accent mb-2">
                演示模式
              </h3>
              <p className="text-text-secondary text-sm">
                离线查看 SOD-YOLOv10 论文的预生成批注（无需 API Key）
              </p>
            </button>
          </div>

          <div className="bg-white rounded-lg p-6 border border-border-color text-sm text-text-secondary leading-relaxed">
            <h3 className="font-semibold text-accent mb-3">分析能力</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-disc pl-5">
              <div>
                <strong className="text-text-primary">5 种语义高亮：</strong>
                核心论点 / 关键概念 / 实证证据 / 让步反驳 / 方法论
              </div>
              <div>
                <strong className="text-text-primary">4 种徽章：</strong>
                段落功能 / 逻辑结构 / 技术细节 / 潜在漏洞
              </div>
              <div>
                <strong className="text-text-primary">多 Agent 模式：</strong>
                Splitter → Analysts × N → Aggregator 三级流水线
              </div>
              <div>
                <strong className="text-text-primary">SSE 流式：</strong>
                章节切分、逐节分析、汇总进度实时推送
              </div>
              <div>
                <strong className="text-text-primary">Zod 严格校验：</strong>
                每阶段输出 schema 校验 + 失败自动重试
              </div>
              <div>
                <strong className="text-text-primary">Token 用量：</strong>
                每节调用 + 总计实时展示
              </div>
            </div>
          </div>
        </main>
      )}

      {(mode === "live" || mode === "demo") && (
        <>
          {(state.result || mode === "demo") && (
            <SectionNav
              sections={
                state.result
                  ? state.result.sections.map((s) => ({
                      sectionId: s.sectionId,
                      sectionTitle: s.sectionTitle,
                      cardCount: s.cards.length,
                    }))
                  : []
              }
              activeId={
                activeSectionId ??
                state.result?.sections[0]?.sectionId ??
                ""
              }
              onSelect={setActiveSectionId}
            />
          )}
          <main className="max-w-7xl mx-auto px-6 pt-32 pb-16">
            <div className="mb-5 flex justify-between items-center">
              <button
                onClick={handleBack}
                className="text-[12.5px] text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H17a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                返回首页
              </button>
              {mode === "live" && (state.phase === "stage-analyze" || state.phase === "stage-split" || state.phase === "stage-aggregate") && (
                <button
                  onClick={cancel}
                  className="text-[11.5px] text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-soft" />
                  取消分析
                </button>
              )}
            </div>

            {mode === "live" && (
              <div className="mb-6 space-y-3">
                <TokenUsagePanel
                  usage={state.usage}
                  elapsedMs={state.elapsedMs}
                  model={PROMPT_META_MODEL}
                  phase={state.phase}
                  stages={state.stages}
                />

                {state.mode === "multi-agent" && state.phase !== "done" && state.phase !== "error" && (
                  <AgentPipeline
                    phase={state.phase}
                    progress={state.progress}
                    stages={state.stages}
                  />
                )}

                {state.phase === "error" && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700">
                    ✗ 错误：{state.error}
                    {state.errorCode && (
                      <span className="ml-2 text-xs text-red-500">
                        [{state.errorCode}]
                      </span>
                    )}
                    {state.errorStage && (
                      <span className="ml-2 text-xs text-red-500">
                        stage: {state.errorStage}
                      </span>
                    )}
                  </div>
                )}
                {state.phase === "done" && state.result && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded text-sm text-green-700">
                    ✓ 分析完成：{state.result.sections.length} 个章节，{" "}
                    {state.result.sections.reduce((sum, s) => sum + s.cards.length, 0)} 张批注卡
                    {state.stages && state.stages.length > 0 && (
                      <span className="ml-3 text-xs text-green-600">
                        阶段耗时：
                        {state.stages.map((s) => `${s.stage}=${(s.elapsedMs / 1000).toFixed(1)}s`).join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === "live" && state.result ? (
              <AnnotationRenderer
                result={state.result}
                mode="live"
                activeSectionId={activeSectionId ?? undefined}
                onSectionChange={setActiveSectionId}
              />
            ) : mode === "demo" ? (
              <DemoRenderer />
            ) : null}

            {(state.result || mode === "demo") && (
              <ArgumentOverview result={state.result ?? DEMO_ANALYSIS} />
            )}
          </main>
        </>
      )}

      <footer className="text-center py-8 text-text-secondary text-sm">
        PaperPulse · Splitter → Section Analysts × N → Aggregator · 基于 Moonshot Kimi 128k
      </footer>
    </div>
  );
}
