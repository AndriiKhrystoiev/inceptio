# Daily Timing Layer — Architecture & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the voice/copy spec at `docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md` to a working Cloudflare-Worker-hosted daily-note feature: 21-entry phrase library wired through a deterministic picker that respects horizon verification, long-condition variation, and the §5 boundary lint — exposed via a `/daily-note` endpoint mobile can consume.

**Architecture:** Extend the existing translation layer (`workers/api-proxy/src/translations/`) with a new `daily-notes/` sibling to `headlines/`. Picker follows the established `synthesizer.ts` pattern (deterministic, factor-ranked, comparator-driven). Caching reuses the existing KV namespace binding `CACHE`. Lint runs in the existing vitest test suite via a new golden-file pattern that coexists with the factory-style fixtures. Astrologer's two BLOCKING rulings on Entries 16/17 are handled by parameterizing those entries and swapping final phrasings in via the last task — implementation does not block on the external review.

**Tech Stack:** TypeScript strict, Cloudflare Worker (wrangler), Workers KV, vitest, Zod (in shared-types). Mobile pieces produce schemas in `@inceptio/shared-types` for the React Native side to consume later via TanStack Query — UI integration is a separate plan handed off to Claude Design first.

---

## Amendment — 2026-05-29 — design-pass contract integration

The picker contract at `docs/superpowers/design-handoff/daily-note/PICKER-CONTRACT.md` is now the authoritative artifact for Tasks 10+. Three adjustments agreed at the design pass:

1. **`mood` is derived, not independently selected.** The picker returns it on the same object as the chosen phrase, computed from `quality_bucket` — single source of truth so mood can never drift from the chosen phrase.
2. **`activity_label` is NOT in the contract.** Activity-noun mapping (spec §6.3) is locked and derived client-side from the `activity` enum — keeps the client from drifting from the audited library.
3. **Part-of-day cutoffs are backend-owned config**, living in `workers/api-proxy/src/translations/`. Must match the Translation Layer moment-detail `phrase_short` part-of-day rendering. This is both a UX-consistency requirement (same window can't read "afternoon" here and "morning" in moment-detail) AND an astrology-policy decision (where "afternoon" begins is tradition, not UI).

Plus contract §6 adds **library-version cache invalidation**: when the astrologer rules on the spec's BLOCKING #1/#2 (Mercury rx + Venus rx phrasings), copy AND part-of-day cutoffs must roll over atomically via a single `library_version` stamp — not piecemeal invalidation. The architecture session builds this hook.

### Plan deltas from the contract

| Change | Where in plan | Status |
|---|---|---|
| Add `MoonPhase`, `SavedSearchState` (5-state enum), `DailyNoteOutput`, `SavedSearchStatusOutput`, `PartOfDayCutoffs` types + `LIBRARY_VERSION` constant | Task 1 — extended inline below | **applied** |
| Add `STATUS_NONE_YET` status-line templates | Task 4 — extended inline below | **applied** |
| **NEW Task — part-of-day cutoffs config** (backend-owned per contract §3) | Insert between Task 10 (horizon) and Task 11 (picker) | drafted when dispatched |
| **NEW Task — moon-phase computation** (deterministic algorithm, backend per contract §2 — supersedes the CLAUDE.md note that moon phase is mobile-computed) | Insert before Task 11 (picker) | drafted when dispatched |
| Picker returns a tighter `PickResult` (entry_id, mood, date, headline, supporting, exclusion_reason?, used_fallback) — split from `DailyNoteOutput` so the picker stays focused on selection and doesn't own moon-phase ephemeris. Endpoint composes the full response. Input `today_iso_date: string` instead of `today: Date` to make contract §4 tz-correctness explicit at the call site. | Task 11 — **applied** (rewritten in place 2026-05-29 after the picker checkpoint) | **applied** |
| **NEW Task — saved-search state derivation** (5-state lifecycle including `none-yet`) | Insert before status-line ordering (current Task 13) | drafted when dispatched |
| Status-line ordering — extend for 5-state enum (none-yet, new-window added; post-window renamed to passed) | Task 13 — updated when dispatched | drafted when dispatched |
| Daily-note cache — `library_version` stamp + atomic invalidation | Task 14 — updated when dispatched | drafted when dispatched |
| Worker `/daily-note` endpoint — full contract response shape (incl. `library_version`, `part_of_day_cutoffs`, `total_saved_count`) | Task 15 — updated when dispatched | drafted when dispatched |
| **NEW Task — alert-ack endpoint** (`POST /daily-note/alert-ack`) for once-only `new-window` alerts | Insert before shared-types (current Task 16) | drafted when dispatched |
| Shared-types — full contract schema with all contract §2 fields | Task 16 — updated when dispatched | drafted when dispatched |
| Astrologer-ruling task — bump `LIBRARY_VERSION` constant in the lockstep PR so caches roll atomically | Task 17 — note added when dispatched | drafted when dispatched |

Tasks marked "drafted when dispatched" expand with concrete code blocks at the moment their subagent is briefed — keeping the integration aligned with what actually got implemented in upstream tasks rather than pre-writing details that may shift. The amendment table above is the running checklist.

### Checkpoint sequencing (per user)

- **Pause before the picker hardens.** The picker is currently Task 11 in the as-written plan; once part-of-day cutoffs and moon-phase tasks insert (between Task 10 and Task 11), the picker shifts to Task 13. Either way: when we reach the picker, I bring the proposed output shape back for contract verification against the rendered states before the picker subagent runs.
- **Task 17 (astrologer-ruled copy swap)** stays gated on the actual astrologer ruling, even when everything else is green. Do not auto-execute.

### Open product question (deferred — flag at saved-search state task)

`none-yet` state — does `"Travel window — none yet"` stand alone, or does it need a `searched_through` affordance (`"none yet through August"`)? The contract keeps `searched_through` in §2 either way. UX decision lives in the saved-search state derivation task; surface it then for the user to resolve.

---

## File Structure

**New files (Worker):**
- `workers/api-proxy/src/translations/types.ts` — extended with `DailyNoteEntry`, `StatusLineTemplate`, `Surface`, `QualityBucket`, `HorizonClass` types (modify existing file)
- `workers/api-proxy/src/translations/dictionary/daily-notes.ts` — the 21 library entries from spec §3.3
- `workers/api-proxy/src/translations/dictionary/daily-note-variants.ts` — sibling-variant rotation pool for long-running conditions (Mercury rx, Venus rx)
- `workers/api-proxy/src/translations/dictionary/status-lines.ts` — status-line template strings + activity-noun mapping
- `workers/api-proxy/src/translations/dictionary/empty-state.ts` — empty-state invite copy
- `workers/api-proxy/src/translations/daily-notes/quality-bucket.ts` — score-to-bucket function with exclusion precedence
- `workers/api-proxy/src/translations/daily-notes/horizon.ts` — horizon verification (planetary-station calendar + ≤3-day check)
- `workers/api-proxy/src/translations/daily-notes/picker.ts` — main daily-note synthesizer (entry point: `synthesizeDailyNote()`)
- `workers/api-proxy/src/translations/daily-notes/status-line-ordering.ts` — multi-search stacking sort + 3-cap
- `workers/api-proxy/src/translations/daily-notes/lint.ts` — boundary-test lint logic for entries
- `workers/api-proxy/src/translations/daily-notes/index.ts` — barrel exports
- `workers/api-proxy/src/translations/__tests__/daily-notes.test.ts` — picker + variant tests
- `workers/api-proxy/src/translations/__tests__/quality-bucket.test.ts` — bucket assignment tests
- `workers/api-proxy/src/translations/__tests__/horizon.test.ts` — horizon helper tests
- `workers/api-proxy/src/translations/__tests__/status-line-ordering.test.ts` — ordering + 3-cap tests
- `workers/api-proxy/src/translations/__tests__/boundary-tests.golden.ts` — boundary-lint fixtures
- `workers/api-proxy/src/translations/__tests__/boundary-tests.test.ts` — runner over the golden file
- `workers/api-proxy/src/translations/__tests__/lint-library.test.ts` — runs lint against all 21 entries
- `workers/api-proxy/src/routes/daily-note.ts` — Worker route handler
- `workers/api-proxy/src/daily-note-cache.ts` — KV cache wrapper specific to the daily-note key shape

**New files (shared-types):**
- `packages/shared-types/src/api/daily-note.ts` — `DailyNoteResponse` Zod schema for mobile to validate

**Modified files:**
- `workers/api-proxy/src/index.ts` — add `/daily-note` route
- `workers/api-proxy/src/translations/index.ts` — re-export the daily-notes module
- `packages/shared-types/src/api/index.ts` — re-export `daily-note.ts`

**Rule of thumb during implementation:**
- Files at the top of `dictionary/` are *data only* (no logic) — they read as authoritative reference for what the daily note says.
- Files under `daily-notes/` are *logic only* — picker, lint, horizon — they read from the dictionaries.
- Tests in `__tests__/` follow the existing vitest pattern (factory helpers in `fixtures.ts` for `Window`, `Factor`, etc.) plus the NEW golden-file pattern introduced for boundary tests.

---

## Astrologer-ruling sequencing — parameterize, don't block

Spec §11.4 has TWO launch-blocking items (Entries 16 + 17 phrasings). This plan handles them by:
1. Implementing Entries 16/17 with the current draft phrasings ("Mercury is sleeping" / "Venus is resting").
2. Marking both entries with a `pending_astrologer_ruling: true` flag visible in code and tests.
3. Task 17 (last task) applies the ruling: a small coordinated PR touching this dictionary + `excluded-reasons.ts` + `CLAUDE.md` together.

This unblocks the rest of implementation. The astrologer review can run in parallel with Tasks 1–16.

---

# Phase 1 — Foundation

## Task 1: Translation-layer types + KNOWN_DAILY_NOTE_IDS

**Files:**
- Modify: `workers/api-proxy/src/translations/types.ts`

- [ ] **Step 1: Add the new types to `types.ts`**

Add these declarations at the bottom of the existing file (after the existing exports):

```ts
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
  headline: string;
  supporting_line: string;
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
    headline: string;
    supporting_line: string;
  }>;
}

/** Status-line template — see spec §6.3. */
export interface StatusLineTemplate {
  id: string;
  surface: 'status-line';
  /** Template string. `{activity_noun}` interpolates from ACTIVITY_NOUNS. */
  template: string;
}
```

- [ ] **Step 1b: Append the design-pass contract types**

Append to `types.ts`, immediately after the types from Step 1:

```ts
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
export const LIBRARY_VERSION = '2026-05-28-r1';
```

- [ ] **Step 2: Add `KNOWN_DAILY_NOTE_IDS` constant**

Append to `types.ts`:

```ts
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
```

- [ ] **Step 3: Verify type-check passes**

Run: `cd workers/api-proxy && pnpm tsc --noEmit`
Expected: PASS — no type errors. (If `pnpm` isn't available, fall back to `npx tsc --noEmit`.)

- [ ] **Step 4: Commit**

```bash
git add workers/api-proxy/src/translations/types.ts
git commit -m "feat(types): add daily-note layer types per spec §3.1"
```

---

## Task 2: Quality-bucket assignment

**Files:**
- Create: `workers/api-proxy/src/translations/daily-notes/quality-bucket.ts`
- Test: `workers/api-proxy/src/translations/__tests__/quality-bucket.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/quality-bucket.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assignBucket } from '../daily-notes/quality-bucket';

describe('assignBucket', () => {
  describe('without excluded ranges', () => {
    it('returns "strong" for scores >= 75', () => {
      expect(assignBucket(75, false)).toBe('strong');
      expect(assignBucket(89, false)).toBe('strong');
      expect(assignBucket(100, false)).toBe('strong');
    });
    it('returns "good" for 60..74', () => {
      expect(assignBucket(60, false)).toBe('good');
      expect(assignBucket(72, false)).toBe('good');
      expect(assignBucket(74, false)).toBe('good');
    });
    it('returns "mixed" for 40..59', () => {
      expect(assignBucket(40, false)).toBe('mixed');
      expect(assignBucket(59, false)).toBe('mixed');
    });
    it('returns "mixed" for raw scores below 40 when no exclusion (per spec §3.2, the "poor" 0-39 band almost never appears without an exclusion; if it does, mixed is the safer copy register)', () => {
      expect(assignBucket(0, false)).toBe('mixed');
      expect(assignBucket(39, false)).toBe('mixed');
    });
  });

  describe('with excluded ranges — precedence rule (spec §4.5 branch 1)', () => {
    it('returns "closed" regardless of raw score when has_named_exclusion is true', () => {
      expect(assignBucket(72, true)).toBe('closed');
      expect(assignBucket(85, true)).toBe('closed');
      expect(assignBucket(0, true)).toBe('closed');
    });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/quality-bucket.test.ts`
Expected: FAIL — "Cannot find module '../daily-notes/quality-bucket'".

- [ ] **Step 3: Implement `quality-bucket.ts`**

Create `daily-notes/quality-bucket.ts`:

```ts
import type { QualityBucket } from '../types';

/**
 * Map a top-window score (0-100) + presence-of-named-exclusion to a daily-note
 * quality bucket — see spec §3.2 and the §4.5 branch-1-wins precedence rule
 * (named exclusion beats raw-score weakness; this is NOT provisional).
 *
 * Bucket thresholds:
 *  - strong: 75+         (rare in real data)
 *  - good:   60..74      (the realistic win; design's emotional target)
 *  - mixed:  0..59       (collapses raw "poor" 0-39 into mixed for copy register)
 *  - closed: any score with an active excluded range covering today
 */
export function assignBucket(
  topScore: number,
  hasNamedExclusion: boolean,
): QualityBucket {
  if (hasNamedExclusion) return 'closed';
  if (topScore >= 75) return 'strong';
  if (topScore >= 60) return 'good';
  return 'mixed';
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/quality-bucket.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/src/translations/daily-notes/quality-bucket.ts \
        workers/api-proxy/src/translations/__tests__/quality-bucket.test.ts
git commit -m "feat(daily-notes): quality-bucket assignment with exclusion precedence"
```

---

# Phase 2 — Library data

## Task 3: Daily-notes dictionary (21 entries)

**Files:**
- Create: `workers/api-proxy/src/translations/dictionary/daily-notes.ts`

This task is pure data transcription from spec §3.3. The entries are the authoritative content; this file is the single source of truth in code.

- [ ] **Step 1: Create the dictionary file with all 21 entries**

Create `dictionary/daily-notes.ts`:

```ts
import type { DailyNoteEntry, KnownDailyNoteId } from '../types';

/**
 * The 21 daily-note library entries — see spec §3.3 for authoritative content.
 * Order matches the spec. Each entry is transcribed verbatim including any
 * post-hardening / post-audit revisions.
 *
 * IMPORTANT: entries 16 + 17 carry `pending_astrologer_ruling: true` per
 * spec §11.4 BLOCKING items. Task 17 of the implementation plan applies the
 * final ruling — until then they ship with their current draft phrasings.
 */
export const DAILY_NOTES: Record<KnownDailyNoteId, DailyNoteEntry> = {
  // ─── Strong (75+) ───

  'strong-sky-is-clear': {
    id: 'strong-sky-is-clear',
    quality_bucket: 'strong',
    headline: 'A wide-open day — the sky is clear.',
    supporting_line:
      "Good for big asks, launches, and decisions you've been holding. Few days like this in a season.",
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — >= 6 factors PASS, no factor FAIL, no excluded ranges',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'strong-venus-jupiter-pair': {
    id: 'strong-venus-jupiter-pair',
    quality_bucket: 'strong',
    headline: 'A rare, full-handed day.',
    supporting_line:
      'Venus and Jupiter both in good standing — good for promises, partnerships, and starting things meant to last.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS + jupiter_angular_or_aspecting PASS, both at weight_class >= high',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'strong-ruler-in-motion': {
    id: 'strong-ruler-in-motion',
    quality_bucket: 'strong',
    headline: 'A bright day for setting things in motion.',
    supporting_line:
      "The kind of stretch worth using on something you've been waiting for. Good for nearly anything you've been putting off.",
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — asc_ruler_strong PASS + house_ruler_dignified_well_placed PASS + jupiter_angular_or_aspecting PASS',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Good (60..74) ───

  'good-venus-warm': {
    id: 'good-venus-warm',
    quality_bucket: 'good',
    headline: 'A tender day for beginnings.',
    supporting_line:
      'Venus is warm and dignified — good for soft conversations, small promises, and first steps. Hold the heaviest signings for clearer days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-mercury-clear': {
    id: 'good-mercury-clear',
    quality_bucket: 'good',
    headline: 'A clear day for plain words.',
    supporting_line:
      'Mercury runs clear — good for signing, sending, and saying what you mean. A workable stretch for paperwork.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — mercury_dignified_direct_not_combust PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-steady': {
    id: 'good-moon-steady',
    quality_bucket: 'good',
    headline: 'A steady day for what already exists.',
    supporting_line:
      'The Moon holds its shape — good for tending ongoing work, follow-ups, and keeping promises already made.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_waxing_increasing_light PARTIAL or moon_and_asc_ruler_in_good_aspect PASS; no strong "beginnings" factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-jupiter-room-to-grow': {
    id: 'good-jupiter-room-to-grow',
    quality_bucket: 'good',
    headline: 'A day with room to grow.',
    supporting_line:
      'Jupiter is in view — good for asking for more than you usually would. Workable for launches, applications, and openings.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — jupiter_angular_or_aspecting PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-toward-benefic': {
    id: 'good-moon-toward-benefic',
    quality_bucket: 'good',
    headline: 'A day for going further.',
    supporting_line:
      "The Moon moves toward a kind meeting — good for reaching out, asking for things you've been meaning to ask, and conversations meant to land well.",
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_applying_to_benefic PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-asc-accord': {
    id: 'good-moon-asc-accord',
    quality_bucket: 'good',
    headline: 'A day of quiet accord.',
    supporting_line:
      'The Moon and the planet that stands for you are in good aspect — good for mutual decisions, joint paperwork, and meeting halfway.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_and_asc_ruler_in_good_aspect PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Mixed / Caution (40..59) ───

  'mixed-mercury-clear-jupiter-absent': {
    id: 'mixed-mercury-clear-jupiter-absent',
    quality_bucket: 'mixed',
    headline: 'A day for plain words, not big asks.',
    supporting_line:
      'Mercury runs clear, but Jupiter is absent — good for short messages and follow-ups; hold the big proposals for clearer days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — mercury_dignified_direct_not_combust PASS + jupiter_angular_or_aspecting FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-venus-gentle-saturn-near': {
    id: 'mixed-venus-gentle-saturn-near',
    quality_bucket: 'mixed',
    headline: 'Workable, with patience.',
    supporting_line:
      "Venus is gentle but Saturn is nearby — good for finishing what's started; hold off on starting anything new today.",
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PARTIAL + house_free_of_malefic PARTIAL or FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-moon-void-until-noon': {
    id: 'mixed-moon-void-until-noon',
    quality_bucket: 'mixed',
    headline: 'A quieter morning, clearer after noon.',
    supporting_line:
      'The Moon is between aspects until midday — time important calls for the afternoon.',
    horizon_class: 'intraday',
    dominant_factors_hint:
      'PROVISIONAL — intraday moon-void or moon-via-combusta ending before today\'s evening; the picker MUST verify intraday timing exists for today specifically',
    surface: 'daily-note',
    needs_vague_fallback: true,
  },

  'mixed-moon-steady-sky-thin': {
    id: 'mixed-moon-steady-sky-thin',
    quality_bucket: 'mixed',
    headline: 'A day for tending, not building.',
    supporting_line:
      'The Moon is steady but the sky is thin — good for follow-ups, edits, and small corrections. Save the launches for stronger days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — moon_waxing_increasing_light PASS but most other dominant factors FAIL or PARTIAL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-venus-bright-mercury-dim': {
    id: 'mixed-venus-bright-mercury-dim',
    quality_bucket: 'mixed',
    headline: 'A mixed day — choose carefully.',
    supporting_line:
      'Venus is bright but Mercury is dim — good for soft conversations; hold the signed paperwork.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS + mercury_dignified_direct_not_combust FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Closed-by-exclusion ───

  'closed-moon-voc': {
    id: 'closed-moon-voc',
    quality_bucket: 'closed',
    headline: 'The Moon is between signs today.',
    supporting_line:
      "A stretch where new starts don't take root — good for finishing, sorting, and waiting. Better days are nearby.",
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'moon_voc' covering today's daylight hours",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-mercury-retrograde': {
    id: 'closed-mercury-retrograde',
    quality_bucket: 'closed',
    headline: 'Mercury is sleeping.',
    supporting_line:
      'Words need extra care until Thursday — good for re-reading and editing; hold the heavy signing for clearer days.',
    horizon_class: 'concrete-date',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'mercury_retrograde' AND Mercury direct-station date is <= 3 days away",
    surface: 'daily-note',
    needs_vague_fallback: true,
    pending_astrologer_ruling: true,
  },

  'closed-venus-retrograde': {
    id: 'closed-venus-retrograde',
    quality_bucket: 'closed',
    headline: 'Venus is resting.',
    supporting_line:
      'A long quiet stretch for matters of the heart — good for tending what already exists; new commitments can wait.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'venus_retrograde' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
    pending_astrologer_ruling: true,
  },

  'closed-eclipse-window': {
    id: 'closed-eclipse-window',
    quality_bucket: 'closed',
    headline: 'An eclipse week — the sky asks for stillness.',
    supporting_line:
      'Hold off on starts and big decisions while the eclipse passes. Better days are within reach.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'eclipse_window' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-malefic-on-angle': {
    id: 'closed-malefic-on-angle',
    quality_bucket: 'closed',
    headline: 'A difficult planet sits on the angles today.',
    supporting_line:
      'A charged stretch — better used for closing things than starting them. Tomorrow opens cleaner.',
    horizon_class: 'concrete-date',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'malefic_on_angle' covering today AND the malefic moves off the angle by tomorrow",
    surface: 'daily-note',
    needs_vague_fallback: true,
  },

  'closed-long-quiet-stretch': {
    id: 'closed-long-quiet-stretch',
    quality_bucket: 'closed',
    headline: 'A long quiet stretch in the sky.',
    supporting_line:
      'Not a day for new starts — good for sorting, naming, and getting your list straight before clearer days arrive.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — extended period of multiple overlapping excluded ranges or persistently low scores; the default closed-by-exclusion fallback when no single named reason dominates',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-moon-via-combusta': {
    id: 'closed-moon-via-combusta',
    quality_bucket: 'closed',
    headline: 'A more difficult Moon today.',
    supporting_line:
      'The Moon walks the via combusta — good for closing things, sorting, and waiting. Better days are nearby.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'moon_via_combusta' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },
};
```

- [ ] **Step 2: Run type-check**

Run: `cd workers/api-proxy && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add workers/api-proxy/src/translations/dictionary/daily-notes.ts
git commit -m "feat(daily-notes): 21-entry library dictionary per spec §3.3"
```

---

## Task 4: Status-line library + activity-noun mapping

**Files:**
- Create: `workers/api-proxy/src/translations/dictionary/status-lines.ts`

- [ ] **Step 1: Create the status-line dictionary**

Create `dictionary/status-lines.ts`:

```ts
import type { Activity } from '@inceptio/shared-types';
import type { StatusLineTemplate } from '../types';

/**
 * Activity-noun mapping for status lines — see spec §6.3. Each activity gets
 * one noun; the template `{activity_noun} window — {temporal_phrase}.`
 * interpolates these.
 */
export const ACTIVITY_NOUNS: Record<Activity, string> = {
  wedding: 'Wedding',
  contracts: 'Contract',
  business_launch: 'Launch',
  travel: 'Travel',
};

/**
 * Status-line templates. The picker selects one based on temporal state
 * (pre-window N days out, in-window, alert, post-window) and interpolates
 * the activity noun from ACTIVITY_NOUNS. See spec §6.3.1-§6.3.4.
 *
 * NOTE the §5.3 asymmetry: the 3-day horizon rule does NOT apply to these
 * (surface === 'status-line'). User has opted in by saving the search.
 */

// ─── §6.3.1 Pre-window (countdown) ───
export const STATUS_PRE_WINDOW: StatusLineTemplate[] = [
  { id: 'pre-window-today', surface: 'status-line',
    template: 'Your {activity_noun_lower} window opens today.' },
  { id: 'pre-window-tomorrow', surface: 'status-line',
    template: '{activity_noun} window — tomorrow.' },
  { id: 'pre-window-n-days', surface: 'status-line',
    template: '{activity_noun} window — in {n} days.' },             // 2..3
  { id: 'pre-window-day-name', surface: 'status-line',
    template: '{activity_noun} window — {day_name}.' },              // 2..3
  { id: 'pre-window-later-this-week', surface: 'status-line',
    template: '{activity_noun} window — later this week.' },         // 4..7
  { id: 'pre-window-about-week', surface: 'status-line',
    template: '{activity_noun} window — about a week away.' },       // 8..14
  { id: 'pre-window-about-n-weeks', surface: 'status-line',
    template: '{activity_noun} window — about {weeks} weeks away.' }, // 15..30
  { id: 'pre-window-late-month', surface: 'status-line',
    template: '{activity_noun} window — late {month_name}.' },        // 31..90
  { id: 'pre-window-month', surface: 'status-line',
    template: '{activity_noun} window — {month_name}.' },             // 90+
  { id: 'pre-window-season', surface: 'status-line',
    template: '{activity_noun} window — {season}.' },                 // 90+, alt
];

// ─── NEW per PICKER-CONTRACT.md §1 — none-yet state ───
// Active search, no viable window found yet. Not in spec §6's library;
// added at the design pass. Two templates: the bare form and one carrying
// the searched_through horizon (used if the deferred UX question lands on
// "yes, show the horizon").
export const STATUS_NONE_YET: StatusLineTemplate[] = [
  { id: 'none-yet-bare', surface: 'status-line',
    template: '{activity_noun} window — none yet.' },
  { id: 'none-yet-with-horizon', surface: 'status-line',
    template: '{activity_noun} window — none yet through {month_name}.' },
];

// ─── §6.3.2 In-window (EMPHASIZED — see spec §8.3) ───
export const STATUS_IN_WINDOW: StatusLineTemplate[] = [
  { id: 'in-window-open', surface: 'status-line',
    template: "You're inside your {activity_noun_lower} window." },           // > 1h left
  { id: 'in-window-hour-left', surface: 'status-line',
    template: '{activity_noun} window — open for another hour.' },             // <= 1h
  { id: 'in-window-closing-soon', surface: 'status-line',
    template: '{activity_noun} window — closing soon.' },                       // <= 15 min
];

// ─── §6.3.3 New-window alert (EMPHASIZED) ───
export const STATUS_NEW_WINDOW_ALERT: StatusLineTemplate[] = [
  { id: 'alert-concrete-day', surface: 'status-line',
    template: 'A stronger {activity_noun_lower} window — {day_name} afternoon.' }, // <= 3 days
  { id: 'alert-concrete-day-next-week', surface: 'status-line',
    template: 'A stronger {activity_noun_lower} window — {day_name} next week.' }, // 4..14
  { id: 'alert-late-month', surface: 'status-line',
    template: 'A stronger {activity_noun_lower} window — late {month_name}.' },     // 14+
  { id: 'alert-vague', surface: 'status-line',
    template: 'A clearer {activity_noun_lower} window opened in your search.' },     // no close horizon
];

// ─── §6.3.4 Post-window ───
export const STATUS_POST_WINDOW: StatusLineTemplate[] = [
  { id: 'post-window-just-passed', surface: 'status-line',
    template: 'Your {activity_noun_lower} window has passed. Choose another?' },        // <= 7 days
  { id: 'post-window-month-ago', surface: 'status-line',
    template: 'Your search closed in {month_name}. Choose another moment?' },           // 7..30
  { id: 'post-window-older', surface: 'status-line',
    template: 'An older search — choose another moment to look at?' },                  // > 30
];

/**
 * Render an activity-noun substitution. For `{activity_noun_lower}` and
 * `{activity_noun}` both. Templates use whichever is grammatically right
 * for the sentence.
 */
export function renderActivityNoun(
  template: string,
  activity: Activity,
): string {
  const noun = ACTIVITY_NOUNS[activity];
  return template
    .replace(/\{activity_noun_lower\}/g, noun.toLowerCase())
    .replace(/\{activity_noun\}/g, noun);
}
```

- [ ] **Step 2: Run type-check**

Run: `cd workers/api-proxy && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add workers/api-proxy/src/translations/dictionary/status-lines.ts
git commit -m "feat(daily-notes): status-line templates + activity-noun mapping (spec §6.3)"
```

---

## Task 5: Empty-state invite

**Files:**
- Create: `workers/api-proxy/src/translations/dictionary/empty-state.ts`

- [ ] **Step 1: Create the empty-state invite file**

Create `dictionary/empty-state.ts`:

```ts
/**
 * Empty-state invite copy — see spec §6.2.
 *
 * Shown alongside the daily note (not inside it) when
 * `saved_searches.length === 0`. The daily note stays voice-pure for ALL
 * users; this invite is a separate UI element.
 */
export const EMPTY_STATE_INVITE_PRIMARY = 'Choose a moment of your own →';

export const EMPTY_STATE_INVITE_ALTERNATIVES = [
  'For a moment of your own — choose what to begin →',
  'When a specific moment matters, choose what to look at →',
  'For a specific moment — yours to choose →',
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add workers/api-proxy/src/translations/dictionary/empty-state.ts
git commit -m "feat(daily-notes): empty-state invite copy (spec §6.2)"
```

---

## Task 6: Vague-variant fallbacks for entries 12, 16, 19

**Files:**
- Create: `workers/api-proxy/src/translations/dictionary/daily-note-fallbacks.ts`

The three concrete-horizon entries (12, 16, 19) each need a vague-class fallback the picker falls through to when the horizon can't be verified — see spec §3.1.

- [ ] **Step 1: Create the fallbacks file**

Create `dictionary/daily-note-fallbacks.ts`:

```ts
import type { DailyNoteEntry, KnownDailyNoteId } from '../types';

/**
 * Vague-variant fallbacks for daily-note entries with
 * `needs_vague_fallback: true` — see spec §3.1 and §5.
 *
 * The picker chooses the primary entry when its horizon is verifiable
 * (intraday timing exists / concrete day is <= 3 days away). When the
 * horizon FAILS to verify, the picker falls through to the matching fallback
 * here. Fallbacks share the same `dominant_factors_hint` and `quality_bucket`
 * as their primary — only the phrasing changes (concrete → vague).
 */
export const DAILY_NOTE_FALLBACKS: Partial<Record<KnownDailyNoteId, DailyNoteEntry>> = {
  // Fallback for entry 12 (`mixed-moon-void-until-noon`) when intraday
  // timing of the void cannot be computed cheaply.
  'mixed-moon-void-until-noon': {
    id: 'mixed-moon-void-until-noon-vague',
    quality_bucket: 'mixed',
    headline: 'A quieter stretch in the sky.',
    supporting_line:
      'The Moon is between aspects today — time important calls for when the sky settles.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'mixed-moon-void-until-noon', applied when intraday timing not available",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // Fallback for entry 16 (`closed-mercury-retrograde`) when Mercury direct
  // station is > 3 days away — drops the "until Thursday" concrete promise.
  'closed-mercury-retrograde': {
    id: 'closed-mercury-retrograde-vague',
    quality_bucket: 'closed',
    headline: 'Mercury is sleeping.',
    supporting_line:
      'Words need extra care for now — good for re-reading and editing; hold the heavy signing for clearer days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'closed-mercury-retrograde', applied when Mercury direct station > 3 days away",
    surface: 'daily-note',
    needs_vague_fallback: false,
    pending_astrologer_ruling: true,
  },

  // Fallback for entry 19 (`closed-malefic-on-angle`) when the malefic does
  // NOT move off the angle by tomorrow — drops the "Tomorrow opens cleaner" promise.
  'closed-malefic-on-angle': {
    id: 'closed-malefic-on-angle-vague',
    quality_bucket: 'closed',
    headline: 'A difficult planet sits on the angles today.',
    supporting_line:
      'A charged stretch — better used for closing things than starting them. Clearer days are within reach.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'closed-malefic-on-angle', applied when malefic remains on the angle past tomorrow",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },
};
```

- [ ] **Step 2: Run type-check**

Run: `cd workers/api-proxy && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add workers/api-proxy/src/translations/dictionary/daily-note-fallbacks.ts
git commit -m "feat(daily-notes): vague-variant fallbacks for entries 12, 16, 19 (spec §3.1)"
```

---

# Phase 3 — Lint (boundary tests)

## Task 7: Boundary-tests golden file

**Files:**
- Create: `workers/api-proxy/src/translations/__tests__/boundary-tests.golden.ts`

- [ ] **Step 1: Create the golden file with all fixtures from spec §5.4**

Create `__tests__/boundary-tests.golden.ts`:

```ts
import type { Surface } from '../types';

/**
 * Boundary-test fixtures — see spec §5.4 and §2.1.
 *
 * The `phrase` strings in must-fail fixtures are NEGATIVE EXAMPLES showing
 * what the lint must reject. They are NOT current §3.3 library entries.
 * Several mirror pre-hardening versions of current entries to guard against
 * regression to the §3.4-removed phrasings.
 *
 * `today_offset_days` is the day-distance from "today" to the named day
 * referenced in `phrase` (where applicable). null when not applicable.
 */
export interface BoundaryFixture {
  id: string;
  surface: Surface;
  phrase: string;
  today_offset_days: number | null;
  expected: 'pass' | 'fail';
  reason: string;
}

export const BOUNDARY_FIXTURES: BoundaryFixture[] = [
  // ─── Must-PASS fixtures ───
  {
    id: 'lint-pass-statusline-5day-named-day',
    surface: 'status-line',
    phrase: 'Wedding window — Tuesday.',
    today_offset_days: 5,
    expected: 'pass',
    reason:
      'Status lines are user-opted-in; the 3-day rule applies only to the daily-note surface.',
  },
  {
    id: 'lint-pass-dailynote-2day-named-day',
    surface: 'daily-note',
    phrase:
      'Words need extra care until Thursday — hold the heavy signing for clearer days.',
    today_offset_days: 2,
    expected: 'pass',
    reason: 'Concrete horizon <= 3 days; allowed.',
  },
  {
    id: 'lint-pass-dailynote-vague-fallback',
    surface: 'daily-note',
    phrase:
      'Words need extra care for now — hold the heavy signing for clearer days.',
    today_offset_days: null,
    expected: 'pass',
    reason: 'Vague horizon; always allowed.',
  },
  {
    id: 'lint-pass-statusline-late-month',
    surface: 'status-line',
    phrase: 'Wedding window — late November.',
    today_offset_days: 180,
    expected: 'pass',
    reason: 'Status-line surface exempt from 3-day rule.',
  },

  // ─── Must-FAIL fixtures ───
  // NEGATIVE EXAMPLES — see comment in spec §5.4.
  {
    id: 'lint-fail-dailynote-5day-named-day',
    surface: 'daily-note',
    phrase:
      'Words need extra care until Tuesday — hold the heavy signing for clearer days.',
    today_offset_days: 5,
    expected: 'fail',
    reason: 'Concrete horizon > 3 days on daily-note surface; must render vague fallback.',
  },
  {
    id: 'lint-fail-dailynote-next-week',
    surface: 'daily-note',
    phrase: 'Hold the big proposals for next week.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden phrase 'next week' on daily-note surface.",
  },
  {
    id: 'lint-fail-dailynote-this-season',
    surface: 'daily-note',
    phrase: 'Venus is resting this season.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden phrase 'this season' on daily-note surface.",
  },
  {
    id: 'lint-fail-dailynote-imperative-inner-state',
    surface: 'daily-note',
    phrase: "Embrace today's quiet — be present with what is.",
    today_offset_days: null,
    expected: 'fail',
    reason: 'Imperatives about inner state fail the subject test (§2.1).',
  },
  {
    id: 'lint-fail-dailynote-forbidden-universe',
    surface: 'daily-note',
    phrase: 'The universe wants you to begin today.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden subject 'the universe' (§2.1 test 1).",
  },
  {
    id: 'lint-fail-dailynote-forbidden-luck',
    surface: 'daily-note',
    phrase: 'Luck is on your side today.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden word 'luck' (§2.1 test 5).",
  },
  {
    id: 'lint-fail-dailynote-mood-prediction',
    surface: 'daily-note',
    phrase: "You'll feel confident today.",
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden mood-prediction construction 'you'll feel' (§2.1 test 5).",
  },
];
```

- [ ] **Step 2: Run type-check**

Run: `cd workers/api-proxy && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add workers/api-proxy/src/translations/__tests__/boundary-tests.golden.ts
git commit -m "test(daily-notes): boundary-test golden fixtures (spec §5.4)"
```

---

## Task 8: Boundary-tests runner

**Files:**
- Create: `workers/api-proxy/src/translations/__tests__/boundary-tests.test.ts`

- [ ] **Step 1: Write the runner (expected to fail initially — lint doesn't exist yet)**

Create `__tests__/boundary-tests.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintPhrase } from '../daily-notes/lint';
import { BOUNDARY_FIXTURES } from './boundary-tests.golden';

describe('boundary tests — five tests + 3-day rule + surface asymmetry', () => {
  it.each(BOUNDARY_FIXTURES)(
    '$id ($expected) — $reason',
    ({ surface, phrase, today_offset_days, expected }) => {
      const result = lintPhrase({ surface, phrase, today_offset_days });
      if (expected === 'pass') {
        expect(result.ok).toBe(true);
      } else {
        expect(result.ok).toBe(false);
      }
    },
  );
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/boundary-tests.test.ts`
Expected: FAIL — "Cannot find module '../daily-notes/lint'". This failure is expected and is the starting state for Task 9.

- [ ] **Step 3: Commit (failing test)**

```bash
git add workers/api-proxy/src/translations/__tests__/boundary-tests.test.ts
git commit -m "test(daily-notes): boundary-tests runner — fails pending lint impl (Task 9)"
```

---

## Task 9: Lint logic — boundary tests + 3-day rule + asymmetry

**Files:**
- Create: `workers/api-proxy/src/translations/daily-notes/lint.ts`
- Create: `workers/api-proxy/src/translations/__tests__/lint-library.test.ts`

- [ ] **Step 1: Implement the lint**

Create `daily-notes/lint.ts`:

```ts
import type { Surface } from '../types';

export interface LintInput {
  surface: Surface;
  phrase: string;
  /** Days from today to the named day in `phrase`. null when not applicable. */
  today_offset_days: number | null;
}

export interface LintResult {
  ok: boolean;
  reasons: string[];
}

/** Locked forbidden words from CLAUDE.md + spec §2.1 test 5 additions. */
const FORBIDDEN_WORDS = [
  // CLAUDE.md locked
  'magic',
  'destiny',
  'fortune',
  'stars align',
  'manifest',
  'vibes',
  'blessed',
  // §2.1 daily-layer additions
  'the universe',
  'luck',
  "you'll feel",
  "you'll have",
  "you'll find",
  "today is your",
  'let yourself',
  // §5 daily-note forbidden horizon phrases (only fail on daily-note surface)
] as const;

/** Phrases forbidden specifically on the daily-note surface (per §5). */
const DAILY_NOTE_FORBIDDEN_HORIZONS = [
  'next week',
  'later this month',
  'after the retrograde station',
  'this season',
  'for the next few days',
] as const;

/**
 * Imperatives about inner state (§2.1 imperative addendum). These verbs
 * directed at the reader hide a "you" subject and fail the subject test.
 */
const FORBIDDEN_INNER_STATE_IMPERATIVES = [
  'embrace ',
  'open yourself',
  'be present',
  'make the most of',
  'trust the process',
  'tap into',
] as const;

/** Day-name words that may trigger the 3-day rule when on daily-note surface. */
const DAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

/**
 * Lint a single phrase against the five boundary tests + 3-day rule.
 * Respects the §5.3 asymmetry: 3-day rule fires only when surface === 'daily-note'.
 */
export function lintPhrase(input: LintInput): LintResult {
  const reasons: string[] = [];
  const lower = input.phrase.toLowerCase();

  // ─── Test 5 (forbidden words) — applies on both surfaces ───
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word)) {
      reasons.push(`Forbidden word/phrase: "${word}" (§2.1 test 5).`);
    }
  }

  // ─── Test 1 imperative addendum — applies on both surfaces ───
  for (const verb of FORBIDDEN_INNER_STATE_IMPERATIVES) {
    if (lower.includes(verb)) {
      reasons.push(
        `Imperative about inner state: "${verb.trim()}" (§2.1 test 1 imperative addendum).`,
      );
    }
  }

  // ─── §5 daily-note-only checks ───
  if (input.surface === 'daily-note') {
    // Forbidden-horizon phrases
    for (const phrase of DAILY_NOTE_FORBIDDEN_HORIZONS) {
      if (lower.includes(phrase)) {
        reasons.push(
          `Forbidden horizon phrase on daily-note surface: "${phrase}" (§5).`,
        );
      }
    }

    // 3-day rule on named days
    if (input.today_offset_days !== null && input.today_offset_days > 3) {
      const namedDay = DAY_NAMES.find((d) => lower.includes(d));
      if (namedDay) {
        reasons.push(
          `Concrete horizon "${namedDay}" is ${input.today_offset_days} days away (> 3) on daily-note surface; must render vague fallback (§5).`,
        );
      }
    }
  }

  return { ok: reasons.length === 0, reasons };
}
```

- [ ] **Step 2: Run boundary-tests runner, verify it passes**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/boundary-tests.test.ts`
Expected: PASS — all 11 fixtures.

- [ ] **Step 3: Add lint-library test that runs lint against all 21 entries**

Create `__tests__/lint-library.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DAILY_NOTES } from '../dictionary/daily-notes';
import { DAILY_NOTE_FALLBACKS } from '../dictionary/daily-note-fallbacks';
import { lintPhrase } from '../daily-notes/lint';
import { KNOWN_DAILY_NOTE_IDS } from '../types';

const CHAR_LIMITS = {
  headline_max: 48,
  supporting_line_max: 140,
} as const;

describe('library lint — every entry must pass boundary tests + char limits', () => {
  describe('DAILY_NOTES (primary entries)', () => {
    it('covers all 21 KNOWN_DAILY_NOTE_IDS', () => {
      for (const id of KNOWN_DAILY_NOTE_IDS) {
        expect(DAILY_NOTES[id], `missing entry: ${id}`).toBeDefined();
      }
    });

    it.each(KNOWN_DAILY_NOTE_IDS)('entry %s: headline within 48 chars', (id) => {
      const entry = DAILY_NOTES[id];
      expect(entry.headline.length).toBeLessThanOrEqual(CHAR_LIMITS.headline_max);
    });

    it.each(KNOWN_DAILY_NOTE_IDS)(
      'entry %s: supporting_line within 140 chars',
      (id) => {
        const entry = DAILY_NOTES[id];
        expect(entry.supporting_line.length).toBeLessThanOrEqual(
          CHAR_LIMITS.supporting_line_max,
        );
      },
    );

    it.each(KNOWN_DAILY_NOTE_IDS)(
      'entry %s: headline + supporting_line both lint-clean',
      (id) => {
        const entry = DAILY_NOTES[id];
        // For named-day check we pass today_offset_days: 2 (within rule) since
        // the dictionary entries are templates the renderer fills with the
        // current day; the dictionary phrasings themselves don't reference
        // specific days. Concrete-class entries with day names get their
        // horizon verified at render time, not lint time.
        const headlineResult = lintPhrase({
          surface: 'daily-note',
          phrase: entry.headline,
          today_offset_days: null,
        });
        expect(headlineResult.reasons).toEqual([]);
        const supportingResult = lintPhrase({
          surface: 'daily-note',
          phrase: entry.supporting_line,
          today_offset_days: 2,
        });
        expect(supportingResult.reasons).toEqual([]);
      },
    );

    it('every entry with needs_vague_fallback: true has a fallback in DAILY_NOTE_FALLBACKS', () => {
      for (const id of KNOWN_DAILY_NOTE_IDS) {
        const entry = DAILY_NOTES[id];
        if (entry.needs_vague_fallback) {
          expect(
            DAILY_NOTE_FALLBACKS[id],
            `entry ${id} declares needs_vague_fallback but has no fallback`,
          ).toBeDefined();
        }
      }
    });
  });

  describe('DAILY_NOTE_FALLBACKS', () => {
    const fallbackIds = Object.keys(DAILY_NOTE_FALLBACKS);

    it.each(fallbackIds)('fallback %s: lint-clean and vague', (id) => {
      const entry = DAILY_NOTE_FALLBACKS[id as keyof typeof DAILY_NOTE_FALLBACKS]!;
      expect(entry.horizon_class).toBe('vague');
      const headlineResult = lintPhrase({
        surface: 'daily-note',
        phrase: entry.headline,
        today_offset_days: null,
      });
      expect(headlineResult.reasons).toEqual([]);
      const supportingResult = lintPhrase({
        surface: 'daily-note',
        phrase: entry.supporting_line,
        today_offset_days: null,
      });
      expect(supportingResult.reasons).toEqual([]);
    });
  });
});
```

- [ ] **Step 4: Run lint-library test**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/lint-library.test.ts`
Expected: PASS — all 21 entries + 3 fallbacks lint-clean and within char limits.

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/src/translations/daily-notes/lint.ts \
        workers/api-proxy/src/translations/__tests__/lint-library.test.ts
git commit -m "feat(daily-notes): lint — five boundary tests, 3-day rule, surface asymmetry"
```

---

# Phase 4 — Picker

## Task 10: Horizon verification — planetary-stations calendar

**Files:**
- Create: `workers/api-proxy/src/translations/daily-notes/horizon.ts`
- Test: `workers/api-proxy/src/translations/__tests__/horizon.test.ts`

The picker needs to check: given a concrete horizon phrase ("until Thursday"), is the referenced day actually ≤ 3 days away AND does the named condition (e.g. Mercury direct station) actually happen on that day?

For MVP this uses a small hardcoded calendar of station dates for the next 12 months. Refresh policy is deferred to the maintenance plan after launch.

- [ ] **Step 1: Write the failing test**

Create `__tests__/horizon.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  isHorizonWithin3Days,
  nextStationOf,
  type Planet,
} from '../daily-notes/horizon';

describe('daysUntil', () => {
  it('returns 0 when target is today', () => {
    expect(daysUntil(new Date('2026-05-28'), new Date('2026-05-28'))).toBe(0);
  });
  it('returns 3 when target is 3 days later', () => {
    expect(daysUntil(new Date('2026-05-28'), new Date('2026-05-31'))).toBe(3);
  });
  it('returns negative when target is in the past', () => {
    expect(daysUntil(new Date('2026-05-28'), new Date('2026-05-25'))).toBe(-3);
  });
});

describe('isHorizonWithin3Days', () => {
  const today = new Date('2026-05-28');
  it('returns true for 0, 1, 2, 3 days', () => {
    expect(isHorizonWithin3Days(today, new Date('2026-05-28'))).toBe(true);
    expect(isHorizonWithin3Days(today, new Date('2026-05-29'))).toBe(true);
    expect(isHorizonWithin3Days(today, new Date('2026-05-30'))).toBe(true);
    expect(isHorizonWithin3Days(today, new Date('2026-05-31'))).toBe(true);
  });
  it('returns false for 4+ days', () => {
    expect(isHorizonWithin3Days(today, new Date('2026-06-01'))).toBe(false);
    expect(isHorizonWithin3Days(today, new Date('2026-06-28'))).toBe(false);
  });
  it('returns false for past dates', () => {
    expect(isHorizonWithin3Days(today, new Date('2026-05-27'))).toBe(false);
  });
});

describe('nextStationOf', () => {
  it('returns Mercury direct-station date for a known mid-2026 retrograde', () => {
    // Mercury retrograde stations Aug 8 2026 (Rx) → Aug 31 2026 (D)
    const after = new Date('2026-08-10');
    const result = nextStationOf('mercury', 'direct', after);
    expect(result?.toISOString().startsWith('2026-08-31')).toBe(true);
  });
  it('returns null when no station of that planet/kind exists within the calendar window', () => {
    const after = new Date('2030-01-01');
    expect(nextStationOf('mercury', 'direct', after)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/horizon.test.ts`
Expected: FAIL — "Cannot find module '../daily-notes/horizon'".

- [ ] **Step 3: Implement `horizon.ts`**

Create `daily-notes/horizon.ts`:

```ts
export type Planet = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export type StationKind = 'retrograde' | 'direct';

interface Station {
  planet: Planet;
  kind: StationKind;
  date: string; // ISO yyyy-mm-dd
}

/**
 * Planetary stations for 2026-2027 used by horizon verification.
 *
 * Source: any reputable ephemeris. These dates are approximations rounded to
 * the day — the picker needs day-level precision, not the exact UTC second.
 *
 * MAINTENANCE: refresh annually before each year ends. Until then, when the
 * calendar window is exhausted, horizon verification returns null and the
 * picker falls through to vague variants — that is the safe failure mode.
 */
const STATIONS: Station[] = [
  // 2026
  { planet: 'mercury', kind: 'retrograde', date: '2026-04-09' },
  { planet: 'mercury', kind: 'direct',     date: '2026-05-02' },
  { planet: 'mercury', kind: 'retrograde', date: '2026-08-08' },
  { planet: 'mercury', kind: 'direct',     date: '2026-08-31' },
  { planet: 'mercury', kind: 'retrograde', date: '2026-11-25' },
  { planet: 'mercury', kind: 'direct',     date: '2026-12-15' },
  { planet: 'venus',   kind: 'retrograde', date: '2026-10-03' },
  { planet: 'venus',   kind: 'direct',     date: '2026-11-13' },
  { planet: 'mars',    kind: 'retrograde', date: '2027-01-10' },
  { planet: 'jupiter', kind: 'retrograde', date: '2026-11-03' },
  { planet: 'saturn',  kind: 'retrograde', date: '2026-05-13' },
  { planet: 'saturn',  kind: 'direct',     date: '2026-09-29' },
  // 2027 — extend as needed
];

/**
 * Calendar-day distance between `from` and `to`. Positive when `to` is later.
 * Normalises both to UTC midnight before subtracting so DST / timezone shifts
 * don't introduce off-by-one errors.
 */
export function daysUntil(from: Date, to: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const fromUtc = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const toUtc = Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  );
  return Math.round((toUtc - fromUtc) / ms);
}

/**
 * The 3-day rule's core check — see spec §5. Returns true when `target` is
 * 0..3 days after `today` (inclusive of today and 3 days out).
 */
export function isHorizonWithin3Days(today: Date, target: Date): boolean {
  const diff = daysUntil(today, target);
  return diff >= 0 && diff <= 3;
}

/**
 * Find the next station of the given planet + kind strictly after `after`.
 * Returns null when no such station exists in the calendar window — caller
 * must then fall through to a vague-variant entry.
 */
export function nextStationOf(
  planet: Planet,
  kind: StationKind,
  after: Date,
): Date | null {
  for (const station of STATIONS) {
    if (station.planet !== planet || station.kind !== kind) continue;
    const stationDate = new Date(`${station.date}T00:00:00Z`);
    if (stationDate.getTime() > after.getTime()) return stationDate;
  }
  return null;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/horizon.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/src/translations/daily-notes/horizon.ts \
        workers/api-proxy/src/translations/__tests__/horizon.test.ts
git commit -m "feat(daily-notes): horizon verification with planetary-stations calendar"
```

---

## Task 11: Picker — main synthesizer (PickResult shape per 2026-05-29 checkpoint)

**Files:**
- Create: `workers/api-proxy/src/translations/daily-notes/picker.ts`
- Test: `workers/api-proxy/src/translations/__tests__/daily-notes.test.ts`

The picker takes a top-window snapshot from an `electional/search` response, today's wall-clock date in the event timezone, and the active excluded ranges. It returns a `PickResult` — the entry-selection layer of the daily note. The Worker endpoint (Task 18) composes the full contract response by adding `moon_phase` (Task 16) and the envelope fields (`library_version`, `part_of_day_cutoffs`, etc.).

**Contract sign-off (2026-05-29 checkpoint):**
- **PickResult is a SEPARATE shape from `DailyNoteOutput`** in `types.ts`. The picker does selection (single responsibility); moon-phase is ephemeris (different concern). The endpoint stitches them.
- **`today_iso_date: string`** (YYYY-MM-DD in event timezone) NOT `today: Date`. Makes the contract §4 timezone-correctness explicit at the call site. Worker endpoint must format `now` in event tz BEFORE calling the picker; the picker treats it as a wall-clock date.
- **`supporting_line` → `supporting`** (rename matches contract §2 field name).
- **`mood: chosenEntry.quality_bucket`** — single source of truth; mood cannot drift from the chosen phrase.

Pattern follows the existing `headlines/synthesizer.ts`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/daily-notes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { synthesizeDailyNote } from '../daily-notes/picker';
import { excludedRange, factor, window_ } from './fixtures';

describe('synthesizeDailyNote — quality bucket → entry selection', () => {
  it('Strong bucket: picks strong-sky-is-clear when 6+ factors PASS, no exclusions', () => {
    const top = window_({
      score: 82,
      grade: 'strong',
      factors: [
        factor({ factor_id: 'venus_dignified_direct_well_aspected', status: 'pass', weight_class: 'high' }),
        factor({ factor_id: 'jupiter_angular_or_aspecting',         status: 'pass', weight_class: 'high' }),
        factor({ factor_id: 'mercury_dignified_direct_not_combust', status: 'pass', weight_class: 'medium' }),
        factor({ factor_id: 'moon_waxing_increasing_light',         status: 'pass', weight_class: 'medium' }),
        factor({ factor_id: 'no_malefic_on_angle',                  status: 'pass', weight_class: 'medium' }),
        factor({ factor_id: 'house_free_of_malefic',                status: 'pass', weight_class: 'low' }),
      ],
    });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('strong-sky-is-clear');
    expect(result.mood).toBe('strong');
    expect(result.date).toBe('2026-05-28');
    expect(result.headline).toBe('A wide-open day — the sky is clear.');
    expect(result.supporting).toContain('big asks');
    expect(result.exclusion_reason).toBeUndefined();
    expect(result.used_fallback).toBe(false);
  });

  it('Good bucket: picks good-venus-warm when Venus is the highest-weight PASS factor', () => {
    const top = window_({
      score: 68,
      grade: 'fair',
      factors: [
        factor({ factor_id: 'venus_dignified_direct_well_aspected', status: 'pass', weight_class: 'high', contribution: 18 }),
        factor({ factor_id: 'mercury_dignified_direct_not_combust', status: 'partial', weight_class: 'medium' }),
      ],
    });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('good-venus-warm');
    expect(result.mood).toBe('good');
  });

  it('Closed bucket: picks closed-moon-voc when an active moon_voc exclusion covers today', () => {
    const top = window_({ score: 35, grade: 'poor' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'moon_voc' })],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('closed-moon-voc');
    expect(result.mood).toBe('closed');
    expect(result.exclusion_reason).toBe('moon_voc');
  });

  it('Closed bucket: Mercury retrograde → primary entry when station <= 3 days away', () => {
    // Mercury direct station Aug 31, 2026 — pick "today" = Aug 29 (2 days out).
    const top = window_({ score: 40, grade: 'caution' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'mercury_retrograde' })],
      today_iso_date: '2026-08-29',
    });
    expect(result.entry_id).toBe('closed-mercury-retrograde');
    expect(result.headline).toBe('Mercury is sleeping.');
    expect(result.exclusion_reason).toBe('mercury_retrograde');
    expect(result.used_fallback).toBe(false);
  });

  it('Closed bucket: Mercury retrograde → vague fallback when station > 3 days away', () => {
    // Mercury Rx starts Aug 8; on Aug 10 the next direct station is Aug 31 (21 days out).
    const top = window_({ score: 40, grade: 'caution' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'mercury_retrograde' })],
      today_iso_date: '2026-08-10',
    });
    expect(result.entry_id).toBe('closed-mercury-retrograde-vague');
    expect(result.supporting).toContain('for now');
    expect(result.used_fallback).toBe(true);
  });

  it('exclusion precedence: closed-bucket wins even when raw score is in good band', () => {
    // Score 72 ("good"-band) but Venus rx covers today — must pick closed entry.
    const top = window_({ score: 72, grade: 'fair' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'venus_retrograde' })],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('closed-venus-retrograde');
    expect(result.mood).toBe('closed');
    expect(result.exclusion_reason).toBe('venus_retrograde');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd workers/api-proxy && npx vitest run src/translations/__tests__/daily-notes.test.ts`
Expected: FAIL — "Failed to load url ../daily-notes/picker" (or equivalent module-not-found).

- [ ] **Step 3: Implement `picker.ts`**

Create `daily-notes/picker.ts`:

```ts
import type { ExcludedRange, Window } from '@inceptio/shared-types';
import { DAILY_NOTES } from '../dictionary/daily-notes';
import { DAILY_NOTE_FALLBACKS } from '../dictionary/daily-note-fallbacks';
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
  const bucket = assignBucket(input.topWindow.score, hasNamedExclusion);

  // Branch 1 — closed by exclusion (highest precedence per §4.5)
  if (bucket === 'closed') {
    return pickClosedEntry(input);
  }

  // Branches 2-4 — score-band picks via dominant factor
  return pickByDominantFactor(input, bucket);
}

function pickClosedEntry(input: SynthesizeInput): PickResult {
  // Prefer the most-specific named exclusion (highest severity, falling back
  // to first in list). Severity is `low | medium | high` per shared-types.
  const SEVERITY_RANK = { low: 0, medium: 1, high: 2 } as const;
  const sorted = [...input.excludedRangesActiveToday].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  const reason = sorted[0]?.reason_id;
  const entryId = (reason && REASON_TO_ENTRY[reason]) ?? 'closed-long-quiet-stretch';
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
  return {
    entry_id: entry.id,
    mood: entry.quality_bucket,             // derived — single source of truth
    date: today_iso_date,
    headline: entry.headline,
    supporting: entry.supporting_line,      // contract field name `supporting`; dictionary field is `supporting_line`
    exclusion_reason,
    used_fallback: usedFallback,
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd workers/api-proxy && npx vitest run src/translations/__tests__/daily-notes.test.ts`
Expected: PASS — all 6 scenarios green.

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/src/translations/daily-notes/picker.ts \
        workers/api-proxy/src/translations/__tests__/daily-notes.test.ts
git commit -m "feat(daily-notes): picker — entry selection returning PickResult per design-pass contract"
```

---

## Task 12: Long-condition variation — sibling rotation

**Files:**
- Create: `workers/api-proxy/src/translations/dictionary/daily-note-variants.ts`
- Modify: `workers/api-proxy/src/translations/daily-notes/picker.ts`
- Modify: `workers/api-proxy/src/translations/__tests__/daily-notes.test.ts`

Long-running excluded-reason entries (Mercury rx ~3 weeks, Venus rx ~40 days) need sibling variants. The picker rotates between them deterministically (date-seeded hash) so the same day always shows the same variant — but consecutive days show different ones.

- [ ] **Step 1: Create the variant pool**

Create `dictionary/daily-note-variants.ts`:

```ts
import type { DailyNoteVariantPool, KnownDailyNoteId } from '../types';

/**
 * Sibling variants for long-running excluded-reason entries. The picker
 * rotates among `[primary] ++ variants` using a date-seeded deterministic
 * hash so the same UTC date always shows the same variant for the same
 * location.
 *
 * Variants stay within the same voice and same astrological claim — only
 * the phrasing rotates. Astrologer review (§11.4) should confirm each
 * variant is faithful to the primary's meaning.
 */
export const DAILY_NOTE_VARIANT_POOLS: Partial<
  Record<KnownDailyNoteId, DailyNoteVariantPool>
> = {
  'closed-mercury-retrograde': {
    primary_entry_id: 'closed-mercury-retrograde',
    variants: [
      {
        headline: 'Mercury is walking back.',
        supporting_line:
          'A stretch for revisiting and re-reading — good for editing and double-checking; hold the heavy signing for clearer days.',
      },
      {
        headline: 'A week of careful words.',
        supporting_line:
          'Mercury is reversed — good for going over what already exists; hold off on new agreements for now.',
      },
    ],
  },

  'closed-venus-retrograde': {
    primary_entry_id: 'closed-venus-retrograde',
    variants: [
      {
        headline: 'Venus is looking back.',
        supporting_line:
          'A long quiet stretch for matters of the heart — good for revisiting what was started; new commitments can wait.',
      },
      {
        headline: 'A stretch for tending, not promising.',
        supporting_line:
          'Venus is in review — good for honouring what already exists; hold the new vows for later.',
      },
    ],
  },
};
```

- [ ] **Step 2: Add rotation tests**

Append to `__tests__/daily-notes.test.ts`:

```ts
import { DAILY_NOTE_VARIANT_POOLS } from '../dictionary/daily-note-variants';

describe('synthesizeDailyNote — sibling-variant rotation for long conditions', () => {
  it('returns the same variant for the same (date, entry) pair', () => {
    const top = window_({ score: 40, grade: 'caution' });
    const exclusions = [excludedRange({ reason_id: 'mercury_retrograde' })];
    const day1 = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: exclusions,
      today: new Date('2026-08-30'),  // 1 day before Mercury direct → primary entry path
    });
    const day1Repeat = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: exclusions,
      today: new Date('2026-08-30'),
    });
    expect(day1.headline).toBe(day1Repeat.headline);
  });

  it('rotates across consecutive days during the same long condition', () => {
    const top = window_({ score: 40, grade: 'caution' });
    const exclusions = [excludedRange({ reason_id: 'venus_retrograde' })];
    const heads = [
      new Date('2026-10-04'),
      new Date('2026-10-05'),
      new Date('2026-10-06'),
    ].map(
      (today) =>
        synthesizeDailyNote({
          topWindow: top,
          excludedRangesActiveToday: exclusions,
          today,
        }).headline,
    );
    // At least 2 of the 3 days should differ — proves rotation is happening.
    const unique = new Set(heads);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('variant pool exists for currently-supported long conditions', () => {
    expect(DAILY_NOTE_VARIANT_POOLS['closed-mercury-retrograde']).toBeDefined();
    expect(DAILY_NOTE_VARIANT_POOLS['closed-venus-retrograde']).toBeDefined();
  });
});
```

- [ ] **Step 3: Modify `picker.ts` — wire rotation into `finalize()`**

In `daily-notes/picker.ts`, replace the `finalize` function and add rotation logic:

```ts
import { DAILY_NOTE_VARIANT_POOLS } from '../dictionary/daily-note-variants';

// ... (other imports and code remain)

function finalize(
  entry: DailyNoteEntry,
  usedFallback: boolean,
  today?: Date,
): SynthesizeResult {
  // Skip rotation for fallback entries — they already represent the
  // horizon-fail branch and should be a single voice.
  if (usedFallback || !today) {
    return {
      entry_id: entry.id,
      headline: entry.headline,
      supporting_line: entry.supporting_line,
      used_fallback: usedFallback,
    };
  }

  const pool = DAILY_NOTE_VARIANT_POOLS[entry.id as KnownDailyNoteId];
  if (!pool) {
    return {
      entry_id: entry.id,
      headline: entry.headline,
      supporting_line: entry.supporting_line,
      used_fallback: false,
    };
  }

  // All siblings: [primary, ...variants]
  const siblings = [
    { headline: entry.headline, supporting_line: entry.supporting_line },
    ...pool.variants,
  ];
  const index = dateSeededHash(today, entry.id) % siblings.length;
  const chosen = siblings[index]!;
  return {
    entry_id: entry.id,
    headline: chosen.headline,
    supporting_line: chosen.supporting_line,
    used_fallback: false,
  };
}

/**
 * Deterministic non-cryptographic hash of (UTC date, entry id). Same inputs
 * always produce the same output — required for the daily-cache contract.
 */
function dateSeededHash(today: Date, salt: string): number {
  const dateKey = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  const seed = dateKey + ':' + salt;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
```

Then update both call sites in `pickByDominantFactor` and `pickClosedEntry` to pass `input.today` through. Find every `finalize(entry, false)` call and change to `finalize(entry, false, input.today)`. Find `finalize(entry, true)` and leave alone (fallbacks skip rotation by design).

- [ ] **Step 4: Run all daily-notes tests, verify they pass**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/daily-notes.test.ts`
Expected: PASS — original 6 scenarios + 3 new rotation scenarios.

- [ ] **Step 5: Lint the variant pool (re-run lint-library)**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/lint-library.test.ts`
Expected: PASS — variants weren't yet checked. Add a check for them.

In `__tests__/lint-library.test.ts`, append:

```ts
import { DAILY_NOTE_VARIANT_POOLS } from '../dictionary/daily-note-variants';

describe('DAILY_NOTE_VARIANT_POOLS lint-clean', () => {
  const pools = Object.values(DAILY_NOTE_VARIANT_POOLS).filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );

  for (const pool of pools) {
    for (const variant of pool.variants) {
      it(`pool ${pool.primary_entry_id} variant headline "${variant.headline}" within 48 chars`, () => {
        expect(variant.headline.length).toBeLessThanOrEqual(48);
      });
      it(`pool ${pool.primary_entry_id} variant supporting_line within 140 chars`, () => {
        expect(variant.supporting_line.length).toBeLessThanOrEqual(140);
      });
      it(`pool ${pool.primary_entry_id} variant lint-clean`, () => {
        const headlineResult = lintPhrase({
          surface: 'daily-note',
          phrase: variant.headline,
          today_offset_days: null,
        });
        expect(headlineResult.reasons).toEqual([]);
        const supportingResult = lintPhrase({
          surface: 'daily-note',
          phrase: variant.supporting_line,
          today_offset_days: null,
        });
        expect(supportingResult.reasons).toEqual([]);
      });
    }
  }
});
```

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/lint-library.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add workers/api-proxy/src/translations/dictionary/daily-note-variants.ts \
        workers/api-proxy/src/translations/daily-notes/picker.ts \
        workers/api-proxy/src/translations/__tests__/daily-notes.test.ts \
        workers/api-proxy/src/translations/__tests__/lint-library.test.ts
git commit -m "feat(daily-notes): long-condition sibling rotation for Mercury/Venus rx"
```

---

# Phase 5 — Status-line ordering

## Task 13: Multi-search status-line ordering + 3-cap

**Files:**
- Create: `workers/api-proxy/src/translations/daily-notes/status-line-ordering.ts`
- Test: `workers/api-proxy/src/translations/__tests__/status-line-ordering.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/status-line-ordering.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { orderStatusLines, type SavedSearchSnapshot } from '../daily-notes/status-line-ordering';

const TODAY = new Date('2026-05-28');

function snap(overrides: Partial<SavedSearchSnapshot>): SavedSearchSnapshot {
  return {
    id: 'search-1',
    activity: 'wedding',
    state: 'pre-window',
    days_until: 30,
    days_since_closed: null,
    has_active_alert: false,
    ...overrides,
  };
}

describe('orderStatusLines', () => {
  it('in-window beats new-window-alert beats pre-window beats post-window', () => {
    const result = orderStatusLines(
      [
        snap({ id: 's-post', state: 'post-window', days_since_closed: 5 }),
        snap({ id: 's-pre',  state: 'pre-window',  days_until: 7 }),
        snap({ id: 's-alert', state: 'pre-window', days_until: 14, has_active_alert: true }),
        snap({ id: 's-in',   state: 'in-window' }),
      ],
      TODAY,
    );
    expect(result.visible.map((s) => s.id)).toEqual(['s-in', 's-alert', 's-pre']);
    expect(result.overflow_count).toBe(1);
  });

  it('pre-window orders by ascending days_until', () => {
    const result = orderStatusLines(
      [
        snap({ id: 'far',    days_until: 30 }),
        snap({ id: 'close',  days_until: 3 }),
        snap({ id: 'medium', days_until: 14 }),
      ],
      TODAY,
    );
    expect(result.visible.map((s) => s.id)).toEqual(['close', 'medium', 'far']);
    expect(result.overflow_count).toBe(0);
  });

  it('post-window orders by ascending days_since_closed', () => {
    const result = orderStatusLines(
      [
        snap({ id: 'old',   state: 'post-window', days_since_closed: 30 }),
        snap({ id: 'fresh', state: 'post-window', days_since_closed: 1 }),
      ],
      TODAY,
    );
    expect(result.visible.map((s) => s.id)).toEqual(['fresh', 'old']);
  });

  it('caps at 3 visible + overflow', () => {
    const all = Array.from({ length: 8 }, (_, i) =>
      snap({ id: `s-${i}`, days_until: i + 1 }),
    );
    const result = orderStatusLines(all, TODAY);
    expect(result.visible.length).toBe(3);
    expect(result.overflow_count).toBe(5);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/status-line-ordering.test.ts`
Expected: FAIL — "Cannot find module '../daily-notes/status-line-ordering'".

- [ ] **Step 3: Implement `status-line-ordering.ts`**

Create `daily-notes/status-line-ordering.ts`:

```ts
import type { Activity } from '@inceptio/shared-types';

export type SavedSearchState =
  | 'pre-window'
  | 'in-window'
  | 'post-window';

export interface SavedSearchSnapshot {
  id: string;
  activity: Activity;
  state: SavedSearchState;
  /** null when state !== 'pre-window' */
  days_until: number | null;
  /** null when state !== 'post-window' */
  days_since_closed: number | null;
  /** When true, a new-window-alert is currently active for this search. */
  has_active_alert: boolean;
}

export interface OrderResult {
  visible: SavedSearchSnapshot[];
  overflow_count: number;
}

const VISIBLE_CAP = 3;

/**
 * Order saved-search snapshots per spec §6.4. Hard cap at 3 visible status
 * lines; the remainder are rolled into `overflow_count` which the renderer
 * uses for the "+N more →" affordance.
 *
 * Priority order:
 *   1. in-window (emphasized)
 *   2. active new-window-alert
 *   3. pre-window, ascending days_until
 *   4. post-window, ascending days_since_closed
 */
export function orderStatusLines(
  searches: SavedSearchSnapshot[],
  _today: Date,
): OrderResult {
  const sorted = [...searches].sort((a, b) => priority(a) - priority(b));
  return {
    visible: sorted.slice(0, VISIBLE_CAP),
    overflow_count: Math.max(0, sorted.length - VISIBLE_CAP),
  };
}

function priority(s: SavedSearchSnapshot): number {
  // Lower number = higher priority. The tail digit is used for stable
  // intra-bucket ordering by horizon distance.
  if (s.state === 'in-window') return 0;
  if (s.has_active_alert) return 1_000 + 0;
  if (s.state === 'pre-window') {
    return 2_000_000 + (s.days_until ?? 999_999);
  }
  if (s.state === 'post-window') {
    return 3_000_000 + (s.days_since_closed ?? 999_999);
  }
  return 4_000_000;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd workers/api-proxy && pnpm vitest run src/translations/__tests__/status-line-ordering.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/src/translations/daily-notes/status-line-ordering.ts \
        workers/api-proxy/src/translations/__tests__/status-line-ordering.test.ts
git commit -m "feat(daily-notes): status-line ordering + 3-cap with overflow (spec §6.4)"
```

---

# Phase 6 — Worker integration

## Task 14: Daily-note KV cache

**Files:**
- Create: `workers/api-proxy/src/daily-note-cache.ts`

The daily-note cache is keyed by `(lat, lng, date_iso)` and TTLs to end-of-day in the user's timezone. Reuses the existing KV namespace binding `CACHE`.

- [ ] **Step 1: Create the cache wrapper**

Create `daily-note-cache.ts`:

```ts
import type { Env } from './env';

export interface DailyNoteCacheKey {
  lat: number;
  lng: number;
  /** UTC date string YYYY-MM-DD treated as "today" for the user. */
  dateIso: string;
}

export interface DailyNoteCacheValue {
  entry_id: string;
  headline: string;
  supporting_line: string;
  used_fallback: boolean;
  cached_at_unix: number;
}

function keyOf({ lat, lng, dateIso }: DailyNoteCacheKey): string {
  const latRounded = lat.toFixed(2); // ~1.1 km granularity — enough for daily-note purposes
  const lngRounded = lng.toFixed(2);
  return `daily-note:${latRounded}:${lngRounded}:${dateIso}`;
}

/**
 * TTL = seconds until end of the named UTC day. The daily note is daily —
 * caching past midnight produces a stale read.
 */
function ttlSecondsForDay(dateIso: string, nowUnix: number): number {
  const endOfDay = new Date(`${dateIso}T23:59:59Z`).getTime() / 1000;
  return Math.max(60, Math.floor(endOfDay - nowUnix));
}

export async function readCache(
  env: Env,
  key: DailyNoteCacheKey,
): Promise<DailyNoteCacheValue | null> {
  const raw = await env.CACHE.get(keyOf(key), 'json');
  return raw as DailyNoteCacheValue | null;
}

export async function writeCache(
  env: Env,
  key: DailyNoteCacheKey,
  value: DailyNoteCacheValue,
  nowUnix: number,
): Promise<void> {
  await env.CACHE.put(keyOf(key), JSON.stringify(value), {
    expirationTtl: ttlSecondsForDay(key.dateIso, nowUnix),
  });
}
```

- [ ] **Step 2: Run type-check**

Run: `cd workers/api-proxy && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add workers/api-proxy/src/daily-note-cache.ts
git commit -m "feat(cache): daily-note KV cache wrapper with end-of-day TTL"
```

---

## Task 15: Worker route `/daily-note`

**Files:**
- Create: `workers/api-proxy/src/routes/daily-note.ts`
- Modify: `workers/api-proxy/src/index.ts`

- [ ] **Step 1: Create the route handler**

Create `routes/daily-note.ts`:

```ts
import type { Env } from '../env';
import { readCache, writeCache } from '../daily-note-cache';
import { synthesizeDailyNote } from '../translations/daily-notes/picker';
import { handleSearch } from './search';

/**
 * GET /daily-note?lat=<n>&lng=<n>&tz=<iana>
 *
 * Computes today's daily-note headline + supporting line for the given
 * location. Internally fans out to /electional/search if cache miss, then
 * runs the picker, then caches the result through end-of-day.
 *
 * The activity used for the underlying search is `business_launch` — chosen
 * because (a) it produces the most balanced factor distribution for a
 * general-purpose daily reading, (b) it never depends on natal data, and
 * (c) it's an MVP activity so the API key already authorizes it. The user's
 * actual saved-search activities are surfaced via the status-line layer,
 * not the daily note itself.
 *
 * Rate limit: same KV-backed limiter as /electional/search. The Worker
 * already charges 5 credits per upstream search; the cache keeps this
 * bounded to ~1 search per location per day.
 */
export async function handleDailyNote(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const tz = url.searchParams.get('tz') ?? 'UTC';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json(
      { error: 'bad_request', message: 'lat and lng are required numerics' },
      { status: 400 },
    );
  }

  const now = new Date();
  const dateIso = formatDateInTz(now, tz);
  const cacheKey = { lat, lng, dateIso };

  // Read cache
  const cached = await readCache(env, cacheKey);
  if (cached) {
    return Response.json({ ...cached, cache_hit: true });
  }

  // Cache miss — fetch a same-day single-window search to get the top window
  // and excluded ranges. We synthesize an internal request and call the
  // existing /electional/search handler in-process.
  const searchBody = {
    activity: 'business_launch',
    latitude: lat,
    longitude: lng,
    date_from: dateIso,
    date_to: dateIso,
    timezone: tz,
  };
  const internalReq = new Request('https://internal/electional/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(searchBody),
  });
  const searchRes = await handleSearch(internalReq, env);
  if (!searchRes.ok) {
    return Response.json(
      { error: 'upstream_failure', message: 'electional/search failed' },
      { status: 502 },
    );
  }
  const searchPayload = (await searchRes.json()) as {
    top_windows?: Array<{ score: number; factors: unknown[] }>;
    excluded_ranges?: Array<{ reason_id: string; severity: 'low' | 'medium' | 'high' }>;
    summary?: { no_viable_windows?: boolean };
  };

  const topWindow = searchPayload.top_windows?.[0] ?? null;
  if (!topWindow) {
    return Response.json(
      { error: 'no_top_window', message: 'upstream returned no top window' },
      { status: 502 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- upstream type narrowing happens in picker via shared-types
  const result = synthesizeDailyNote({
    topWindow: topWindow as any,
    excludedRangesActiveToday: (searchPayload.excluded_ranges ?? []) as any,
    today: new Date(`${dateIso}T00:00:00Z`),
  });

  const nowUnix = Math.floor(now.getTime() / 1000);
  const cacheValue = { ...result, cached_at_unix: nowUnix };
  await writeCache(env, cacheKey, cacheValue, nowUnix);

  return Response.json({ ...result, cache_hit: false });
}

function formatDateInTz(d: Date, tz: string): string {
  // Intl.DateTimeFormat with `en-CA` produces YYYY-MM-DD natively.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
}
```

- [ ] **Step 2: Wire the route into the Worker entry**

Modify `workers/api-proxy/src/index.ts`:

```ts
import type { Env } from './env';
import { handleHealth } from './routes/health';
import { handleSearch } from './routes/search';
import { handleDailyNote } from './routes/daily-note';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/health' && req.method === 'GET') {
      return handleHealth(env);
    }

    if (url.pathname === '/electional/search' && req.method === 'POST') {
      return handleSearch(req, env);
    }

    if (url.pathname === '/daily-note' && req.method === 'GET') {
      return handleDailyNote(req, env);
    }

    return Response.json(
      { error: 'not_found', path: url.pathname, method: req.method },
      { status: 404 },
    );
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 3: Run type-check + existing test suite**

Run: `cd workers/api-proxy && pnpm tsc --noEmit && pnpm vitest run`
Expected: PASS — type-clean and existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add workers/api-proxy/src/routes/daily-note.ts workers/api-proxy/src/index.ts
git commit -m "feat(worker): /daily-note endpoint with KV cache + cache-miss fan-out to /search"
```

---

## Task 16: Shared-types schema for mobile

**Files:**
- Create: `packages/shared-types/src/api/daily-note.ts`
- Modify: `packages/shared-types/src/api/index.ts`

- [ ] **Step 1: Create the Zod schema**

Create `packages/shared-types/src/api/daily-note.ts`:

```ts
import { z } from 'zod';

/**
 * The /daily-note response shape — see Worker `handleDailyNote` in
 * `workers/api-proxy/src/routes/daily-note.ts`. Mobile validates with this
 * schema on receipt (per CLAUDE.md "Zod schemas for every API response").
 */
export const DailyNoteResponseSchema = z.object({
  entry_id: z.string(),
  headline: z.string().max(48),
  supporting_line: z.string().max(140),
  used_fallback: z.boolean(),
  cache_hit: z.boolean(),
  cached_at_unix: z.number().optional(),
});

export type DailyNoteResponse = z.infer<typeof DailyNoteResponseSchema>;
```

- [ ] **Step 2: Re-export from the api barrel**

Append to `packages/shared-types/src/api/index.ts`:

```ts
export * from './daily-note';
```

- [ ] **Step 3: Run type-check across both packages**

Run: `cd packages/shared-types && pnpm tsc --noEmit && cd ../../workers/api-proxy && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/src/api/daily-note.ts packages/shared-types/src/api/index.ts
git commit -m "feat(shared-types): DailyNoteResponse schema for mobile consumption"
```

---

# Phase 7 — Pre-launch

## Task 17: Apply astrologer ruling — Entries 16 + 17 lockstep PR

**Files (potentially touched if astrologer rules B/C/D):**
- Modify: `workers/api-proxy/src/translations/dictionary/daily-notes.ts` (entries 16, 17)
- Modify: `workers/api-proxy/src/translations/dictionary/daily-note-fallbacks.ts` (entry 16 fallback)
- Modify: `workers/api-proxy/src/translations/dictionary/daily-note-variants.ts` (Mercury/Venus rotation pools)
- Modify: `workers/api-proxy/src/translations/dictionary/excluded-reasons.ts` (mercury_retrograde, venus_retrograde)
- Modify: `CLAUDE.md` (Translation Layer section, excluded-reasons mappings)
- Modify: `docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md` (Entry 16/17 final phrasings, record A/B/C/D ruling)

This task is the launch gate. It runs after the astrologer review pass completes and only when the ruling for Entry 16 or 17 is B/C/D (not A). If the ruling is A for both, this task captures the recorded reason into the spec and ships unchanged.

- [ ] **Step 1: Receive the astrologer ruling**

Ruling document must specify, for each of Entry 16 (`mercury_retrograde`) and Entry 17 (`venus_retrograde`):
- Choice: A | B | C | D
- If A: the recorded reason (one sentence)
- If D: the astrologer's exact phrasing

Record the ruling in the spec under §11.4 as a "Ruling — YYYY-MM-DD" subsection. Example template:

```markdown
### Ruling — 2026-08-15

**Entry 16:** (B) Adopt *"Mercury is turning back."*
**Entry 17:** (B) Adopt *"Venus is looking back."*

Astrologer: <name>. Notes: <brief notes from astrologer>.
```

- [ ] **Step 2: If ruling is A for both — skip to Step 5**

Otherwise proceed.

- [ ] **Step 3: For each ruled-non-A entry, swap the phrasing across all 3 artifacts**

For Entry 16 (assuming ruling = B → "Mercury is turning back."):

  3a. Edit `dictionary/daily-notes.ts` Entry 16's `headline` field to the new phrasing. Update `id` if it now mismatches (e.g. rename `closed-mercury-retrograde` to keep the id stable — preserve the id even if the literal headline changes, since the id is the picker's lookup key).
  3b. Edit `dictionary/daily-note-fallbacks.ts` Entry 16's vague fallback `headline` to match.
  3c. Edit `dictionary/daily-note-variants.ts` Mercury rotation pool — the variant headlines should remain "siblings" of the primary; if the primary changes register from "sleeping" → "turning back", the variants must align (the existing two variants "Mercury is walking back." / "A week of careful words." already align with "turning back" — no change needed; but verify the astrologer agrees with all siblings, not just the primary).
  3d. Edit `workers/api-proxy/src/translations/dictionary/excluded-reasons.ts` — find the `mercury_retrograde` entry and update its `phrase` field. Pre-ruling it reads `"Mercury is sleeping — communication needs extra care this week."`. Update to match the new ruling, e.g. `"Mercury is turning back — communication needs extra care this stretch."` Keep the "needs extra care" framing.
  3e. Edit `CLAUDE.md`'s "Verified excluded range reason IDs" section — the bullet for `mercury_retrograde` needs the new phrasing.

For Entry 17 (assuming ruling = B → "Venus is looking back.") — repeat the same five sub-steps for `venus_retrograde`.

- [ ] **Step 4: Remove `pending_astrologer_ruling: true` from the ruled entries**

After applying the ruling, both `closed-mercury-retrograde` and `closed-venus-retrograde` in `dictionary/daily-notes.ts` (and the Mercury fallback in `dictionary/daily-note-fallbacks.ts`) should have their `pending_astrologer_ruling: true` line deleted.

- [ ] **Step 5: Run full test suite**

Run: `cd workers/api-proxy && pnpm vitest run`
Expected: PASS — all tests including:
- `daily-notes.test.ts` — picker tests still pass with the new phrasings (the tests check entry ids, not headline strings, so swaps are transparent)
- `lint-library.test.ts` — new phrasings still pass the boundary lint and char limits
- `boundary-tests.test.ts` — unchanged

If lint-library FAILS because the new phrasing exceeds 48 chars or contains a forbidden phrase, the ruling needs revisiting with the astrologer — do not work around the lint.

- [ ] **Step 6: Commit as a single coordinated PR**

Critical: this is ONE PR touching three artifacts together. Do NOT split.

```bash
git add workers/api-proxy/src/translations/dictionary/daily-notes.ts \
        workers/api-proxy/src/translations/dictionary/daily-note-fallbacks.ts \
        workers/api-proxy/src/translations/dictionary/daily-note-variants.ts \
        workers/api-proxy/src/translations/dictionary/excluded-reasons.ts \
        CLAUDE.md \
        docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md
git commit -m "feat(daily-notes): apply astrologer ruling for entries 16, 17

Resolves the two BLOCKING items from spec §11.4. Three-artifact coordinated
PR: daily-note library + excluded-reasons translations + CLAUDE.md.

Ruling summary captured in spec §11.4 'Ruling — YYYY-MM-DD' subsection."
```

- [ ] **Step 7: Mark launch gate clear**

Update `CLAUDE.md`'s "What's next (build order)" section: the daily-note feature is now astrologer-approved and ready for the soft launch step.

```bash
git add CLAUDE.md
git commit -m "docs: mark daily-note feature as astrologer-approved"
```

---

# Next steps after this plan

This plan stops at the Worker + shared-types layer. The remaining pieces:

1. **Claude Design renders the state matrix** — UI for the daily note, status lines, empty-state invite, and emphasized in-window / new-window-alert states, using the character limits and 24 composition cells from spec §8.
2. **Mobile integration** — once Claude Design ships components, a follow-on plan wires `DailyNoteResponseSchema` through TanStack Query into the Today screen.
3. **Push notification copy** — explicitly the next brainstorm session per spec §11.5. Same voice, same five boundary tests, stricter character budget.

None of those are in scope for this plan.
