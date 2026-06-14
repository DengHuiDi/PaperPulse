interface TopNavProps {
  paperTitle?: string;
  authors?: string;
  venue?: string;
  year?: string;
  currentSection?: string;
  sectionCount?: number;
}

export default function TopNav({
  paperTitle,
  authors,
  venue,
  year,
  currentSection,
  sectionCount,
}: TopNavProps) {
  const showMeta = !!(paperTitle || authors || venue || year);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-6 py-3.5">
        <div className="flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-soft flex items-center justify-center">
              <span className="text-white text-[11px] font-bold tracking-tighter">
                PP
              </span>
            </div>
            <div className="leading-tight">
              <div className="font-serif text-[15px] font-semibold text-slate-900">
                PaperPulse
              </div>
              <div className="text-[10px] text-slate-500 -mt-0.5">
                LLM 论文批注
              </div>
            </div>
          </div>

          {/* Divider */}
          {showMeta && <div className="h-8 w-px bg-slate-200" />}

          {/* Paper meta */}
          {showMeta && (
            <div className="flex-1 min-w-0 hidden md:block">
              <div className="font-serif text-[13.5px] font-medium text-slate-800 truncate">
                {paperTitle || "未命名论文"}
              </div>
              <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                {authors && <span className="truncate">{authors}</span>}
                {authors && (venue || year) && (
                  <span className="text-slate-300">·</span>
                )}
                {venue && <span>{venue}</span>}
                {venue && year && <span className="text-slate-300">·</span>}
                {year && <span>{year}</span>}
              </div>
            </div>
          )}

          {!showMeta && (
            <div className="flex-1 text-[12.5px] text-slate-500 hidden md:block">
              学术论文智能批注 · 基于 LLM 的深度结构化分析
            </div>
          )}

          {/* Right: legend (compressed) */}
          <div className="flex items-center gap-3 shrink-0">
            {currentSection && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/5 text-[11px] text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-soft" />
                <span className="font-medium">{currentSection}</span>
                {sectionCount && (
                  <span className="text-slate-400">· {sectionCount} 节</span>
                )}
              </div>
            )}
            <div className="hidden xl:flex items-center gap-2 text-[10.5px] text-slate-500">
              <LegendDot color="#f59e0b" />
              <LegendDot color="#ef4444" />
              <LegendDot color="#0ea5e9" />
              <LegendDot color="#10b981" />
              <LegendDot color="#8b5cf6" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function LegendDot({ color }: { color: string }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-sm"
      style={{ backgroundColor: color, opacity: 0.85 }}
    />
  );
}
