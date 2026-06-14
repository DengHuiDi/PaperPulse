"use client";

import { useState, type ReactNode } from "react";
import { clsx } from "clsx";

export type CardType =
  | "thesis"
  | "concept"
  | "evidence"
  | "concession"
  | "method";

export type BadgeType = "function" | "logic" | "technique" | "weakness";

interface AnnotationCardProps {
  type?: CardType;
  badge?: BadgeType;
  badgeText?: string;
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

const TYPE_META: Record<
  CardType,
  { label: string; icon: string; cls: string; ring: string; emoji: string }
> = {
  thesis: {
    label: "核心论点",
    icon: "M",
    cls: "type-thesis",
    ring: "from-amber-400 to-orange-500",
    emoji: "★",
  },
  concept: {
    label: "关键概念",
    icon: "C",
    cls: "type-concept",
    ring: "from-rose-400 to-red-500",
    emoji: "◇",
  },
  evidence: {
    label: "实证证据",
    icon: "E",
    cls: "type-evidence",
    ring: "from-sky-400 to-blue-500",
    emoji: "▦",
  },
  concession: {
    label: "让步/反驳",
    icon: "R",
    cls: "type-concession",
    ring: "from-emerald-400 to-green-500",
    emoji: "⇄",
  },
  method: {
    label: "方法论",
    icon: "P",
    cls: "type-method",
    ring: "from-violet-400 to-purple-500",
    emoji: "⚙",
  },
};

const BADGE_STYLES: Record<BadgeType, { label: string; cls: string }> = {
  function: { label: "段落功能", cls: "bg-slate-900 text-white" },
  logic: { label: "逻辑结构", cls: "bg-slate-200 text-slate-700" },
  technique: { label: "技术细节", cls: "bg-orange-100 text-orange-700" },
  weakness: { label: "潜在漏洞", cls: "bg-red-100 text-red-700" },
};

export default function AnnotationCard({
  type = "thesis",
  badge,
  badgeText,
  title,
  children,
  defaultExpanded = true,
}: AnnotationCardProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const meta = TYPE_META[type];
  const badgeMeta = badge ? BADGE_STYLES[badge] : null;

  return (
    <article
      className={clsx(
        "group relative bg-white rounded-xl border border-slate-200/80 shadow-soft hover:shadow-elevated transition-all duration-200 overflow-hidden",
        meta.cls,
        "animate-slide-up",
      )}
    >
      {/* Gradient left bar */}
      <div
        className={clsx(
          "absolute left-0 top-0 bottom-0 w-1 gradient-bar",
          "bg-gradient-to-b",
          meta.ring,
        )}
      />

      <div className="pl-5 pr-5 py-4">
        {/* Top row: type tag + badge + expand toggle */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md text-white bg-gradient-to-r",
              meta.ring,
            )}
          >
            <span className="text-[11px] leading-none">{meta.emoji}</span>
            {meta.label}
          </span>

          {badgeMeta && (
            <span
              className={clsx(
                "text-[10.5px] font-medium px-2 py-0.5 rounded-md",
                badgeMeta.cls,
              )}
            >
              {badgeText || badgeMeta.label}
            </span>
          )}

          <div className="ml-auto">
            <button
              onClick={() => setOpen(!open)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 -m-1"
              aria-label={open ? "折叠" : "展开"}
            >
              <svg
                className={clsx(
                  "w-4 h-4 transition-transform",
                  open ? "rotate-180" : "",
                )}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="font-serif text-[15px] font-semibold text-slate-900 leading-snug mb-2">
          {title}
        </h4>

        {/* Content */}
        {open && (
          <div className="text-[13.5px] text-slate-600 leading-relaxed [&_strong]:text-slate-900 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:pl-5 [&_li]:mb-1 [&_li]:list-disc [&_p]:mb-2 [&_br]:hidden">
            {children}
          </div>
        )}
      </div>

      {/* Bottom accent line on hover */}
      <div
        className={clsx(
          "h-[2px] w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r",
          meta.ring,
        )}
      />
    </article>
  );
}
