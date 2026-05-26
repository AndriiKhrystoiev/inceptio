# Inceptio — Translation Layer Design

> Phase 3 design — **approved**. Defines the structure of the server-side translation layer that converts raw `astrology-api.io` v3 responses into Inceptio's Mystical Premium voice. Updated with stakeholder corrections after first review.

Source of truth references:
- `CLAUDE.md` → "Translation layer (mandatory infrastructure)"
- `CLAUDE.md` → "Real API behavior — what we verified"
- `docs/inceptio-api-design-audit.md` (formerly `api-audit.md`)

> **Ground-truth note.** The Postman collection on disk contains only request templates. Stakeholder verified the API with real Postman calls in earlier sessions and confirmed: `contribution` (numeric) and `details` (object, shape varies per factor) exist on every factor; all four `weight_class` values (low/medium/high/critical) occur in real data; the eight excluded reason IDs and their CLAUDE.md phrasings are exact and locked. Schemas have been updated to include `contribution` and `details: unknown` accordingly.

---

## File layout

Matches CLAUDE.md's spec exactly:

```
workers/api-proxy/src/translations/
├── dictionary/
│   ├── factors.ts                  # Record<FactorId, FactorEntry> — base phrases
│   └── excluded-reasons.ts         # Record<ReasonId, ReasonEntry>
├── activity-overrides/
│   ├── wedding.ts                  # ActivityOverrides
│   ├── contracts.ts                # ActivityOverrides
│   ├── business-launch.ts          # ActivityOverrides
│   └── travel.ts                   # ActivityOverrides
├── headlines/
│   ├── synthesizer.ts              # synthesizeHeadline() — selects lead factor
│   └── headlines.ts                # Per-(activity, factor, status) overrides
│                                   # + per-activity stock "no viable" headlines
├── types.ts                        # FactorEntry, FactorPhrasing, ReasonEntry, etc.
├── translate.ts                    # main entry — translate(response, activity) → with displayable
└── __tests__/
    ├── translate.test.ts           # golden-file snapshot tests
    └── synthesizer.test.ts
```

Rationale for keeping CLAUDE.md's split (activity-overrides as separate files rather than co-located into each factor entry): each activity has its own tonal voice. A copywriter editing "everything wedding" benefits from reading all wedding nuances in one file, not jumping through 15 factor entries.

---

## Type contracts (`types.ts`)

```ts
import type {
  Activity,
  FactorId,
  FactorStatus,
  ReasonId,
} from '@inceptio/shared-types';

/** The three text fragments produced per factor instance. */
export interface FactorPhrasing {
  /** Under 8 words. Used on cards and in factor-list rows. */
  phrase_short: string;
  /** 1–2 sentences. Used in narrative paragraphs on the moment detail screen. */
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

/** What the Worker adds to each top_window before returning to mobile. */
export interface DisplayableWindow {
  headline: string;
  factors: Array<{
    factor_id: FactorId;
    status: FactorStatus;
    phrase_short: string;
    phrase_full: string;
  }>;
}

/** What the Worker adds to each excluded_range. */
export interface DisplayableExcludedRange {
  reason_id: ReasonId;
  phrase: string;
}
```

The shape exposed to the mobile app: each `top_window` gets a new `displayable` field with `headline` plus translated factors. The raw `factor_id` / `weight_class` / `observation` stay on the wire so the Level 3 Technical view can render verbatim. Mobile clients never read raw `factor_id` for end-user display in production.

---

## Decisions (with rejected alternatives)

| # | Decision | Why | Rejected |
|---|---|---|---|
| 1 | One TS file: `Record<FactorId, FactorEntry>` | Compile-time exhaustiveness against the `FactorId` enum; type-safe imports; copywriter-readable | JSON (no types), per-file split (15 navigations to do a tone pass) |
| 2 | Activity overrides are `Partial<>` — only fields that change | DRY; tracks intent (this is the *change* from baseline) | Full duplication invites drift; harder to spot the actual override |
| 3 | One entry per factor with `polarity_aware: { pass, partial?, fail? }` | Co-locates the three variants so tonal coherence is visible at a glance | 45 separate entries hide the relationship |
| 4a | Lead-factor priority: **weight_class** (from API, per-activity) | CLAUDE.md mandates this exactly: "uses the API-returned weight_class to decide narrative priority" | Hardcoded order would conflict with CLAUDE.md and miss the wedding-vs-contracts shift |
| 4b | Tiebreaker within a weight_class: **`contribution` numeric desc**, then API order tertiary | `contribution` (15.58, 14.94, 12.31, …) is the semantically correct measure of "how much this factor mattered to the score" — exists on every factor per stakeholder verification | API order alone discards real information; alphabetical is meaningless |
| 4c | Pass-over-partial preference is applied **after** weight×contribution: a high-weight `partial` outranks a low-weight `pass`. Pass beats partial only within the same (weight_class, contribution) tier | Avoids the failure mode where a tiny pass factor steals headline space from a strong partial; matches CLAUDE.md's "weight_class decides narrative priority" verbatim | "First pass wins" loses to a near-perfect partial; "highest contribution wins" ignores polarity entirely |
| 5 | Deterministic synthesis — same input → same output | Test-friendly (golden files), KV-cache-stable, pattern-recognizable for users | Randomization adds variance without meaning at MVP |
| 6 | Translation reads only structured fields: `factor_id`, `status`, `weight_class`, `activity`. Never parses `observation` | String parsing is fragile and the observation field is humans-only ("Venus in Leo 9.8° (term, direct)") | Parsing breaks on any upstream typo; `details` object doesn't exist on our current schema (would need to be added if/when it appears) |
| 7 | Headlines live in their own dictionary, not as a third FactorPhrasing field | A headline is sentence-style top-of-screen; a `phrase_short` is mid-sentence shrapnel. Different voices, possibly different editors | Co-locating tempts inappropriate re-use that hurts both |
| 8 | When `no_viable_windows: true`: use a per-activity stock "patient" headline. Don't synthesize from fail factors | Fail-factor synthesis produces dour copy; four hand-written headlines hit the tone reliably | Synthesizing from `status: fail` factors produces "Venus is muted today" as a top-of-screen which reads as a downer |
| 9 | Fail factors are not suppressed by weight. Instead, **disclosure-level filtering**: L1 reads `headline` only; L2 reads `factors` with `status: pass` or `partial`; L3 reads all factors including `fail` plus raw `factor_id`/`observation`/`details`/`contribution` | Matches the existing L1/L2/L3 progressive-disclosure language from `design-v2.1.md` instead of inventing a new suppression rule. Worker translates everything; mobile chooses the slice per screen | A per-weight suppress flag adds a content-editor knob that duplicates a design-language decision |

---

## Two fully-worked example entries

These are written to validate the structure, not as final content. The phrasings will go through an astrologer review (CLAUDE.md mandates ~2 hours of review before launch) — these are first drafts.

### `dictionary/factors.ts` — `venus_dignified_direct_well_aspected`

```ts
import type { FactorEntry } from '../types';

// One entry of the Record<FactorId, FactorEntry> map.
// `venus_dignified_direct_well_aspected` is the most consequential factor
// for wedding and business contexts; the API returns it as weight_class:
// 'high' for wedding, slightly lower for travel/contracts.
const venus_dignified_direct_well_aspected: FactorEntry = {
  polarity_aware: {
    pass: {
      phrase_short: 'Venus brings warmth',
      phrase_full:
        'Venus is dignified and direct today — a steady, warm presence that ' +
        'favors moments built on care and connection.',
    },
    partial: {
      phrase_short: 'Venus shows up gently',
      phrase_full:
        'Venus is in good standing but not at her strongest. The warmth ' +
        'is there; it asks you to meet it halfway.',
    },
    fail: {
      phrase_short: 'Venus is muted today',
      phrase_full:
        'Venus is quiet in the sky right now. Moments that depend on ' +
        'softness may want a different day.',
    },
  },
};
```

**Resolution order** (status-locked — activity overrides for a different status never bleed into this one):

1. `activity_overrides[factor_id].polarity_aware[status]` — per-field merge
2. `FACTORS[factor_id].polarity_aware[status]` — base entry for this status
3. `FACTORS[factor_id].polarity_aware.pass` — final fallback when base lacks this status

The earlier draft of this doc listed a step `activity_overrides[…].pass` between (1) and (2), which would let a wedding "Venus brings tenderness" pass-override leak into a fail-state factor and produce nonsense. Removed during implementation; corrected here.

### `activity-overrides/contracts.ts` — partial override of the same factor

```ts
import type { ActivityOverrides } from '../types';

const contracts: ActivityOverrides = {
  // In a contracts context, Venus reads less as "warmth" and more as
  // "good faith between parties." Only override what changes — the `fail`
  // variant inherits from the base entry untouched.
  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: 'Good faith holds',
        phrase_full:
          'Venus is dignified and direct — a sky that favors agreements ' +
          'made in good faith and kept that way.',
      },
      partial: {
        phrase_short: 'Goodwill is present, not strong',
        // phrase_full omitted: falls back to the base partial.
      },
    },
  },
};

export default contracts;
```

### `dictionary/excluded-reasons.ts` — `moon_voc`

```ts
import type { ReasonEntry } from '../types';

// The API returns a label like "Moon void of course — the matter comes to nothing."
// We replace, not transform — the upstream phrasing leaks technical idiom.
const moon_voc: ReasonEntry = {
  phrase:
    'The Moon is between signs — efforts begun now don\'t take root the ' +
    'way they do on other days.',
};
```

(Excluded reasons don't need polarity or activity variants — they're sky-state facts and read the same regardless of what the user was searching for.)

---

## Headline synthesizer

### Inputs

- The top `top_window` of the response (or the best window if no_viable_windows)
- The user's chosen `activity`
- A flag for whether `no_viable_windows` is true

### Algorithm (deterministic, pseudocode)

```ts
function synthesizeHeadline(
  topWindow: Window,
  activity: Activity,
  noViableWindows: boolean,
): string {
  // Edge case: when the whole search is blocked, don't synthesize from fail factors.
  if (noViableWindows) {
    return NO_VIABLE_HEADLINES[activity];
  }

  // 1) Comparator: weight_class primary, contribution secondary, status tertiary,
  //    API order quaternary (preserved by stable sort).
  //    A high-weight `partial` outranks a low-weight `pass` because weight_class
  //    is checked before status.
  const ranked = [...topWindow.factors].sort((a, b) => {
    const w = weightRank(b.weight_class) - weightRank(a.weight_class);
    if (w !== 0) return w;
    const c = b.contribution - a.contribution;
    if (c !== 0) return c;
    return statusRank(b.status) - statusRank(a.status);
  });

  // 2) The lead factor is simply the top of the ranked list. The comparator
  //    already encodes the pass-over-partial preference within a tier.
  //    Skip `fail` factors entirely — they belong on L3 only (decision 9).
  const lead = ranked.find((f) => f.status !== 'fail');
  if (!lead) {
    return NO_VIABLE_HEADLINES[activity];
  }

  // 3) Look up a hand-written headline for (activity, factor_id, status).
  //    If present, use it. Else fall back to a generic activity-shaped stem
  //    wrapping the factor's phrase_short.
  const hand = HEADLINES[activity]?.[lead.factor_id]?.[lead.status];
  if (hand) return hand;

  const phrasing = translateFactor(lead, activity);
  return GENERIC_HEADLINE_STEMS[activity](phrasing.phrase_short);
}

function weightRank(w: WeightClass): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[w];
}
function statusRank(s: FactorStatus): number {
  return { fail: 0, partial: 1, pass: 2 }[s];
}

// Example stems — sentence frames that wrap any factor's short phrase calmly.
const GENERIC_HEADLINE_STEMS = {
  wedding:        (lead: string) => `A tender day — ${lead.toLowerCase()}.`,
  contracts:      (lead: string) => `A steady day — ${lead.toLowerCase()}.`,
  business_launch:(lead: string) => `A clear day — ${lead.toLowerCase()}.`,
  travel:         (lead: string) => `An open day — ${lead.toLowerCase()}.`,
};

// Hand-written when stakes are high enough to warrant a custom headline.
// Sparse on purpose — only the most consequential (factor, activity, status) tuples.
const HEADLINES: Partial<Record<Activity, Partial<Record<FactorId, Partial<Record<FactorStatus, string>>>>>> = {
  wedding: {
    venus_dignified_direct_well_aspected: {
      pass: 'A tender day for beginnings.',
    },
  },
  contracts: {
    mercury_dignified_direct_not_combust: {
      pass: 'A clear day for plain words.',
    },
  },
  // ... fill in others where a stock generic stem feels too thin.
};

// One per activity. Used when no_viable_windows is true. Range-agnostic
// phrasing so a 7-day, 30-day, and 6-month search all read sensibly.
const NO_VIABLE_HEADLINES: Record<Activity, string> = {
  wedding:         'These days ask for patience — the sky is between rooms.',
  contracts:       'A quieter stretch for paper. Better moments are nearby.',
  business_launch: 'The sky is gathering — not the window for a launch.',
  travel:          'The roads are waiting for a softer stretch.',
};
```

### What this lets us defer

- We don't need to hand-write a headline for every (activity × factor × status) tuple. ~5–10 hand-written sentences cover the cases that matter; the rest fall through to four generic stems.
- We don't need a `contribution` field on the schema — `weight_class` + stable API order are sufficient.
- We don't need randomization or variant pools in v1.

---

## Mapping to design v2.1 disclosure levels

The Worker translates the entire response. The Mobile app chooses which slice to render per screen, per the progressive-disclosure split locked in `docs/design-v2.1.md` (file on disk: `inceptio-design-changes-v2.1.md`). This table is the contract between Worker output and Mobile rendering.

| Surface | Disclosure level | Reads from Worker response |
|---|---|---|
| **Today** (default) | L1 — Friendly | `displayable.headline` (top-level on response) |
| **Calendar** day cells | L1 — Friendly | `heatmap[].best_score`, `heatmap[].blocked`, `heatmap[].blocked_reason_id` (and `excluded_ranges[].displayable.phrase` for the bottom-sheet caption when a cell is tapped) |
| **Calendar** legend / "5 favorable" stat | L1 — Friendly | `summary.viable_windows_count` |
| **No Viable Windows** (03b) | L1 — Friendly | `displayable.headline` (= NO_VIABLE_HEADLINES[activity] because `summary.no_viable_windows === true`) |
| **Moment Detail** default | L2 — Astrological summary | `top_windows[i].displayable.headline`, `top_windows[i].displayable.factors` **filtered to `status: pass` or `partial`**, ranked by the synthesizer's comparator. Each factor row uses `phrase_short`; the narrative paragraph block uses `phrase_full`. |
| **Moment Detail** "See the chart" toggle | L3 — Technical | The raw `top_windows[i].factors[]` array — including `status: fail` — with `factor_id`, `weight_class`, `status`, `contribution`, `observation`, and `details` rendered verbatim in mono. No translation applied. |
| **Your Moments** card | L1 — Friendly | At save time the mobile app snapshots `displayable.headline` + `displayable.factors` (L2 slice) into MMKV. Re-rendering doesn't re-call the Worker. |

The Worker is "all-or-nothing": every response gets every layer of translation. Mobile clients choose by reading or not reading. Nothing on L3 ever needs a separate request.

**Filtering rule for L2:** the mobile app filters `top_windows[i].displayable.factors` by status. The Worker does NOT pre-filter — it returns all factors translated, so any future surface that needs `fail` factors in friendly form can read them without a Worker change.

---

## Resolved questions

All open questions resolved during stakeholder review on 2026-05-25.

1. **`contribution` exists.** Real values 15.58, 14.94, 12.31, etc. Added to schema; used as secondary sort key in the synthesizer.
2. **`details` exists, shape varies per factor_id.** Examples: venus_* → `{sign, degree, dignity, retrograde}`; jupiter_angular_or_aspecting → `{house, angular}`; house_ruler_dignified_well_placed → `{house, ruler, sign, degree, dignity_score}`; fixed_star_conjunction → `{star, angle, orb}`. Schema accepts `z.unknown()` for v1. L2 narrative ignores; L3 renders verbatim.
3. **Headline split (headlines.ts + synthesizer.ts) approved.**
4. **Locale deferred.** English only for MVP. Migration is mechanical when Spanish arrives.
5. **`TRANSLATIONS_VERSION` cache-key approach approved.** Versioned as `search:v1:${TRANSLATIONS_VERSION}:${requestHash}`.
6. **`weight_class` enum keeps all four values** (low/medium/high/critical) — all four occur in real data.
7. **Fail-factor handling: L1/L2/L3 disclosure split** (Decision 9), not weight-based suppression. See "Mapping to design v2.1 disclosure levels" above.

---

## What's next after your review

Once these are settled, I'll generate:
- 15 base `FactorEntry`s in `dictionary/factors.ts`
- 8 `ReasonEntry`s in `dictionary/excluded-reasons.ts`
- 4 `ActivityOverrides` (one per MVP activity) — only entries where tone genuinely diverges
- ~5–10 hand-written headlines, 4 `NO_VIABLE_HEADLINES`, 4 generic stems
- `translate.ts` entry point that takes a raw `ElectionalSearchResponse` and returns it with `displayable` annotations
- Golden-file tests in `__tests__/translate.test.ts` snapshotting real-shaped fixtures

The astrologer review (per CLAUDE.md, ~2 hours, before launch) happens after that draft is in place.

---

*Awaiting review of this design doc before writing any content or code in `workers/api-proxy/src/translations/`.*
