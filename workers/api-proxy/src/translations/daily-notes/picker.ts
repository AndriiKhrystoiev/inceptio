import type { ExcludedRange, Window } from '@inceptio/shared-types';
import { DAILY_NOTES } from '../dictionary/daily-notes';
import { DAILY_NOTE_FALLBACKS } from '../dictionary/daily-note-fallbacks';
import { DAILY_NOTE_VARIANT_POOLS } from '../dictionary/daily-note-variants';
import type { DailyNoteEntry, KnownDailyNoteId, QualityBucket } from '../types';
import { isHorizonWithin3Days, nextStationOf } from './horizon';
import { assignBucket } from './quality-bucket';

/**
 * Picker input — see PICKER-CONTRACT.md §4 for the timezone-correctness rationale.
 *
 * IMPORTANT: `today_iso_date` is a WALL-CLOCK date string (YYYY-MM-DD) in the
 * EVENT location's timezone, NOT a UTC Date object. The Worker endpoint MUST
 * format `now` in the event tz (e.g. `Intl.DateTimeFormat('en-CA', { timeZone })`)
 * before calling this function. Passing a naive UTC date breaks day-name and
 * part-of-day derivations for users searching a moment in another city.
 */
export interface SynthesizeInput {
  topWindow: Window;
  /** ExcludedRanges from the API whose [from, to] interval covers today. */
  excludedRangesActiveToday: ExcludedRange[];
  /** ISO YYYY-MM-DD wall-clock date in the event location's timezone. */
  today_iso_date: string;
  /**
   * Upstream's `summary.no_viable_windows` — the authoritative closed
   * signal. When true, the day is closed regardless of any per-window
   * score; when false, an active named exclusion is a partial-day
   * caveat that routes through the mixed bucket. See
   * `quality-bucket.ts` for the full rationale and voice spec's
   * "Post-MVP empirical discoveries" section.
   */
  noViableWindows: boolean;
}

/**
 * What the picker returns — entry selection layer of the daily note.
 *
 * SEPARATE from `DailyNoteOutput` (the /daily-note response shape). This shape
 * is internal to the Worker; the endpoint composes the full `DailyNoteOutput`
 * by adding `moon_phase` (Task 16) and any envelope fields (Task 18).
 *
 * `mood` is derived from the chosen entry's `quality_bucket` — single source
 * of truth so mood and copy cannot drift.
 */
export interface PickResult {
  /** For cache key + introspection. Not consumed by the client UI. */
  entry_id: string;
  /** Derived from chosen entry's `quality_bucket`. */
  mood: QualityBucket;
  /** Forwarded from input — ISO YYYY-MM-DD in event tz. */
  date: string;
  /** Locked copy. */
  headline: string;
  /** Locked copy. (Note: spec/dictionary field is `supporting_line`; the picker exposes it as `supporting` per contract §2.) */
  supporting: string;
  /** Present when an exclusion drove the pick (bucket === 'closed'). */
  exclusion_reason?: string;
  /** True when the picker fell through to a vague-variant fallback. */
  used_fallback: boolean;
}

/**
 * Map a reason_id to its closed-bucket entry id. The picker prefers the
 * exclusion-specific entry over the generic `closed-long-quiet-stretch`.
 */
const REASON_TO_ENTRY: Record<string, KnownDailyNoteId> = {
  moon_voc: 'closed-moon-voc',
  mercury_retrograde: 'closed-mercury-retrograde',
  venus_retrograde: 'closed-venus-retrograde',
  eclipse_window: 'closed-eclipse-window',
  malefic_on_angle: 'closed-malefic-on-angle',
  moon_via_combusta: 'closed-moon-via-combusta',
  // mars_retrograde / jupiter_retrograde / saturn_retrograde — fall through to long-quiet
};

/**
 * Pick the daily-note entry per spec §4.5 decision tree:
 *
 *   1. Day has named exclusion → closed bucket, exclusion-specific entry
 *      (with horizon verification + fallback for concrete-class entries).
 *   2. Strong bucket (score >= 75) → strong entry.
 *   3. Good bucket (60..74) → good entry by dominant factor.
 *   4. Mixed bucket (< 60) → mixed entry by dominant factor.
 */
export function synthesizeDailyNote(input: SynthesizeInput): PickResult {
  const hasNamedExclusion = input.excludedRangesActiveToday.length > 0;
  const bucket = assignBucket(
    input.topWindow.score,
    input.noViableWindows,
    hasNamedExclusion,
  );

  // Branch 1 — closed by no_viable_windows (the authoritative day-closed
  // signal). The exclusion-reason entry is preferred when an exclusion
  // covers today; otherwise falls through to closed-long-quiet-stretch.
  if (bucket === 'closed') {
    return pickClosedEntry(input);
  }

  // Branches 2-4 — score-band picks via dominant factor. Note that
  // bucket === 'mixed' here can arise from EITHER a low score (no
  // exclusion) OR a partial-day exclusion with viable top windows
  // (assignBucket §post-MVP-empirical-discoveries rule). The selection
  // within the mixed bucket is the same either way: pick by dominant
  // PASS factor of the surviving top window.
  return pickByDominantFactor(input, bucket);
}

function pickClosedEntry(input: SynthesizeInput): PickResult {
  // Prefer the most-specific named exclusion (highest severity, falling back
  // to first in list). Severity is `'hard_stop' | 'medium'` per shared-types
  // (`packages/shared-types/src/api/excluded-range.ts:30` SeveritySchema).
  // Hard stops outrank medium.
  const SEVERITY_RANK = { medium: 0, hard_stop: 1 } as const;
  const sorted = [...input.excludedRangesActiveToday].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  const reason = sorted[0]?.reason_id;
  // `reason ? X : undefined` keeps the narrowed type at KnownDailyNoteId | undefined.
  // The shorter `reason && REASON_TO_ENTRY[reason]` evaluates to "" when reason
  // is "", and ?? doesn't fall through on "" (only null/undefined), which would
  // hand `entryId = ""` and crash the next DAILY_NOTES[entryId] lookup.
  const mapped: KnownDailyNoteId | undefined = reason ? REASON_TO_ENTRY[reason] : undefined;
  const entryId: KnownDailyNoteId = mapped ?? 'closed-long-quiet-stretch';
  const entry = DAILY_NOTES[entryId];

  // Concrete-class entries need horizon verification — fall through to the
  // vague fallback when the named horizon doesn't verify.
  if (entry.horizon_class === 'concrete-date' && entry.needs_vague_fallback) {
    const todayDate = new Date(`${input.today_iso_date}T00:00:00Z`);
    if (!verifyConcreteHorizon(entry.id, todayDate)) {
      return useFallback(entry.id, input.today_iso_date, reason);
    }
  }

  return finalize(entry, false, input.today_iso_date, reason);
}

function pickByDominantFactor(
  input: SynthesizeInput,
  bucket: 'strong' | 'good' | 'mixed',
): PickResult {
  const passFactors = input.topWindow.factors.filter((f) => f.status === 'pass');

  // Strong bucket: pick the "many factors PASS" entry when 6+ PASS; otherwise
  // fall to the most distinctive PASS pair (Venus + Jupiter or asc-ruler trio).
  if (bucket === 'strong') {
    if (passFactors.length >= 6) {
      return finalize(DAILY_NOTES['strong-sky-is-clear'], false, input.today_iso_date);
    }
    const hasVenus = passFactors.some(
      (f) => f.factor_id === 'venus_dignified_direct_well_aspected' && f.weight_class === 'high',
    );
    const hasJupiter = passFactors.some(
      (f) => f.factor_id === 'jupiter_angular_or_aspecting' && f.weight_class === 'high',
    );
    if (hasVenus && hasJupiter) {
      return finalize(DAILY_NOTES['strong-venus-jupiter-pair'], false, input.today_iso_date);
    }
    return finalize(DAILY_NOTES['strong-ruler-in-motion'], false, input.today_iso_date);
  }

  // Good/Mixed: pick by highest-weight PASS factor's id.
  const lead = rankFactors(passFactors)[0];
  const leadId = lead?.factor_id;

  // Good bucket
  if (bucket === 'good') {
    if (leadId === 'venus_dignified_direct_well_aspected')
      return finalize(DAILY_NOTES['good-venus-warm'], false, input.today_iso_date);
    if (leadId === 'mercury_dignified_direct_not_combust')
      return finalize(DAILY_NOTES['good-mercury-clear'], false, input.today_iso_date);
    if (leadId === 'jupiter_angular_or_aspecting')
      return finalize(DAILY_NOTES['good-jupiter-room-to-grow'], false, input.today_iso_date);
    if (leadId === 'moon_applying_to_benefic')
      return finalize(DAILY_NOTES['good-moon-toward-benefic'], false, input.today_iso_date);
    if (leadId === 'moon_and_asc_ruler_in_good_aspect')
      return finalize(DAILY_NOTES['good-moon-asc-accord'], false, input.today_iso_date);
    return finalize(DAILY_NOTES['good-moon-steady'], false, input.today_iso_date);
  }

  // Mixed bucket (default fallthrough)
  //
  // NOTE on Entry 12 (mixed-moon-void-until-noon): this entry requires
  // intraday void-of-course timing computation which is deliberately stubbed
  // for MVP (see verifyConcreteHorizon below and spec §10 out-of-scope). The
  // entry sits in the dictionary; the picker never selects it via the current
  // logic. When a future iteration wires intraday detection, add an
  // explicit branch here before the venusPass check that picks entry 12 when
  // an intraday void is confirmed and ends before evening.
  const venusPass = passFactors.some(
    (f) => f.factor_id === 'venus_dignified_direct_well_aspected',
  );
  const mercuryPass = passFactors.some(
    (f) => f.factor_id === 'mercury_dignified_direct_not_combust',
  );
  if (mercuryPass && !passFactors.some((f) => f.factor_id === 'jupiter_angular_or_aspecting')) {
    return finalize(DAILY_NOTES['mixed-mercury-clear-jupiter-absent'], false, input.today_iso_date);
  }
  if (venusPass && !mercuryPass) {
    return finalize(DAILY_NOTES['mixed-venus-bright-mercury-dim'], false, input.today_iso_date);
  }
  return finalize(DAILY_NOTES['mixed-moon-steady-sky-thin'], false, input.today_iso_date);
}

/** Order factors by weight_class desc, then contribution desc. Mirrors synthesizer.ts. */
function rankFactors<T extends { weight_class: string; contribution: number }>(
  factors: T[],
): T[] {
  const WEIGHT = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  return [...factors].sort((a, b) => {
    const w =
      (WEIGHT[b.weight_class as keyof typeof WEIGHT] ?? 0) -
      (WEIGHT[a.weight_class as keyof typeof WEIGHT] ?? 0);
    return w !== 0 ? w : b.contribution - a.contribution;
  });
}

function verifyConcreteHorizon(entryId: string, today: Date): boolean {
  if (entryId === 'closed-mercury-retrograde') {
    const station = nextStationOf('mercury', 'direct', today);
    return station !== null && isHorizonWithin3Days(today, station);
  }
  if (entryId === 'closed-malefic-on-angle') {
    // Stub: the API would need to confirm the malefic moves off the angle by
    // tomorrow. For MVP we approximate as "true unless we know otherwise" and
    // the architecture session is expected to wire a per-day check.
    return true;
  }
  if (entryId === 'mixed-moon-void-until-noon') {
    // Stub: intraday void timing requires per-hour ephemeris. Architecture
    // session wires this; for MVP we return false to safely fall to vague.
    return false;
  }
  return true;
}

function useFallback(entryId: string, today_iso_date: string, exclusion_reason?: string): PickResult {
  const fallback = DAILY_NOTE_FALLBACKS[entryId as KnownDailyNoteId];
  if (!fallback) {
    // Defensive: declared needs_vague_fallback but none defined. Fall to the
    // bucket's safest entry instead of crashing.
    return finalize(DAILY_NOTES['closed-long-quiet-stretch'], true, today_iso_date, exclusion_reason);
  }
  return finalize(fallback, true, today_iso_date, exclusion_reason);
}

function finalize(
  entry: DailyNoteEntry,
  usedFallback: boolean,
  today_iso_date: string,
  exclusion_reason?: string,
): PickResult {
  // Skip rotation for fallback entries — they already represent the
  // horizon-fail branch and should be a single voice.
  if (usedFallback) {
    return {
      entry_id: entry.id,
      mood: entry.quality_bucket,
      date: today_iso_date,
      headline: entry.headline,
      supporting: entry.supporting_line,
      exclusion_reason,
      used_fallback: true,
    };
  }

  const pool = DAILY_NOTE_VARIANT_POOLS[entry.id as KnownDailyNoteId];
  if (!pool) {
    return {
      entry_id: entry.id,
      mood: entry.quality_bucket,
      date: today_iso_date,
      headline: entry.headline,
      supporting: entry.supporting_line,
      exclusion_reason,
      used_fallback: false,
    };
  }

  // All siblings: [primary, ...variants]
  const siblings = [
    { headline: entry.headline, supporting_line: entry.supporting_line },
    ...pool.variants,
  ];
  const index = dateSeededHash(today_iso_date, entry.id) % siblings.length;
  const chosen = siblings[index]!;
  return {
    entry_id: entry.id,
    mood: entry.quality_bucket,
    date: today_iso_date,
    headline: chosen.headline,
    supporting: chosen.supporting_line,
    exclusion_reason,
    used_fallback: false,
  };
}

/**
 * Deterministic non-cryptographic hash of (date string, entry id). Same
 * inputs always produce the same output — required for the daily-cache
 * contract. Uses FNV-1a 32-bit; sufficient for variant-rotation diffusion.
 *
 * Takes `today_iso_date: string` (YYYY-MM-DD wall-clock in event tz) directly
 * — no Date conversion needed for hashing. Matches the picker's tz-correctness
 * contract (no UTC-vs-local ambiguity in the hash seed).
 */
function dateSeededHash(today_iso_date: string, salt: string): number {
  const seed = today_iso_date + ':' + salt;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
