import type {
  Activity,
  FactorId,
  FactorStatus,
  ReasonId,
} from '@inceptio/shared-types';

// ─── Locale spine (VOICE phase — spec §2/§3) ───────────────────────────────
/**
 * The five supported locales. `en` is authoritative; the other four are
 * filled per-dictionary by the parallel D-tasks. Routes resolve X-Locale to
 * one of these once at the top (default 'en') and thread it down.
 */
export type Locale = 'en' | 'de' | 'fr' | 'es-419' | 'pt-BR';

/**
 * A user-facing leaf that is EITHER a plain English string (the state every
 * dictionary is in until its D-task migrates it) OR a per-locale Record.
 * The composer threads `locale` to every leaf-read and resolves via
 * `localize()` exactly once at the terminal function — so dictionaries can
 * migrate string → Record file-by-file with no spine coordination.
 */
export type Localized<T = string> = T | Record<Locale, T>;

/**
 * Resolve a `Localized<T>` to the requested locale.
 *
 * Tolerates BOTH shapes by design (the lynchpin of the spine, per plan §0):
 *   - a plain value (string/object lacking an `en` key) → returned verbatim
 *     (English-everywhere — the pre-migration state);
 *   - a `Record<Locale, T>` → `[locale]`, falling back to `.en` for a
 *     not-yet-translated locale.
 *
 * The `'en' in v` guard distinguishes the two: a migrated leaf is the only
 * object carrying an `en` key. A plain string fails the `typeof === 'object'`
 * test and is returned as-is.
 */
export function localize<T>(v: Localized<T>, locale: Locale): T {
  return (v && typeof v === 'object' && 'en' in (v as object))
    ? ((v as Record<Locale, T>)[locale] ?? (v as Record<Locale, T>).en)
    : (v as T);
}

/** The two text fragments produced per factor instance. */
export interface FactorPhrasing {
  /** Under 8 words. Used on cards and in factor-list rows. */
  phrase_short: string;
  /** 1–2 sentences. Used in narrative paragraphs on the moment-detail screen. */
  phrase_full: string;
}

/**
 * Base entry per factor_id. `partial` and `fail` fall back to `pass`
 * when omitted, so editors only have to write the rarer polarities
 * when the meaning genuinely diverges.
 */
export interface FactorEntry {
  polarity_aware: {
    pass: FactorPhrasing;
    partial?: FactorPhrasing;
    fail?: FactorPhrasing;
  };
}

/** Per-activity tone overrides. Each field deep-merges over the base entry. */
export type ActivityOverrides = Partial<
  Record<
    FactorId,
    {
      polarity_aware?: {
        pass?: Partial<FactorPhrasing>;
        partial?: Partial<FactorPhrasing>;
        fail?: Partial<FactorPhrasing>;
      };
    }
  >
>;

/** Softens the API's English label into Inceptio's voice. */
export interface ReasonEntry {
  phrase: string;
}

/**
 * Each translated factor row carries enough to render at L2 directly
 * (phrase_short on a row, phrase_full in a paragraph). The mobile app
 * filters by status — pass+partial on L2, all (including fail) on L3.
 *
 * factor_id is `string`, not the `FactorId` union, because the schema is
 * permissive (z.string()): upstream may emit an id outside KNOWN_FACTOR_IDS
 * and the translator forwards it verbatim with a fallback phrasing.
 */
export interface DisplayableFactor {
  factor_id: string;
  status: FactorStatus;
  phrase_short: string;
  phrase_full: string;
}

/**
 * Per-window tagline picked for cross-window distinguishability — see
 * `pickTagline()` in translate.ts. May come from a factor (in which case
 * factor_id + phrase_full are populated) or from a contextual fallback
 * (morning/afternoon/evening — only phrase_short is set).
 */
export interface DisplayableTagline {
  factor_id?: string;
  phrase_short: string;
  phrase_full?: string;
}

export interface DisplayableWindow {
  headline: string;
  factors: DisplayableFactor[];
  tagline: DisplayableTagline;
}

// reason_id is `string` for the same reason factor_id is — see DisplayableFactor.
export interface DisplayableExcludedRange {
  reason_id: string;
  phrase: string;
}

/** The Worker-level headline that L1 surfaces (Today + No-Viable screens). */
export interface DisplayableSummary {
  headline: string;
}

/**
 * Compose with the existing per-activity tables so a missing entry falls back
 * cleanly. Used by the headline synthesizer.
 */
export type HeadlineOverrides = Partial<
  Record<Activity, Partial<Record<FactorId, Partial<Record<FactorStatus, Localized>>>>>
>;

// ─── Daily-note layer (spec: docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md) ───

/** Which UI surface the entry serves. Drives lint-rule scope (see §5.3). */
export type Surface = 'daily-note' | 'status-line';

/** Quality buckets for daily-note entries — see spec §3.2. */
export type QualityBucket = 'strong' | 'good' | 'mixed' | 'closed';

/** Horizon-class metadata — see spec §3.1, enforced by lint per §5. */
export type HorizonClass = 'static' | 'vague' | 'concrete-date' | 'intraday';

/** A single daily-note library entry — see spec §3.1. */
export interface DailyNoteEntry {
  id: string;
  quality_bucket: QualityBucket;
  // `Localized` (VOICE phase): plain string today (en-everywhere); the
  // D-dailynotes task migrates to a per-locale Record. The picker resolves via
  // `localize()` once at `finalize`. Structural metadata (horizon_class,
  // pending_astrologer_ruling, etc.) stays ABOVE the localized leaf.
  headline: Localized;
  supporting_line: Localized;
  horizon_class: HorizonClass;
  /**
   * PROVISIONAL — see spec §3.1. This is a hint for the picker design, not a
   * finished selection contract. The picker hardens these into precise rules
   * (see daily-notes/picker.ts).
   */
  dominant_factors_hint: string;
  surface: Surface;
  /**
   * True for any entry with horizon_class === 'concrete-date' (and the one
   * intraday entry that may fail intraday computation). When true, the picker
   * MUST have a vague fallback to fall through to when the horizon can't be
   * verified — see daily-notes/picker.ts.
   */
  needs_vague_fallback: boolean;
  /**
   * If true, this entry's phrasing is awaiting an astrologer ruling per spec
   * §11.4 (currently entries 16 + 17). The entry ships with its current
   * draft phrasing; Task 17 applies the final ruling.
   */
  pending_astrologer_ruling?: true;
}

/**
 * Some long-running excluded-range entries (Mercury rx ~3 weeks, Venus rx
 * ~40 days, Mars rx ~80 days) need sibling variants so users don't see the
 * identical headline 21 days running. A primary `DailyNoteEntry` references
 * its sibling pool by id; the picker rotates between them deterministically
 * (date-seeded hash) — see daily-notes/picker.ts.
 */
export interface DailyNoteVariantPool {
  primary_entry_id: string;
  variants: Array<{
    // `Localized` (VOICE phase) — see DailyNoteEntry. Resolved at `finalize`.
    headline: Localized;
    supporting_line: Localized;
  }>;
}

/** Status-line template — see spec §6.3. */
export interface StatusLineTemplate {
  id: string;
  surface: 'status-line';
  /** Template string. `{activity_noun}` interpolates from ACTIVITY_NOUNS. */
  template: string;
}

// ─── Saved-search lifecycle (PICKER-CONTRACT.md §1) ───
/**
 * Five-state lifecycle for a saved search. The picker is the authority on
 * transitions; the client may self-transition between pre-window ↔ in-window
 * ↔ passed against `window_start`/`window_end` timestamps to avoid a forced
 * refetch.
 *
 * IMPORTANT: `none-yet` is NEW (not in spec §6's status-line library). Trigger:
 * the picker has run with zero qualifying windows in the saved search's range.
 * Mutually exclusive with `pre-window`; can also recur post-window if the
 * window passes and nothing else qualifies.
 */
export type SavedSearchState =
  | 'none-yet'
  | 'pre-window'
  | 'new-window'
  | 'in-window'
  | 'passed';

// ─── Moon phase (PICKER-CONTRACT.md §2) ───
/**
 * Backend-computed per the design-pass contract. Note: CLAUDE.md's prior
 * statement that moon phase is mobile-computed is SUPERSEDED — the design
 * pass moved it server-side so the hero moon glyph can be driven by it
 * without each mobile build duplicating the ephemeris algorithm.
 */
export type MoonPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

// ─── Part-of-day cutoffs (PICKER-CONTRACT.md §3 — backend-owned config) ───
/**
 * Backend-owned config. Must match the Translation Layer moment-detail
 * `phrase_short` part-of-day rendering or the same window reads "afternoon"
 * on the daily note and "morning" on moment-detail. Lives in
 * `workers/api-proxy/src/translations/` alongside the synthesizer config.
 *
 * Hours are 0-23 in the event location's timezone. `morning` covers
 * [0, morning_end_hour); `afternoon` [morning_end_hour, afternoon_end_hour);
 * `evening` [afternoon_end_hour, evening_end_hour); `night` the remainder.
 */
export interface PartOfDayCutoffs {
  morning_end_hour: number;
  afternoon_end_hour: number;
  evening_end_hour: number;
}

// ─── Picker output shape (PICKER-CONTRACT.md §2) ───
/**
 * What the picker returns for the daily note. Single object — mood is on the
 * SAME object as the chosen phrase, derived from that phrase's quality_bucket
 * so mood and copy can never drift.
 */
export interface DailyNoteOutput {
  /** Derived from chosen entry's quality_bucket; not independently selected. */
  mood: QualityBucket;
  /** Backend-computed moon phase for the daily note's date. */
  moon_phase: MoonPhase;
  /** ISO YYYY-MM-DD in the event location's timezone. */
  date: string;
  /** Locked copy headline (<= 48 chars). */
  headline: string;
  /** Locked copy supporting line (<= 140 chars). */
  supporting: string;
  /**
   * Reason_id when an exclusion drove the picker — surfaced for the optional
   * glyph on closed days. Not required by the current visual design.
   */
  exclusion_reason?: string;
  /** For introspection/caching; not consumed by client UI. */
  entry_id: string;
  /** True when the picker fell through to a vague-variant fallback. */
  used_fallback: boolean;
  /**
   * Optional activity-asymmetric clarifier — mirrors
   * DailyNoteOutputSchema.severity_hint in shared-types. Composed by
   * `composeDisplayable` when the picked entry maps to an asymmetric
   * exclusion condition (mercury_retrograde, venus_retrograde, moon_voc).
   * Bounded at ≤ 150 chars by the severity-hints dictionary.
   */
  severity_hint?: string;
}

/** Saved-search status — array, one per saved search (PICKER-CONTRACT.md §2). */
export interface SavedSearchStatusOutput {
  id: string;
  activity: import('@inceptio/shared-types').Activity;
  state: SavedSearchState;
  /**
   * Timezone-aware ISO timestamp in the EVENT location's zone (NOT the
   * device's). Null when state === 'none-yet'.
   */
  window_start: string | null;
  /** Same tz contract as window_start. Null when state === 'none-yet'. */
  window_end: string | null;
  /** Required for state === 'new-window'. */
  is_stronger?: boolean;
  new_score?: number;
  prior_best_score?: number;
  /**
   * Required for state === 'new-window' so the alert fires exactly once and
   * doesn't re-trigger on reopen. Client posts the ack to
   * POST /daily-note/alert-ack.
   */
  alert_id?: string;
  acknowledged?: boolean;
  /** Sort key for the bounded 3-stack — lower = higher priority. */
  priority: number;
  /**
   * Optional. For state === 'none-yet', enables a future "searched through
   * August" affordance. Kept in the contract pending the deferred UX question.
   */
  searched_through?: string;
}

/** The full /daily-note response (PICKER-CONTRACT.md §2). */
export interface DailyNoteResponseShape {
  daily_note: DailyNoteOutput;
  saved_searches: SavedSearchStatusOutput[];
  /** Drives "+N more →" when greater than saved_searches.length. */
  total_saved_count: number;
  /** Cache invalidation stamp — see PICKER-CONTRACT.md §6 and LIBRARY_VERSION below. */
  library_version: string;
  /** Backend-owned config the client applies for part-of-day rendering. */
  part_of_day_cutoffs: PartOfDayCutoffs;
}

// ─── Library version (PICKER-CONTRACT.md §6) ───
/**
 * Bump in the SAME PR as any change to:
 *   - dictionary/daily-notes.ts
 *   - dictionary/daily-note-fallbacks.ts
 *   - dictionary/daily-note-variants.ts
 *   - the part-of-day cutoffs config
 *
 * Drives atomic client-cache invalidation: clients store this stamp with
 * cached daily-notes and bust on mismatch. Critical for the astrologer-ruling
 * lockstep PR (Task 17) — copy and cutoffs must roll over together.
 *
 * Date-stamped + revision suffix so semantic ordering is human-readable.
 */
// VOICE phase: bumped when the locale spine landed (X-Locale now threaded
// through composition + both cache keys; client daily-note cache busts).
export const LIBRARY_VERSION = '2026-06-08-r1';

/**
 * The 21 entry ids defined in spec §3.3. The dictionary in
 * `dictionary/daily-notes.ts` MUST cover all of these; the lint
 * (lint-library.test.ts) asserts this.
 */
export const KNOWN_DAILY_NOTE_IDS = [
  // Strong
  'strong-sky-is-clear',
  'strong-venus-jupiter-pair',
  'strong-ruler-in-motion',
  // Good
  'good-venus-warm',
  'good-mercury-clear',
  'good-moon-steady',
  'good-jupiter-room-to-grow',
  'good-moon-toward-benefic',
  'good-moon-asc-accord',
  // Mixed
  'mixed-mercury-clear-jupiter-absent',
  'mixed-venus-gentle-saturn-near',
  'mixed-moon-void-until-noon',
  'mixed-moon-steady-sky-thin',
  'mixed-venus-bright-mercury-dim',
  // Closed
  'closed-moon-voc',
  'closed-mercury-retrograde',
  'closed-venus-retrograde',
  'closed-eclipse-window',
  'closed-malefic-on-angle',
  'closed-long-quiet-stretch',
  'closed-moon-via-combusta',
] as const;

export type KnownDailyNoteId = (typeof KNOWN_DAILY_NOTE_IDS)[number];
