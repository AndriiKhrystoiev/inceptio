import { z } from 'zod';
import { ActivitySchema } from './request';  // ActivitySchema lives in request.ts (verified via grep — there is no activity.ts file)

/** Quality bucket per PICKER-CONTRACT.md §2. */
export const QualityBucketSchema = z.enum(['strong', 'good', 'mixed', 'closed']);
export type QualityBucket = z.infer<typeof QualityBucketSchema>;

/** Moon phase per PICKER-CONTRACT.md §2. */
export const MoonPhaseSchema = z.enum([
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
]);
export type MoonPhase = z.infer<typeof MoonPhaseSchema>;

/** Saved-search lifecycle state per PICKER-CONTRACT.md §1. */
export const SavedSearchStateSchema = z.enum([
  'none-yet',
  'pre-window',
  'new-window',
  'in-window',
  'passed',
]);
export type SavedSearchState = z.infer<typeof SavedSearchStateSchema>;

/** Backend-owned part-of-day cutoffs per PICKER-CONTRACT.md §3. */
export const PartOfDayCutoffsSchema = z.object({
  morning_end_hour: z.number().int().min(0).max(24),
  afternoon_end_hour: z.number().int().min(0).max(24),
  evening_end_hour: z.number().int().min(0).max(24),
});
export type PartOfDayCutoffs = z.infer<typeof PartOfDayCutoffsSchema>;

/** The daily-note portion of the response. */
export const DailyNoteOutputSchema = z.object({
  mood: QualityBucketSchema,
  moon_phase: MoonPhaseSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO YYYY-MM-DD'),
  headline: z.string().max(48),
  supporting: z.string().max(140),
  exclusion_reason: z.string().optional(),
  entry_id: z.string(),
  used_fallback: z.boolean(),
  /**
   * Optional activity-asymmetric clarifier composed in the Worker when the
   * picked entry is one of the asymmetric exclusion conditions
   * (mercury_retrograde, venus_retrograde, moon_voc). Carries the mandatory
   * "For a {activity}, …" framing per voice spec §3.3 and is bounded at
   * ≤ 150 chars by the source dictionary. Optional preserves backward
   * compatibility with existing mobile decoders that pre-date this field.
   */
  severity_hint: z.string().max(150).optional(),
});
export type DailyNoteOutput = z.infer<typeof DailyNoteOutputSchema>;

/** One saved-search status entry per PICKER-CONTRACT.md §2. */
export const SavedSearchStatusSchema = z.object({
  id: z.string(),
  activity: ActivitySchema,
  state: SavedSearchStateSchema,
  // null for state === 'none-yet'; tz-aware ISO with offset otherwise.
  window_start: z.string().nullable(),
  window_end: z.string().nullable(),
  is_stronger: z.boolean().optional(),
  new_score: z.number().optional(),
  prior_best_score: z.number().optional(),
  alert_id: z.string().optional(),
  acknowledged: z.boolean().optional(),
  priority: z.number(),
  searched_through: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type SavedSearchStatus = z.infer<typeof SavedSearchStatusSchema>;

/**
 * The full /daily-note response shape — mirrors `DailyNoteResponseShape` in
 * `packages/translations/src/types.ts`. Mobile validates with this
 * on receipt and treats any parse failure as a fatal cache-miss + retry.
 *
 * The `cache_hit` flag is appended by the Worker for telemetry; it isn't
 * part of the contract per se but the schema accepts it.
 */
export const DailyNoteResponseSchema = z.object({
  daily_note: DailyNoteOutputSchema,
  saved_searches: z.array(SavedSearchStatusSchema),
  total_saved_count: z.number().int().min(0),
  library_version: z.string(),
  part_of_day_cutoffs: PartOfDayCutoffsSchema,
  cache_hit: z.boolean().optional(),
});
export type DailyNoteResponse = z.infer<typeof DailyNoteResponseSchema>;
