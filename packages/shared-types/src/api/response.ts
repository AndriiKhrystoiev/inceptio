import { z } from 'zod';
import { FactorSchema } from './factor';
import { ExcludedRangeSchema } from './excluded-range';

// 0-100 numeric quality, calibrated against real data per CLAUDE.md.
// Real Kyiv data tops out around 72; design treats 60-74 as a win.
export const ScoreSchema = z.number().int().gte(0).lte(100);

// strong/exceptional reserved for ≥75 / ≥90 — rare in real data.
export const GradeSchema = z.enum([
  'poor',
  'caution',
  'fair',
  'strong',
  'exceptional',
]);
export type Grade = z.infer<typeof GradeSchema>;

export const WindowSchema = z
  .object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    duration_minutes: z.number().int().gte(1),
    score: ScoreSchema,
    grade: GradeSchema,
    factors: z.array(FactorSchema),
  })
  .strict();
export type Window = z.infer<typeof WindowSchema>;

// Per-day summary row. Blocked days have null best_score plus a reason; viable
// days have a numeric score and no reason.
export const HeatmapEntrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
    best_score: ScoreSchema.nullable(),
    blocked: z.boolean(),
    blocked_reason_id: z.string().nullable(),
  })
  .strict();
export type HeatmapEntry = z.infer<typeof HeatmapEntrySchema>;

export const SummarySchema = z
  .object({
    viable_windows_count: z.number().int().gte(0),
    // Short searches (<14 days) regularly produce no_viable_windows=true
    // with caution-grade top_windows still present (CLAUDE.md).
    no_viable_windows: z.boolean(),
    days_blocked_count: z.number().int().gte(0),
    days_total: z.number().int().gte(1),
  })
  .strict();
export type Summary = z.infer<typeof SummarySchema>;

export const MetadataSchema = z
  .object({
    cache_hit: z.boolean(),
    calculation_time_ms: z.number().int().gte(0),
    api_version: z.string(),
  })
  .strict();
export type Metadata = z.infer<typeof MetadataSchema>;

export const ElectionalSearchResponseSchema = z
  .object({
    metadata: MetadataSchema,
    summary: SummarySchema,
    top_windows: z.array(WindowSchema),
    heatmap: z.array(HeatmapEntrySchema),
    excluded_ranges: z.array(ExcludedRangeSchema),
  })
  .strict();
export type ElectionalSearchResponse = z.infer<
  typeof ElectionalSearchResponseSchema
>;
