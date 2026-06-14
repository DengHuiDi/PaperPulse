import { z } from "zod";
import { CardTypeSchema, BadgeTypeSchema } from "@/lib/schemas";

const CardTypeValues = CardTypeSchema.options;
const BadgeTypeValues = BadgeTypeSchema.options;
const CardTypeSet = new Set<string>(CardTypeValues);
const BadgeTypeSet = new Set<string>(BadgeTypeValues);

/** 把任意输入归一化到 string（处理 number/null/undefined/object） */
export function normStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    if ("value" in obj) return normStr(obj.value);
    if ("text" in obj) return normStr(obj.text);
    if ("content" in obj) return normStr(obj.content);
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return "";
}

/** 找不到枚举值时降级为合理默认值 */
function pickEnum<T extends readonly [string, ...string[]]>(
  v: unknown,
  values: T,
  fallback: T[number],
): T[number] {
  const s = normStr(v);
  return (values as readonly string[]).includes(s) ? (s as T[number]) : fallback;
}

export interface SanitizedCard {
  type: (typeof CardTypeValues)[number];
  badge: (typeof BadgeTypeValues)[number];
  badgeText: string;
  title: string;
  content: string;
}

export interface SanitizedSection {
  sectionId: string;
  sectionTitle: string;
  cards: SanitizedCard[];
  localWeakness?: string;
}

/**
 * 把 LLM 返回的 cards 数组做兜底清洗：丢非法卡片、修正 type/badge、丢弃空 title/content。
 * 永远返回 ≥1 张卡（若全部不合法，返回一张"段落功能"的占位卡）。
 */
export function sanitizeCards(rawCards: unknown): SanitizedCard[] {
  if (!Array.isArray(rawCards)) return [placeholderCard()];
  const out: SanitizedCard[] = [];
  for (const c of rawCards) {
    if (!c || typeof c !== "object") continue;
    const card = c as Record<string, unknown>;
    const title = normStr(card.title);
    const content = normStr(card.content);
    if (!title || !content) continue;
    const type = CardTypeSet.has(normStr(card.type))
      ? (normStr(card.type) as (typeof CardTypeValues)[number])
      : "method";
    const badge = BadgeTypeSet.has(normStr(card.badge))
      ? (normStr(card.badge) as (typeof BadgeTypeValues)[number])
      : "function";
    const badgeText = normStr(card.badgeText) || badge;
    out.push({ type, badge, badgeText, title, content });
    if (out.length >= 8) break;
  }
  if (out.length === 0) return [placeholderCard()];
  return out;
}

function placeholderCard(): SanitizedCard {
  return {
    type: "method",
    badge: "function",
    badgeText: "段落功能",
    title: "本节观察",
    content: "本节未能提取到结构化批注，仅记录章节原文已成功解析。",
  };
}

/**
 * 把 LLM 返回的 AnalystOutput 整体兜底成 SanitizedSection。
 * 任何字段缺失/类型错都安全降级。
 */
export function sanitizeAnalystSection(
  raw: unknown,
  fallback: { sectionId: string; sectionTitle: string },
): SanitizedSection {
  let sectionObj: Record<string, unknown> = {};
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.section && typeof r.section === "object") {
      sectionObj = r.section as Record<string, unknown>;
    } else {
      sectionObj = r;
    }
  }
  const cards = sanitizeCards(sectionObj.cards);
  const localWeaknessRaw = normStr(sectionObj.localWeakness);
  return {
    sectionId: normStr(sectionObj.sectionId) || fallback.sectionId,
    sectionTitle: normStr(sectionObj.sectionTitle) || fallback.sectionTitle,
    cards,
    localWeakness: localWeaknessRaw || undefined,
  };
}
