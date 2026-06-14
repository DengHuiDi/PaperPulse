"use client";

import { useMemo, useState } from "react";
import AnnotationCard from "./AnnotationCard";
import type { AnalysisResult, CardType } from "@/lib/schemas";
import { DEMO_ANALYSIS } from "@/lib/demoData";

interface Props {
  result: AnalysisResult;
  mode?: "live" | "demo";
  activeSectionId?: string;
  onSectionChange?: (id: string) => void;
}

const TYPE_LABEL: Record<CardType, string> = {
  thesis: "核心论点",
  concept: "关键概念",
  evidence: "实证证据",
  concession: "让步反驳",
  method: "方法论",
};

const TYPE_COLOR: Record<CardType, string> = {
  thesis: "#f59e0b",
  concept: "#ef4444",
  evidence: "#0ea5e9",
  concession: "#10b981",
  method: "#8b5cf6",
};

export default function AnnotationRenderer({
  result,
  mode = "live",
  activeSectionId,
  onSectionChange,
}: Props) {
  const [internalActive, setInternalActive] = useState(
    result.sections[0]?.sectionId,
  );
  const activeId = activeSectionId ?? internalActive;
  const setActive = (id: string) => {
    if (onSectionChange) onSectionChange(id);
    setInternalActive(id);
  };

  const section =
    result.sections.find((s) => s.sectionId === activeId) ??
    result.sections[0];

  const stats = useMemo(() => {
    const all = result.sections.flatMap((s) => s.cards);
    const byType: Record<CardType, number> = {
      thesis: 0,
      concept: 0,
      evidence: 0,
      concession: 0,
      method: 0,
    };
    for (const c of all) byType[c.type]++;
    return { total: all.length, byType };
  }, [result]);

  return (
    <div className="space-y-6">
      {/* === HERO 摘要 === */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-elevated">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(245,158,11,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.35), transparent 40%)",
          }}
        />
        <div className="relative px-8 py-7">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300">
              {mode === "demo" ? "演示数据" : "AI 实时分析"} · 核心论点
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              {result.sections.length} 章节 · {stats.total} 批注
            </div>
          </div>

          <h2 className="font-serif text-[22px] md:text-[26px] font-semibold leading-snug mb-4 max-w-3xl">
            {result.summary.coreClaim}
          </h2>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {result.summary.mainContributions.map((c, i) => (
              <span
                key={i}
                className="text-[11.5px] bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 text-white/90 px-2.5 py-1 rounded-md transition-colors"
              >
                {c}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5">
            {(Object.keys(TYPE_LABEL) as CardType[]).map((k) => (
              <div
                key={k}
                className="rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-300 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-sm"
                    style={{ backgroundColor: TYPE_COLOR[k] }}
                  />
                  {TYPE_LABEL[k]}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {stats.byType[k]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === 主双栏 === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：当前节摘要 + 类型分布 */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-5">
            <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              当前章节
            </div>
            <h3 className="font-serif text-[17px] font-semibold text-slate-900 leading-snug mb-3">
              {section.sectionTitle}
            </h3>
            <div className="flex items-center gap-2 text-[11.5px] text-slate-500 mb-3">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600">
                {section.sectionId}
              </span>
              <span>· {section.cards.length} 张批注卡</span>
            </div>

            {/* 类型分布迷你环 */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              {(Object.keys(TYPE_LABEL) as CardType[]).map((k) => {
                const count = section.cards.filter((c) => c.type === k).length;
                const pct =
                  section.cards.length === 0
                    ? 0
                    : (count / section.cards.length) * 100;
                return (
                  <div key={k} className="flex items-center gap-2 text-[11.5px]">
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: TYPE_COLOR[k] }}
                    />
                    <span className="text-slate-600 w-16 shrink-0">
                      {TYPE_LABEL[k]}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: TYPE_COLOR[k],
                        }}
                      />
                    </div>
                    <span className="text-slate-500 tabular-nums w-4 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 章节快速跳转 */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4">
            <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold mb-3 px-1">
              章节快速跳转
            </div>
            <nav className="space-y-0.5">
              {result.sections.map((s, i) => {
                const isActive = s.sectionId === activeId;
                return (
                  <button
                    key={s.sectionId}
                    onClick={() => setActive(s.sectionId)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] flex items-center gap-2 transition-all ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-mono tabular-nums w-5 ${
                        isActive ? "text-white/60" : "text-slate-400"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {s.sectionTitle}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        isActive ? "text-white/60" : "text-slate-400"
                      }`}
                    >
                      {s.cards.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 右侧：批注卡片列表 */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif text-[15px] font-semibold text-slate-900">
              批注详情
            </h3>
            <span className="text-[11.5px] text-slate-500">
              {section.cards.length} 张
            </span>
          </div>

          {section.cards.map((c, i) => (
            <AnnotationCard
              key={`${section.sectionId}-${i}`}
              type={c.type}
              badge={c.badge}
              badgeText={c.badgeText}
              title={c.title}
            >
              <span dangerouslySetInnerHTML={{ __html: c.content }} />
            </AnnotationCard>
          ))}

          {section.localWeakness && (
            <div className="mt-4 p-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/60 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-red-700">
                  本节潜在问题
                </span>
              </div>
              <p className="text-[12.5px] text-red-900/80 leading-relaxed">
                {section.localWeakness}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* === 全文潜在漏洞 === */}
      {result.summary.weaknesses.length > 0 && (
        <section className="bg-gradient-to-br from-red-50/70 via-orange-50/40 to-white border border-red-200/60 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
              全文潜在漏洞
            </span>
            <span className="text-[10.5px] text-red-600/70">
              {result.summary.weaknesses.length} 项
            </span>
          </div>
          <ul className="space-y-2">
            {result.summary.weaknesses.map((w, i) => (
              <li
                key={i}
                className="flex gap-3 text-[12.5px] text-slate-700 leading-relaxed"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function DemoRenderer() {
  return <AnnotationRenderer result={DEMO_ANALYSIS} mode="demo" />;
}
