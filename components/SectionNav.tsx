"use client";

import { useEffect, useRef } from "react";

interface Section {
  sectionId: string;
  sectionTitle: string;
  cardCount: number;
}

interface SectionNavProps {
  sections: Section[];
  activeId: string;
  onSelect: (id: string) => void;
}

const TYPE_COLORS = [
  "from-amber-400 to-orange-500",
  "from-rose-400 to-red-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-green-500",
  "from-violet-400 to-purple-500",
];

function shortTitle(t: string): string {
  // 去掉 "I. " "II. " 之类的罗马数字前缀，做 chip 显示用
  return t.replace(/^[IVX]+\.\s*/, "").replace(/^Abstract\s*[\/／]\s*/i, "摘要");
}

export default function SectionNav({ sections, activeId, onSelect }: SectionNavProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);
  const activeIdx = sections.findIndex((s) => s.sectionId === activeId);

  // 自动滚动到当前节
  useEffect(() => {
    if (activeBtnRef.current && scrollerRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeId]);

  return (
    <div className="sticky top-[64px] z-40 glass border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 py-2.5">
          <div className="text-[11px] text-slate-500 font-medium shrink-0">
            章节导航
          </div>

          <div
            ref={scrollerRef}
            className="flex-1 overflow-x-auto no-scrollbar"
          >
            <div className="flex items-center gap-1.5 min-w-max">
              {sections.map((s, i) => {
                const active = s.sectionId === activeId;
                const colorClass = TYPE_COLORS[i % TYPE_COLORS.length];
                return (
                  <button
                    key={s.sectionId}
                    ref={active ? activeBtnRef : undefined}
                    onClick={() => onSelect(s.sectionId)}
                    className={`group relative shrink-0 px-3 py-1.5 rounded-full text-[12.5px] transition-all flex items-center gap-1.5 ${
                      active
                        ? "bg-slate-900 text-white shadow-soft"
                        : "text-slate-600 hover:bg-slate-900/5"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${colorClass} ${
                        active ? "" : "opacity-70"
                      }`}
                    />
                    <span className="font-medium whitespace-nowrap">
                      {shortTitle(s.sectionTitle)}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        active ? "text-white/60" : "text-slate-400"
                      }`}
                    >
                      {s.cardCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Counter */}
          <div className="text-[11px] text-slate-500 tabular-nums shrink-0 hidden sm:block">
            <span className="font-semibold text-slate-900">
              {activeIdx + 1}
            </span>
            <span className="text-slate-400"> / {sections.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-slate-100 -mx-6">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500 transition-all duration-500"
            style={{
              width: `${((activeIdx + 1) / Math.max(1, sections.length)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
