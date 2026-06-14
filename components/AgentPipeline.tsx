"use client";

import { useState } from "react";
import type { Phase, SectionProgress } from "@/lib/hooks/useStreamAnalyze";

interface Props {
  phase: Phase;
  progress: SectionProgress;
  stages: { stage: string; elapsedMs: number }[] | null;
}

const STAGES: { key: Phase; label: string; icon: string }[] = [
  { key: "stage-split", label: "Splitter", icon: "✂️" },
  { key: "stage-analyze", label: "Section Analysts", icon: "🔍" },
  { key: "stage-aggregate", label: "Aggregator", icon: "🧩" },
];

export default function AgentPipeline({ phase, progress, stages }: Props) {
  const [expanded, setExpanded] = useState(true);
  const currentIdx = STAGES.findIndex((s) => s.key === phase);

  return (
    <div className="bg-white rounded-lg border border-border-color p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-sm"
      >
        <span className="font-semibold text-accent flex items-center gap-2">
          🤖 多 Agent 流水线
        </span>
        <span className="text-xs text-text-secondary">
          {expanded ? "收起 ▲" : "展开 ▼"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {STAGES.map((s, i) => {
            const isActive = phase === s.key;
            const isDone = currentIdx > i || phase === "done";
            const stageTiming = stages?.find((x) => x.stage === s.key.toLowerCase().replace("stage-", ""));

            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 p-2 rounded transition-colors ${
                  isActive
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : isDone
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "bg-gray-50"
                }`}
              >
                <span className="text-lg">{s.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    Stage {i + 1}. {s.label}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {s.key === "stage-split" && (
                      isDone || isActive
                        ? `已切分 ${progress.parsed.length} 个章节`
                        : "等待切分章节..."
                    )}
                    {s.key === "stage-analyze" && (
                      isDone || isActive
                        ? `已分析 ${progress.analyzed.length} / ${progress.parsed.length || "?"} 节`
                        : "等待分析章节..."
                    )}
                    {s.key === "stage-aggregate" && (
                      isDone || isActive ? "生成顶层摘要..." : "等待汇总..."
                    )}
                  </div>
                </div>
                {stageTiming && (
                  <span className="text-xs text-text-secondary font-mono">
                    {(stageTiming.elapsedMs / 1000).toFixed(1)}s
                  </span>
                )}
                {isActive && (
                  <span className="text-xs text-blue-600 animate-pulse">运行中</span>
                )}
                {isDone && !isActive && (
                  <span className="text-xs text-green-600">✓</span>
                )}
              </div>
            );
          })}

          {progress.analyzed.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-text-secondary">
                查看章节进度 ({progress.analyzed.length})
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {progress.analyzed.map((a) => (
                  <li key={a.sectionId} className="text-text-secondary">
                    ✓ <span className="font-mono">{a.sectionId}</span> ·{" "}
                    {a.cardCount} 张批注卡
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
