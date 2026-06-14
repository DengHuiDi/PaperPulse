"use client";

import type { AnalysisResult } from "@/lib/schemas";

interface OverviewProps {
  result: AnalysisResult;
}

const FLOW_STAGES = [
  {
    key: "problem",
    label: "问题陈述",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  {
    key: "limitation",
    label: "现有方法局限",
    color: "from-rose-400 to-red-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-200",
  },
  {
    key: "method",
    label: "提出方法",
    color: "from-violet-400 to-purple-500",
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-200",
  },
  {
    key: "evidence",
    label: "多数据集验证",
    color: "from-sky-400 to-blue-500",
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
  },
  {
    key: "ablation",
    label: "消融实验",
    color: "from-emerald-400 to-green-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  {
    key: "conclusion",
    label: "结论与展望",
    color: "from-slate-700 to-slate-900",
    bg: "bg-slate-100",
    text: "text-slate-800",
    ring: "ring-slate-300",
  },
];

export default function ArgumentOverview({ result }: OverviewProps) {
  const totalCards = result.sections.reduce((s, x) => s + x.cards.length, 0);
  const methodCount = result.sections
    .flatMap((s) => s.cards)
    .filter((c) => c.type === "method").length;
  const evidenceCount = result.sections
    .flatMap((s) => s.cards)
    .filter((c) => c.type === "evidence").length;
  const weaknessCount = result.summary.weaknesses.length;

  return (
    <section className="mt-12 space-y-6">
      {/* === Header === */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-1">
            Argument Map
          </div>
          <h2 className="font-serif text-[22px] font-semibold text-slate-900">
            全文论证结构总览
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11.5px] text-slate-500">
          <span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {result.sections.length}
            </span>{" "}
            章节
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {totalCards}
            </span>{" "}
            批注
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {weaknessCount}
            </span>{" "}
            漏洞
          </span>
        </div>
      </div>

      {/* === 论证流图 === */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 md:p-8 overflow-x-auto">
        <div className="flex items-stretch min-w-max gap-0">
          {FLOW_STAGES.map((stage, i) => {
            const isLast = i === FLOW_STAGES.length - 1;
            return (
              <div key={stage.key} className="flex items-stretch">
                <div className="flex flex-col items-center min-w-[120px]">
                  {/* Number badge */}
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${stage.color} text-white text-[12px] font-bold flex items-center justify-center shadow-soft mb-2.5`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  {/* Card */}
                  <div
                    className={`w-full px-3 py-3.5 rounded-xl ${stage.bg} ring-1 ${stage.ring} text-center`}
                  >
                    <div
                      className={`text-[12.5px] font-semibold ${stage.text} leading-tight`}
                    >
                      {stage.label}
                    </div>
                  </div>
                </div>
                {!isLast && <FlowArrow />}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-center text-[10.5px] text-slate-400">
          从问题识别 → 方法提出 → 多维验证 → 自我审视的完整论证链
        </div>
      </div>

      {/* === 论证强弱 + 关键指标 === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 核心主张 */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-elevated relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl"
          />
          <div className="relative">
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-amber-300 font-semibold mb-2">
              Core Claim
            </div>
            <p className="font-serif text-[17px] leading-relaxed text-white/95">
              {result.summary.coreClaim}
            </p>
            {result.summary.mainMetrics && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 mb-1.5">
                  关键指标
                </div>
                <p className="text-[12.5px] text-white/85 leading-relaxed">
                  {result.summary.mainMetrics}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 指标卡 */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="方法论批注"
            value={methodCount}
            color="from-violet-500 to-purple-600"
            sub="占比"
            subValue={
              totalCards
                ? `${Math.round((methodCount / totalCards) * 100)}%`
                : "—"
            }
          />
          <MetricCard
            label="实证批注"
            value={evidenceCount}
            color="from-sky-500 to-blue-600"
            sub="占比"
            subValue={
              totalCards
                ? `${Math.round((evidenceCount / totalCards) * 100)}%`
                : "—"
            }
          />
          <MetricCard
            label="贡献条目"
            value={result.summary.mainContributions.length}
            color="from-amber-500 to-orange-600"
            sub="main"
            subValue="Contributions"
          />
          <MetricCard
            label="潜在漏洞"
            value={weaknessCount}
            color="from-rose-500 to-red-600"
            sub="需关注"
            subValue="Weaknesses"
          />
        </div>
      </div>

      {/* === 强/弱对比 + 论证技巧 === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CompareCard
          kind="strong"
          title="论证最强处"
          items={result.summary.strengths}
          emptyText="（综合阶段未给出具体优势项）"
        />
        <CompareCard
          kind="weak"
          title="论证最弱处"
          items={result.summary.weaknesses}
          emptyText="（综合阶段未给出具体不足项）"
        />
      </div>
    </section>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center self-start mt-[60px] mx-1">
      <svg width="36" height="14" viewBox="0 0 36 14" fill="none">
        <line
          x1="0"
          y1="7"
          x2="30"
          y2="7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          className="text-slate-300 animate-flow"
        />
        <path
          d="M28 3 L34 7 L28 11"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-400"
        />
      </svg>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  sub,
  subValue,
}: {
  label: string;
  value: number;
  color: string;
  sub: string;
  subValue: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4">
      <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${color} mb-3`} />
      <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </div>
      <div className="font-serif text-2xl font-semibold text-slate-900 tabular-nums leading-tight mt-0.5">
        {value}
      </div>
      <div className="text-[10.5px] text-slate-400 mt-1.5">{sub}</div>
      <div className="text-[11px] text-slate-600 font-medium">
        {subValue}
      </div>
    </div>
  );
}

function CompareCard({
  kind,
  title,
  items,
  emptyText,
}: {
  kind: "strong" | "weak";
  title: string;
  items: string[];
  emptyText: string;
}) {
  const isStrong = kind === "strong";
  return (
    <div
      className={`relative rounded-2xl p-6 border ${
        isStrong
          ? "bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200/60"
          : "bg-gradient-to-br from-rose-50/70 to-white border-rose-200/60"
      } shadow-soft`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[14px] font-bold ${
            isStrong
              ? "bg-gradient-to-br from-emerald-400 to-green-600"
              : "bg-gradient-to-br from-rose-400 to-red-600"
          }`}
        >
          {isStrong ? "+" : "−"}
        </span>
        <h3 className="font-serif text-[15px] font-semibold text-slate-900">
          {title}
        </h3>
        <span
          className={`text-[10.5px] ml-auto px-2 py-0.5 rounded-full ${
            isStrong
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {items.length} 项
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-[12.5px] text-slate-400 italic">{emptyText}</p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex gap-3 text-[12.5px] text-slate-700 leading-relaxed"
            >
              <span
                className={`shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isStrong
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {i + 1}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
