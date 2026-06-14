import { z } from "zod";

export const CardTypeSchema = z.enum([
  "thesis",
  "concept",
  "evidence",
  "concession",
  "method",
]);

export const BadgeTypeSchema = z.enum([
  "function",
  "logic",
  "technique",
  "weakness",
]);

export const CardSchema = z.object({
  type: CardTypeSchema,
  badge: BadgeTypeSchema,
  badgeText: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

export const SectionSchema = z.object({
  sectionId: z.string().min(1),
  sectionTitle: z.string().min(1),
  cards: z.array(CardSchema).min(1),
});

export const SummarySchema = z.object({
  title: z.string(),
  authors: z.string(),
  journal: z.string(),
  year: z.string(),
  coreClaim: z.string(),
  mainContributions: z.array(z.string()).min(1),
  datasets: z.array(z.string()),
  mainMetrics: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const AnalysisResultSchema = z.object({
  summary: SummarySchema,
  sections: z.array(SectionSchema).min(1),
});

export type CardType = z.infer<typeof CardTypeSchema>;
export type BadgeType = z.infer<typeof BadgeTypeSchema>;
export type Card = z.infer<typeof CardSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const SseEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("meta"),
    data: z.object({
      mode: z.enum(["single", "multi-agent"]),
      model: z.string(),
      startedAt: z.number(),
    }),
  }),
  z.object({
    event: z.literal("stage"),
    data: z.object({
      stage: z.enum(["split", "analyze", "aggregate"]),
      total: z.number(),
      current: z.number(),
    }),
  }),
  z.object({
    event: z.literal("section/parsed"),
    data: z.object({
      sectionId: z.string(),
      sectionTitle: z.string(),
      total: z.number(),
    }),
  }),
  z.object({
    event: z.literal("section/analyzed"),
    data: z.object({
      sectionId: z.string(),
      cardCount: z.number(),
    }),
  }),
  z.object({
    event: z.literal("chunk"),
    data: z.object({
      delta: z.string(),
    }),
  }),
  z.object({
    event: z.literal("result"),
    data: z.object({
      result: AnalysisResultSchema,
      usage: z
        .object({
          promptTokens: z.number(),
          completionTokens: z.number(),
          totalTokens: z.number(),
        })
        .optional(),
      elapsedMs: z.number(),
      stages: z
        .array(
          z.object({
            stage: z.string(),
            elapsedMs: z.number(),
          }),
        )
        .optional(),
    }),
  }),
  z.object({
    event: z.literal("error"),
    data: z.object({
      message: z.string(),
      code: z.string().optional(),
      stage: z.string().optional(),
    }),
  }),
  z.object({
    event: z.literal("done"),
    data: z.object({ at: z.number() }),
  }),
]);

export type SseEvent = z.infer<typeof SseEventSchema>;
