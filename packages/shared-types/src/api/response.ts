import { z } from 'zod';
import { ActivitySchema } from './request';
import { FactorSchema } from './factor';
import { ExcludedRangeSchema, ReasonIdSchema } from './excluded-range';

// 0-100 numeric quality, calibrated against real data per CLAUDE.md.
export const ScoreSchema = z.number().int().gte(0).lte(100);

// Canonical list of grades we know how to render. The schema below is
// intentionally permissive (z.string()) so the response never fails to parse
// when upstream introduces a new bucket. The mobile display layer recovers an
// unknown/odd-cased grade from the window's SCORE (see
// apps/mobile/src/lib/grade.ts `resolveGrade`) rather than defaulting to
// "Not recommended" — so a high-scoring window with a not-yet-mapped grade still
// reads as a high grade. Add new grades here once their UI mapping is decided.
//
// `good` was added by upstream mid-2026, sitting between `fair` and `strong`.
// `strong`/`exceptional` are reserved for ≥75 / ≥90 — rare in real data.
export const KNOWN_GRADES = [
  'poor',
  'caution',
  'fair',
  'good',
  'strong',
  'exceptional',
] as const;
export type Grade = (typeof KNOWN_GRADES)[number];

// Permissive on purpose — see KNOWN_GRADES comment.
export const GradeSchema = z.string().min(1);

// Per-day summary row. The API returns `date` as a {year, month, day} object,
// not a string. `blocked_reasons` is plural — a day can be blocked for
// multiple reasons at once (e.g. Mercury retrograde + Moon void).
export const HeatmapDateSchema = z
  .object({
    year: z.number().int(),
    month: z.number().int().gte(1).lte(12),
    day: z.number().int().gte(1).lte(31),
  })
  .passthrough();

export const HeatmapDaySchema = z
  .object({
    date: HeatmapDateSchema,
    best_score: ScoreSchema,
    best_grade: GradeSchema,
    best_window_start: z.string().nullable(),
    viable_count: z.number().int().gte(0),
    blocked: z.boolean(),
    blocked_reasons: z.array(ReasonIdSchema),
  })
  .passthrough();
export type HeatmapDay = z.infer<typeof HeatmapDaySchema>;

export const SummarySchema = z
  .object({
    total_candidates_evaluated: z.number().int().gte(0),
    viable_windows_count: z.number().int().gte(0),
    excluded_ranges_count: z.number().int().gte(0),
    best_score: ScoreSchema,
    // Permissive: API may return values outside our enum, and we don't read
    // best_grade for any L2/L3 decision.
    best_grade: z.string(),
    // Short searches (<14 days) regularly produce this state (CLAUDE.md).
    no_viable_windows: z.boolean(),
    quality_advisory: z.unknown().nullable(),
  })
  .passthrough();
export type Summary = z.infer<typeof SummarySchema>;

export const WindowSchema = z
  .object({
    rank: z.number().int().gte(1),
    start: z.string(),
    end: z.string(),
    duration_minutes: z.number().int().gte(1),
    score: ScoreSchema,
    grade: GradeSchema,
    factors: z.array(FactorSchema),
    // Always present; often empty. Shape inside is upstream-specific —
    // pass through as unknown so we don't break on internal changes.
    cautions: z.array(z.unknown()),
    rationale: z.string(),
    summary: z.string().nullable(),
    chart_summary: z.string().nullable(),
    natal_alignment: z.unknown().nullable(),
    natal_modifier: z.unknown().nullable(),
    personal_advisories: z.array(z.unknown()),
  })
  .passthrough();
export type Window = z.infer<typeof WindowSchema>;

export const MetadataSchema = z
  .object({
    timestamp: z.string(),
    calculation_time_ms: z.number().gte(0),
    api_version: z.string(),
    endpoint: z.string(),
    request_id: z.string(),
    cache_hit: z.boolean(),
    cache_age_seconds: z.number().nullable(),
    credits_used: z.number(),
    server_location: z.string().nullable(),
    calculation_method: z.string().nullable(),
  })
  .passthrough();
export type Metadata = z.infer<typeof MetadataSchema>;

// `search_window` is echoed back by the upstream containing the request
// parameters. We don't read it for any L1/L2/L3 decision, so accept any
// shape via passthrough on an empty object.
export const SearchWindowSchema = z.object({}).passthrough();

// The inner `data` payload — everything we actually care about.
export const ApiDataSchema = z
  .object({
    activity: ActivitySchema,
    house_system: z.string(),
    search_window: SearchWindowSchema,
    summary: SummarySchema,
    heatmap: z.array(HeatmapDaySchema),
    top_windows: z.array(WindowSchema),
    excluded_ranges: z.array(ExcludedRangeSchema),
  })
  .passthrough();
export type ApiData = z.infer<typeof ApiDataSchema>;

// The full upstream envelope. Strategic decision: passthrough() everywhere
// on upstream-derived schemas. Our earlier .strict() bet caused first-call
// failures; the API will continue to add fields. We catch shape drift via
// other means (explicit field checks where we read).
//
// .strict() is reserved for our internal displayable schemas (the contract
// with mobile) — those stay tight.
export const ApiEnvelopeSchema = z
  .object({
    success: z.boolean(),
    data: ApiDataSchema,
    metadata: MetadataSchema,
    warnings: z.unknown().nullable(),
    pagination: z.unknown().nullable(),
  })
  .passthrough();
export type ApiEnvelope = z.infer<typeof ApiEnvelopeSchema>;

// Kept as alias for any existing imports. ElectionalSearchResponse now means
// "the full envelope" rather than "the inner data fields at top level."
export const ElectionalSearchResponseSchema = ApiEnvelopeSchema;
export type ElectionalSearchResponse = ApiEnvelope;
