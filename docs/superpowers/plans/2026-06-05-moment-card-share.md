# Moment Card Share v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shareable "Moment Card" PNG (generated on-device from the existing celestial primitives and handed to the native OS share sheet) reachable from the Moment Detail screen.

**Architecture:** A pure view-model maps a window `w` + privacy options → a `CardViewModel`; a presentational `MomentCard` renders it (Composition A, center-safe, `9:16` + `1:1`) using a capture-safe **gradient** halo (`CaptureSafeMoon`); a Share Preview sheet hosts the live card + privacy toggles, captures it with `react-native-view-shot`, and shares via a pluggable `ShareProvider` (`nativeShareProvider` now, `serverRender`/`directStories` slots later). Card generation makes no API call (quota-exempt).

**Tech Stack:** Expo SDK 55, RN 0.83 (New Arch, bridgeless), `react-native-view-shot@^5.1.0`, `expo-sharing`, `react-native-svg`, NativeWind, vitest. Spec: `docs/superpowers/specs/2026-06-05-moment-card-share-design.md`. Pre-flight audits under `docs/superpowers/expert/` and `docs/superpowers/library-audit/`.

**Verification model:** Pure units (Tasks 1–7) are TDD with `npm test` (vitest). RN/native units (Tasks 8–12) cannot render under vitest — they are verified by the **on-device capture smoke** (the Phase 0 spike already proved `captureRef` + gradient-halo capture on bridgeless iOS sim; the §11 acceptance smoke is re-run here). Real-device iOS is a deferred pre-ship gate (pending Apple Developer account).

---

## File Structure

**Create:**
- `apps/mobile/src/config/features.ts` — `FEATURES` flag registry (paywall flags + `MOMENT_CARD_SHARE_PROVIDER`). **Shared resource — create first.**
- `apps/mobile/src/lib/card/grade-to-mood.ts` — `gradeToMood(grade) → MoodKey`
- `apps/mobile/src/lib/card/time-of-day.ts` — `timeOfDayBand` + `weekdayMonthDay` helpers (location-tz aware)
- `apps/mobile/src/lib/card/format-tz.ts` — `tzAbbrev(iso, timeZone)` + `exactClock(iso, timeZone)`
- `apps/mobile/src/lib/card/card-strings.ts` — seam-ready strings (`t()`-shape): tier→phrase, generic-intent line, `SENSITIVE_ACTIVITIES`
- `apps/mobile/src/lib/card/card-view-model.ts` — `buildCardViewModel(w, ctx) → CardViewModel`
- `apps/mobile/src/lib/card/__tests__/*.test.ts` — vitest specs
- `apps/mobile/src/share/share-provider.ts` — `ShareProvider` type + `ShareResult` discriminated union
- `apps/mobile/src/share/native-share-provider.ts` — `nativeShareProvider`
- `apps/mobile/src/share/resolve-provider.ts` — `resolveShareProvider()` from `FEATURES`
- `apps/mobile/src/share/__tests__/resolve-provider.test.ts`
- `apps/mobile/src/components/card/CaptureSafeMoon.js` — gradient-halo moon (no native shadow)
- `apps/mobile/src/components/card/MomentCard.js` — Composition A, `aspect` prop, `forwardRef`
- `apps/mobile/src/components/card/MomentCardSheet.js` — Share Preview sheet (card + toggles + Share)
- `apps/mobile/src/hooks/useMomentCardShare.js` — orchestration hook

**Modify:**
- `apps/mobile/src/screens/MomentDetailScreen.js` — replace text-only `handleShare`; open the sheet from the footer Share button + the inert header `IconBtn`.

**Remove (Task 12):**
- `apps/mobile/src/screens/CaptureSpikeScreen.js` + the `SPIKE_CAPTURE` flag/import/early-return in `App.js`.

**Read-only imports (DO NOT EDIT — shared):** `src/components/daily-note/mood-tokens.js` (`MOOD_TOKENS` colors), `src/components/Moon.js` (glyph reference only), `src/lib/activities.ts` (`ACTIVITY_LABELS`), `src/theme.js`, `src/components/HeroGradient.js` (gradient idiom), `src/lib/format-window.ts`.

---

## Task 1: `features.ts` config registry (shared, first)

**Files:**
- Create: `apps/mobile/src/config/features.ts`
- Test: `apps/mobile/src/config/__tests__/features.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/config/__tests__/features.test.ts
import { describe, it, expect } from 'vitest';
import { FEATURES } from '../features';

describe('FEATURES', () => {
  it('defaults the card share provider to native-share', () => {
    expect(FEATURES.MOMENT_CARD_SHARE_PROVIDER).toBe('native-share');
  });
  it('keeps the paywall disabled in MVP', () => {
    expect(FEATURES.PAYWALL_ENABLED).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- features`
Expected: FAIL — cannot find module `../features`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/config/features.ts
// Single source of truth for app feature flags. Flat `as const` to mirror
// config/api.ts. Co-locates the paywall flags CLAUDE.md documents so there is
// only ONE features.ts. Card share-provider gate is pluggable: 'native-share'
// (v1) | 'server-render' (Satori fallback) | 'direct-stories' (future).
export const FEATURES = {
  PAYWALL_ENABLED: false,
  MAX_FREE_SEARCHES: 10,
  FREE_SEARCH_PERIOD_DAYS: 30,
  MAX_RANGE_MONTHS_FREE: 12,
  MAX_RANGE_MONTHS_PRO: 12,
  MOMENT_CARD_SHARE_PROVIDER: 'native-share',
} as const;

export type ShareProviderId =
  (typeof FEATURES)['MOMENT_CARD_SHARE_PROVIDER'] | 'server-render' | 'direct-stories';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- features`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/config/features.ts apps/mobile/src/config/__tests__/features.test.ts
git commit -m "feat(card): add features.ts flag registry with share-provider gate"
```

---

## Task 2: `gradeToMood` — grade → mood key (good + fair → win tier, never 'Fair')

**Files:**
- Create: `apps/mobile/src/lib/card/grade-to-mood.ts`
- Test: `apps/mobile/src/lib/card/__tests__/grade-to-mood.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/lib/card/__tests__/grade-to-mood.test.ts
import { describe, it, expect } from 'vitest';
import { gradeToMood } from '../grade-to-mood';

describe('gradeToMood', () => {
  it('maps exceptional + strong → strong (gold tier)', () => {
    expect(gradeToMood('exceptional')).toBe('strong');
    expect(gradeToMood('strong')).toBe('strong');
  });
  it('lands BOTH good and fair in the win tier → good (violet)', () => {
    expect(gradeToMood('good')).toBe('good');
    expect(gradeToMood('fair')).toBe('good'); // the 72-is-a-win rule
  });
  it('maps caution → mixed, poor → closed', () => {
    expect(gradeToMood('caution')).toBe('mixed');
    expect(gradeToMood('poor')).toBe('closed');
  });
  it('falls back to mixed on unknown upstream grade (enum-drift safe)', () => {
    expect(gradeToMood('some_new_grade')).toBe('mixed');
    expect(gradeToMood(undefined as unknown as string)).toBe('mixed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- grade-to-mood`
Expected: FAIL — cannot find module `../grade-to-mood`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/lib/card/grade-to-mood.ts
// Single-source grade → mood-key mapping for the Moment Card. The app has NO
// canonical score→mood helper (ScorePill/StatusLine/daily-note each differ),
// so this is the one place the card derives its tier. RULES (spec §7a):
//   - good AND fair both land in the WIN tier → 'good' (violet halo). 60–74 is
//     a win in this product; the card must never print "Fair".
//   - never route through StatusLine (it hard-codes 'FAIR · GOOD WINDOW').
//   - consume the already-bucketed grade; on an unknown upstream value fall
//     back to a neutral 'mixed' rather than blanking the card (enum drift).
export type MoodKey = 'strong' | 'good' | 'mixed' | 'closed';

const GRADE_TO_MOOD: Record<string, MoodKey> = {
  exceptional: 'strong',
  strong: 'strong',
  good: 'good',
  fair: 'good',
  caution: 'mixed',
  poor: 'closed',
};

export function gradeToMood(grade: string | undefined | null): MoodKey {
  return (grade && GRADE_TO_MOOD[grade]) || 'mixed';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- grade-to-mood`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/card/grade-to-mood.ts apps/mobile/src/lib/card/__tests__/grade-to-mood.test.ts
git commit -m "feat(card): gradeToMood — good+fair to win tier, enum-drift safe"
```

---

## Task 3: `time-of-day` — soft band + date, location-tz aware

**Files:**
- Create: `apps/mobile/src/lib/card/time-of-day.ts`
- Test: `apps/mobile/src/lib/card/__tests__/time-of-day.test.ts`

The window `start` ISO carries the location's UTC offset. Wall-clock must be read in the **location** zone (passed in), not the device zone — so all formatters take an explicit `timeZone`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/lib/card/__tests__/time-of-day.test.ts
import { describe, it, expect } from 'vitest';
import { timeOfDayBand, weekdayBand, monthDay, weekdayMonthDay } from '../time-of-day';

// 2026-06-20 is a Saturday. 15:24 in Europe/Kyiv (+03:00) = afternoon.
const ISO = '2026-06-20T15:24:00+03:00';
const TZ = 'Europe/Kyiv';

describe('time-of-day', () => {
  it('buckets the location wall-clock hour into a band', () => {
    expect(timeOfDayBand(ISO, TZ)).toBe('afternoon');
    expect(timeOfDayBand('2026-06-20T07:00:00+03:00', TZ)).toBe('morning');
    expect(timeOfDayBand('2026-06-20T20:00:00+03:00', TZ)).toBe('evening');
    expect(timeOfDayBand('2026-06-20T02:00:00+03:00', TZ)).toBe('night');
  });
  it('weekdayBand reads "Saturday afternoon"', () => {
    expect(weekdayBand(ISO, TZ)).toBe('Saturday afternoon');
  });
  it('monthDay reads "June 20"', () => {
    expect(monthDay(ISO, TZ)).toBe('June 20');
  });
  it('weekdayMonthDay reads "Saturday, June 20"', () => {
    expect(weekdayMonthDay(ISO, TZ)).toBe('Saturday, June 20');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- time-of-day`
Expected: FAIL — cannot find module `../time-of-day`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/lib/card/time-of-day.ts
// Location-tz-aware time helpers for the Moment Card. The default (no-location)
// card shows a soft time-of-day band — "Saturday afternoon" — never a precise
// tz-less clock (spec §7c-2). Wall-clock is computed in the location zone.
export type Band = 'morning' | 'afternoon' | 'evening' | 'night';

function hourIn(iso: string, timeZone: string): number {
  const h = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', hour12: false, timeZone,
  }).format(new Date(iso));
  return Number(h) % 24; // Intl can return "24" for midnight in some engines
}

export function timeOfDayBand(iso: string, timeZone: string): Band {
  const h = hourIn(iso, timeZone);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function weekday(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(new Date(iso));
}

export function weekdayBand(iso: string, timeZone: string): string {
  return `${weekday(iso, timeZone)} ${timeOfDayBand(iso, timeZone)}`;
}

export function monthDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone }).format(new Date(iso));
}

export function weekdayMonthDay(iso: string, timeZone: string): string {
  return `${weekday(iso, timeZone)}, ${monthDay(iso, timeZone)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- time-of-day`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/card/time-of-day.ts apps/mobile/src/lib/card/__tests__/time-of-day.test.ts
git commit -m "feat(card): location-tz-aware soft time-of-day + date helpers"
```

---

## Task 4: `format-tz` — exact clock + tz abbreviation (opt-in path)

**Files:**
- Create: `apps/mobile/src/lib/card/format-tz.ts`
- Test: `apps/mobile/src/lib/card/__tests__/format-tz.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/lib/card/__tests__/format-tz.test.ts
import { describe, it, expect } from 'vitest';
import { exactClock, tzAbbrev } from '../format-tz';

const ISO = '2026-06-20T15:24:00+03:00';
const TZ = 'Europe/Kyiv';

describe('format-tz', () => {
  it('formats a 12-hour clock in the location zone', () => {
    expect(exactClock(ISO, TZ)).toBe('3:24 PM');
  });
  it('is DST-AWARE — the abbreviation CHANGES between summer and winter (wrong abbrev on a public card is real)', () => {
    // NOTE: the runtime ICU may return letter abbrevs ("EEST"/"EET") OR GMT
    // offsets ("GMT+3"/"GMT+2") depending on the engine (Node returns GMT+N).
    // Assert the load-bearing property — the value DIFFERS across DST and shows
    // the correct offset — rather than a fixed label that's engine-specific.
    const summer = tzAbbrev(ISO, TZ);                          // 2026-06-20
    const winter = tzAbbrev('2026-01-15T12:00:00+02:00', TZ);  // 2026-01-15
    expect(summer).not.toBe(winter);             // DST-aware, not a fixed label
    expect(summer).toMatch(/EEST|GMT\+3|UTC\+3/); // +3 in summer
    expect(winter).toMatch(/EET|GMT\+2|UTC\+2/);  // +2 in winter
  });
  it('falls back to an offset string when no short name is available', () => {
    // A zone whose short name resolves to a GMT offset stays usable.
    const out = tzAbbrev(ISO, 'Etc/GMT-3');
    expect(out).toMatch(/GMT|UTC|\+/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- format-tz`
Expected: FAIL — cannot find module `../format-tz`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/lib/card/format-tz.ts
// Exact-time path for the Moment Card (shown only when location is opted in,
// spec §7c-2). 12-hour clock + a DST-correct tz abbreviation, both computed in
// the location zone against the moment instant (NOT "now").
export function exactClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone,
  }).format(new Date(iso));
}

export function tzAbbrev(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, timeZoneName: 'short',
  }).formatToParts(new Date(iso));
  const name = parts.find((p) => p.type === 'timeZoneName')?.value;
  return name ?? '';
}
```

- [ ] **Step 2 note:** if `tzAbbrev` returns `"GMT+3"` for `Etc/GMT-3` on the test engine, the `toMatch(/GMT|UTC|\+/)` assertion still passes; the EEST assertion exercises a named zone.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- format-tz`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/card/format-tz.ts apps/mobile/src/lib/card/__tests__/format-tz.test.ts
git commit -m "feat(card): exact clock + DST-correct tz abbreviation (opt-in path)"
```

---

## Task 5: `card-strings` — seam-ready copy (tier phrases, generic line, sensitive set)

**Files:**
- Create: `apps/mobile/src/lib/card/card-strings.ts`
- Test: `apps/mobile/src/lib/card/__tests__/card-strings.test.ts`

All card chrome routes through a `t()`-shaped accessor (no i18n library yet, spec §8). Tier phrases are **DRAFT pending astrologer review** — forbidden-word-clean, no grade words, noun "moment".

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/lib/card/__tests__/card-strings.test.ts
import { describe, it, expect } from 'vitest';
import { t, TIER_PHRASES, SENSITIVE_ACTIVITIES } from '../card-strings';

const FORBIDDEN = ['magic', 'destiny', 'fortune', 'stars align', 'manifest', 'energy', 'vibes', 'alignment', 'blessed'];

describe('card-strings', () => {
  it('exposes a warm phrase for every mood key', () => {
    expect(Object.keys(TIER_PHRASES).sort()).toEqual(['closed', 'good', 'mixed', 'strong']);
  });
  it('exposes a band word for every band key (band word is i18n chrome, not baked in time-of-day)', () => {
    for (const b of ['morning', 'afternoon', 'evening', 'night']) {
      expect(t(`card.band.${b}`)).toBe(b);
    }
  });
  it('never prints the word "Fair" or any forbidden word (tier phrases, generic line, AND band words)', () => {
    const bands = ['morning', 'afternoon', 'evening', 'night'].map((b) => t(`card.band.${b}`));
    const all = [...Object.values(TIER_PHRASES), t('card.genericIntent'), ...bands].join(' ').toLowerCase();
    expect(all).not.toContain('fair');
    for (const w of FORBIDDEN) expect(all).not.toContain(w);
  });
  it('t() returns the keyed string and the literal key on a miss', () => {
    expect(t('card.genericIntent')).toBe('A moment to begin');
    expect(t('card.nonexistent')).toBe('card.nonexistent');
  });
  it('marks contracts/business_launch/travel sensitive, wedding not', () => {
    expect(SENSITIVE_ACTIVITIES.has('contracts')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('business_launch')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('travel')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('wedding')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- card-strings`
Expected: FAIL — cannot find module `../card-strings`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/lib/card/card-strings.ts
// Seam-ready string layer for the Moment Card (spec §8). All NEW card chrome
// routes through t(); English values now, no i18n library. A real library
// slots in later by swapping t()'s body. The card never inlines English.
//
// TIER_PHRASES: DRAFT — astrologer review pending (spec §12). Constraints:
// noun "moment" (never in-app "window"), no grade words (never "Fair"), no
// forbidden words (magic/destiny/fortune/stars align/manifest/energy/vibes/
// alignment/blessed).
import type { MoodKey } from './grade-to-mood';
import type { Activity } from '@inceptio/shared-types';

export const TIER_PHRASES: Record<MoodKey, string> = {
  strong: 'A radiant moment',
  good: 'A tender moment',
  mixed: 'A delicate moment',
  closed: 'A quiet moment',
};

const STRINGS: Record<string, string> = {
  'card.genericIntent': 'A moment to begin',
  'card.watermark': 'Inceptio',
  // Band words — i18n chrome rendered from the band KEY returned by
  // time-of-day.timeOfDayBand (NOT baked into that helper). Per-locale band
  // naturalness is deferred l10n content.
  'card.band.morning': 'morning',
  'card.band.afternoon': 'afternoon',
  'card.band.evening': 'evening',
  'card.band.night': 'night',
};

export function t(key: string): string {
  return STRINGS[key] ?? key;
}

// Activities whose intent is sensitive to broadcast publicly (spec §7c-1):
// default the card to the generic line for these; show the activity for wedding.
export const SENSITIVE_ACTIVITIES: ReadonlySet<Activity> = new Set<Activity>([
  'contracts',
  'business_launch',
  'travel',
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- card-strings`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/card/card-strings.ts apps/mobile/src/lib/card/__tests__/card-strings.test.ts
git commit -m "feat(card): seam-ready card-strings (tier phrases, generic line, sensitive set)"
```

---

## Task 6: `card-view-model` — the pure mapper (golden-tested)

**Files:**
- Create: `apps/mobile/src/lib/card/card-view-model.ts`
- Test: `apps/mobile/src/lib/card/__tests__/card-view-model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/lib/card/__tests__/card-view-model.test.ts
import { describe, it, expect } from 'vitest';
import { buildCardViewModel, defaultShowIntent } from '../card-view-model';

const TZ = 'Europe/Kyiv';
const loc = { city: 'Kyiv', country: 'Ukraine', timezone: TZ, lat: 50.45, lng: 30.52, selected_at: 0 };
const w = {
  start: '2026-06-20T15:24:00+03:00',
  end: '2026-06-20T16:54:00+03:00',
  grade: 'fair',
  score: 72,
  duration_minutes: 90,
  displayable: { headline: 'A tender day for beginnings.' },
};

describe('buildCardViewModel', () => {
  it('default (no location): soft band, generic intent for sensitive, no city/tz, no clock', () => {
    const vm = buildCardViewModel(w, { activity: 'travel', location: loc, showLocation: false, showIntent: defaultShowIntent('travel') });
    expect(vm.headline).toBe('A tender day for beginnings.');
    expect(vm.moodKey).toBe('good');         // fair → win tier
    expect(vm.tierPhrase).toBe('A tender moment');
    expect(vm.intentText).toBe('A moment to begin'); // travel is sensitive → generic by default
    expect(vm.whenPrimary).toBe('Saturday afternoon');
    expect(vm.whenSecondary).toBe('June 20');
    expect(vm.city).toBeNull();
    expect(vm.tzAbbrev).toBeNull();
    expect(vm.whenPrimary).not.toMatch(/\d/); // no clock leaked
  });

  it('wedding shows the activity by default', () => {
    const vm = buildCardViewModel(w, { activity: 'wedding', location: loc, showLocation: false, showIntent: defaultShowIntent('wedding') });
    expect(vm.intentText).toBe('Wedding');
  });

  it('location opt-in: exact clock + tz + city, full date', () => {
    const vm = buildCardViewModel(w, { activity: 'wedding', location: loc, showLocation: true, showIntent: true });
    expect(vm.whenPrimary).toBe('3:24 PM');
    expect(vm.tzAbbrev).toBe('EEST');
    expect(vm.city).toBe('Kyiv');
    expect(vm.whenSecondary).toBe('Saturday, June 20');
  });

  it('never emits the word "Fair" anywhere in the view model', () => {
    const vm = buildCardViewModel(w, { activity: 'contracts', location: loc, showLocation: true, showIntent: false });
    expect(JSON.stringify(vm).toLowerCase()).not.toContain('fair');
  });

  it('synthetic window: headline fallback, tier still derived, no crash', () => {
    const syn = { start: '2026-06-20T15:24:00+03:00', grade: 'caution', duration_minutes: null, _synthetic: true };
    const vm = buildCardViewModel(syn, { activity: 'wedding', location: loc, showLocation: false, showIntent: true });
    expect(vm.headline).toBe('A moment to consider.');
    expect(vm.moodKey).toBe('mixed');
    expect(vm.whenPrimary).toBe('Saturday afternoon');
  });

  it('missing location falls back to device tz without throwing', () => {
    const vm = buildCardViewModel(w, { activity: 'wedding', location: null, showLocation: false, showIntent: true });
    expect(vm.whenPrimary).toMatch(/morning|afternoon|evening|night/);
    expect(vm.city).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- card-view-model`
Expected: FAIL — cannot find module `../card-view-model`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/lib/card/card-view-model.ts
// Pure mapper: window `w` + privacy context → CardViewModel. No rendering, no
// storage reads (caller passes activity/location). Golden-tested. Spec §4/§6/§7c.
import type { Activity } from '@inceptio/shared-types';
import { gradeToMood, type MoodKey } from './grade-to-mood';
import { TIER_PHRASES, t, SENSITIVE_ACTIVITIES } from './card-strings';
import { ACTIVITY_LABELS } from '../activities';
import { timeOfDayBand, weekday, monthDay, weekdayMonthDay } from './time-of-day';
import { exactClock, tzAbbrev } from './format-tz';

interface WindowLike {
  start?: string;
  grade?: string;
  displayable?: { headline?: string };
  rationale?: string;
  _synthetic?: boolean;
}

interface LocationLike {
  city: string;
  timezone: string;
}

export interface CardContext {
  activity: Activity;
  location: LocationLike | null;
  showLocation: boolean;
  showIntent: boolean;
}

export interface CardViewModel {
  headline: string;
  moodKey: MoodKey;
  tierPhrase: string;
  intentText: string;
  whenPrimary: string;
  whenSecondary: string;
  city: string | null;
  tzAbbrev: string | null;
}

const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// Default visibility of the activity label, per activity (spec §7c-1).
export function defaultShowIntent(activity: Activity): boolean {
  return !SENSITIVE_ACTIVITIES.has(activity);
}

export function buildCardViewModel(w: WindowLike, ctx: CardContext): CardViewModel {
  const tz = ctx.location?.timezone ?? DEVICE_TZ;
  const iso = w.start ?? new Date(0).toISOString();
  const moodKey = gradeToMood(w.grade);
  const headline = w.displayable?.headline ?? w.rationale ?? 'A moment to consider.';

  const showExact = ctx.showLocation; // exact time + tz ride the location opt-in
  // Default (soft) when-line: weekday from Intl + the band WORD from the strings
  // module (i18n chrome), composed from the band KEY. Never a tz-less clock.
  const whenPrimary = showExact
    ? exactClock(iso, tz)
    : `${weekday(iso, tz)} ${t('card.band.' + timeOfDayBand(iso, tz))}`;
  const whenSecondary = showExact ? weekdayMonthDay(iso, tz) : monthDay(iso, tz);

  return {
    headline,
    moodKey,
    tierPhrase: TIER_PHRASES[moodKey],
    intentText: ctx.showIntent ? ACTIVITY_LABELS[ctx.activity] : t('card.genericIntent'),
    whenPrimary,
    whenSecondary,
    city: ctx.showLocation ? (ctx.location?.city ?? null) : null,
    tzAbbrev: ctx.showLocation && ctx.location ? (tzAbbrev(iso, tz) || null) : null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- card-view-model`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/card/card-view-model.ts apps/mobile/src/lib/card/__tests__/card-view-model.test.ts
git commit -m "feat(card): pure card-view-model mapper (golden-tested)"
```

---

## Task 7: Share provider seam + resolution

**Files:**
- Create: `apps/mobile/src/share/share-provider.ts`, `apps/mobile/src/share/native-share-provider.ts`, `apps/mobile/src/share/resolve-provider.ts`
- Test: `apps/mobile/src/share/__tests__/resolve-provider.test.ts`

`nativeShareProvider` touches native modules (`captureRef`/`expo-sharing`) and is verified by the on-device smoke; only the **interface + resolution** are unit-tested here.

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/share/__tests__/resolve-provider.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../native-share-provider', () => ({ nativeShareProvider: { id: 'native-share', share: vi.fn() } }));

import { resolveShareProvider } from '../resolve-provider';

describe('resolveShareProvider', () => {
  it('returns the native provider for the native-share gate', () => {
    expect(resolveShareProvider('native-share').id).toBe('native-share');
  });
  it('throws a clear error for not-yet-implemented providers', () => {
    expect(() => resolveShareProvider('server-render')).toThrow(/not implemented/i);
    expect(() => resolveShareProvider('direct-stories')).toThrow(/not implemented/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- resolve-provider`
Expected: FAIL — cannot find module `../resolve-provider`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/share/share-provider.ts
// Pluggable share-action seam (spec §9). ShareResult mirrors the existing
// CalendarResult discriminated-union idiom (lib/calendar-export.ts).
import type { RefObject } from 'react';

export type ShareResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'capture-failed' | 'error'; message: string };

export interface ShareProvider {
  id: string;
  // Captures the referenced card view and hands it to the platform. The ref is
  // the on-screen MomentCard (its rendered output IS the capture source).
  share(cardRef: RefObject<unknown>, opts: { dialogTitle?: string }): Promise<ShareResult>;
}
```

```ts
// apps/mobile/src/share/native-share-provider.ts
// v1 provider: captureRef (view-shot ^5.1.0) → expo-sharing. Verified by the
// on-device capture smoke (Phase 0 spike proved bridgeless-iOS capture).
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { ShareProvider, ShareResult } from './share-provider';

export const nativeShareProvider: ShareProvider = {
  id: 'native-share',
  async share(cardRef, opts): Promise<ShareResult> {
    let uri: string;
    try {
      // result:'tmpfile' → file:// URI expo-sharing consumes directly.
      uri = await captureRef(cardRef as never, { format: 'png', result: 'tmpfile' });
    } catch (e) {
      return { ok: false, reason: 'capture-failed', message: (e as Error)?.message ?? String(e) };
    }
    try {
      if (!(await Sharing.isAvailableAsync())) {
        return { ok: false, reason: 'unavailable', message: 'Sharing is not available on this device.' };
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: opts.dialogTitle });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'error', message: (e as Error)?.message ?? String(e) };
    }
  },
};
```

```ts
// apps/mobile/src/share/resolve-provider.ts
import type { ShareProviderId } from '../config/features';
import type { ShareProvider } from './share-provider';
import { nativeShareProvider } from './native-share-provider';

export function resolveShareProvider(id: ShareProviderId): ShareProvider {
  switch (id) {
    case 'native-share':
      return nativeShareProvider;
    case 'server-render':
    case 'direct-stories':
      throw new Error(`Share provider "${id}" is not implemented yet.`);
    default:
      throw new Error(`Unknown share provider "${id}".`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- resolve-provider`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/share
git commit -m "feat(card): pluggable share-provider seam + native provider"
```

---

## Task 8: `CaptureSafeMoon` — gradient-halo moon (no native shadow)

**Files:**
- Create: `apps/mobile/src/components/card/CaptureSafeMoon.js`

**Verification:** RN component — no vitest. Verified visually + by the Task 11 on-device smoke. The Phase 0 probe already proved this exact mechanism (SVG `RadialGradient` halo) survives `captureRef`.

- [ ] **Step 1: Implement the component**

```jsx
// apps/mobile/src/components/card/CaptureSafeMoon.js
// Capture-safe moon for the Moment Card. The daily-note Moon/DailyHero halo is
// a NATIVE SHADOW, which react-native-view-shot may drop from the exported PNG
// (spec §7b). Here the halo is an SVG RadialGradient layer instead. Reuses the
// MOOD_TOKENS colors, but the alphas are RE-DERIVED for a gradient (the
// 0.95/0.75/0.55/0.35 shadow alphas over-saturate as gradient stops). DO NOT
// edit Moon.js — it's shared and relies on its own shadow contract.
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// rgb triplets from MOOD_TOKENS (mood-tokens.js), gradient alphas re-derived.
const HALO = {
  strong: { rgb: '240,216,154', a0: 0.55 },
  good:   { rgb: '169,141,255', a0: 0.50 },
  mixed:  { rgb: '212,184,114', a0: 0.38 },
  closed: { rgb: '184,176,204', a0: 0.22 },
};
const MOON_FILL = '#FBF6E9';

export default function CaptureSafeMoon({ mood = 'good', size = 96, haloScale = 2.6 }) {
  const h = HALO[mood] ?? HALO.good;
  const box = size * haloScale;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={box} height={box} style={{ position: 'absolute' }} pointerEvents="none">
        <Defs>
          <RadialGradient id="csm-halo" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0" stopColor={`rgb(${h.rgb})`} stopOpacity={String(h.a0)} />
            <Stop offset="0.55" stopColor={`rgb(${h.rgb})`} stopOpacity={String(h.a0 * 0.35)} />
            <Stop offset="1" stopColor={`rgb(${h.rgb})`} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={box} height={box} fill="url(#csm-halo)" />
      </Svg>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: MOON_FILL }} />
    </View>
  );
}
```

- [ ] **Step 2: Smoke-render (optional, via the Phase 0 flag pattern)**

Temporarily render `<CaptureSafeMoon mood="strong" />` etc. in any dev surface and confirm the four moods show distinct halo intensities. (The Task 11 smoke is the binding check.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/card/CaptureSafeMoon.js
git commit -m "feat(card): CaptureSafeMoon — gradient halo (capture-safe), reuses MOOD_TOKENS colors"
```

---

## Task 9: `MomentCard` — Composition A, center-safe, aspect prop

**Files:**
- Create: `apps/mobile/src/components/card/MomentCard.js`

**Verification:** RN component — Task 11 smoke. Renders a `CardViewModel`; `forwardRef` so the sheet can capture it. Opaque `bg-deep` base, `collapsable={false}`, center-safe content (spec §6/§7/§10).

- [ ] **Step 1: Implement the component**

```jsx
// apps/mobile/src/components/card/MomentCard.js
// Presentational Moment Card (Composition A — Centered Stack, center-safe).
// Renders a CardViewModel built from the window. Capture-safe: opaque base +
// collapsable={false} + gradient halo (no native shadow). aspect: '9:16'|'1:1'
// (spec §7c-3). Reuse-first: HeroGradient bg wash, Starfield, theme, the
// CaptureSafeMoon variant. forwardRef → the sheet captures this node.
import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import CaptureSafeMoon from './CaptureSafeMoon';
import { colors, fonts } from '../../theme';
import { t } from '../../lib/card/card-strings';

// 9:16 and 1:1 at a fixed capture width (3× device px happens automatically).
const DIMS = {
  '9:16': { width: 360, height: 640 },
  '1:1': { width: 360, height: 360 },
};

const MomentCard = forwardRef(function MomentCard({ vm, aspect = '9:16' }, ref) {
  const dims = DIMS[aspect] ?? DIMS['9:16'];
  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, dims]}
    >
      <HeroGradient height={dims.height} />
      <Starfield density="heavy" />
      <View style={styles.center}>
        <CaptureSafeMoon mood={vm.moodKey} size={88} />
        <Text style={styles.intent}>{vm.intentText.toUpperCase()}</Text>
        <Text style={styles.headline}>{vm.headline}</Text>
        <View style={styles.phrasePill}>
          <Text style={styles.phrase}>{vm.tierPhrase}</Text>
        </View>
        <Text style={styles.when}>
          {vm.whenPrimary}{vm.tzAbbrev ? ` ${vm.tzAbbrev}` : ''}
        </Text>
        <Text style={styles.whenSub}>
          {vm.whenSecondary}{vm.city ? ` · ${vm.city}` : ''}
        </Text>
      </View>
      <Text style={styles.watermark}>{`✦ ${t('card.watermark')}`}</Text>
    </View>
  );
});

export default MomentCard;

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgBase, borderRadius: 28, overflow: 'hidden' }, // opaque base
  center: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 16, // center-safe: content stays central
  },
  intent: { fontFamily: fonts.body ?? 'Inter_500Medium', fontSize: 12, letterSpacing: 2.5, color: colors.gold },
  headline: { fontFamily: fonts.displayItalic ?? 'Fraunces_500Medium', fontStyle: 'italic', fontSize: 26, lineHeight: 32, color: colors.text, textAlign: 'center' },
  phrasePill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(139,111,232,0.16)', borderWidth: 1, borderColor: 'rgba(139,111,232,0.40)',
  },
  phrase: { fontFamily: fonts.body ?? 'Inter_500Medium', fontSize: 13, color: colors.text },
  when: { fontFamily: fonts.body ?? 'Inter_400Regular', fontSize: 15, color: colors.text },
  whenSub: { fontFamily: fonts.body ?? 'Inter_400Regular', fontSize: 13, color: colors.textMuted },
  watermark: {
    position: 'absolute', bottom: 22, alignSelf: 'center',
    fontFamily: fonts.display ?? 'Fraunces_500Medium', fontSize: 13, color: colors.textMuted,
  },
});
```

- [ ] **Step 2: Resolve the exact font keys**

Open `src/theme.js`, confirm the real keys for the display-italic + body fonts; replace the `fonts.displayItalic ?? …` / `fonts.body ?? …` fallbacks with the exact `fonts.*` names (a typo silently falls back and the fallback is what rasterizes — spec §9). Commit only after the names match `theme.js`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/card/MomentCard.js
git commit -m "feat(card): MomentCard — Composition A, center-safe, 9:16 + 1:1 aspect"
```

---

## Task 10: `useMomentCardShare` hook

**Files:**
- Create: `apps/mobile/src/hooks/useMomentCardShare.js`

**Verification:** orchestration over native modules — Task 11 smoke.

- [ ] **Step 1: Implement the hook**

```jsx
// apps/mobile/src/hooks/useMomentCardShare.js
// Orchestrates: resolve provider (from FEATURES gate) → capture the card ref →
// share → surface failures via toast. The card ref is the on-screen MomentCard.
import { useCallback, useState } from 'react';
import { FEATURES } from '../config/features';
import { resolveShareProvider } from '../share/resolve-provider';

export function useMomentCardShare(showToast) {
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async (cardRef) => {
    setSharing(true);
    try {
      const provider = resolveShareProvider(FEATURES.MOMENT_CARD_SHARE_PROVIDER);
      const result = await provider.share(cardRef, { dialogTitle: 'Share this moment' });
      if (!result.ok && result.reason !== 'cancelled') {
        showToast(
          result.reason === 'unavailable'
            ? 'Sharing isn’t available on this device.'
            : 'Couldn’t create the card. Please try again.',
          'warn',
        );
      }
      return result;
    } catch (e) {
      showToast('Couldn’t create the card. Please try again.', 'warn');
      return { ok: false, reason: 'error', message: String(e) };
    } finally {
      setSharing(false);
    }
  }, [showToast]);

  return { share, sharing };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/hooks/useMomentCardShare.js
git commit -m "feat(card): useMomentCardShare orchestration hook"
```

---

## Task 11: `MomentCardSheet` + wire into Moment Detail (+ on-device smoke)

**Files:**
- Create: `apps/mobile/src/components/card/MomentCardSheet.js`
- Modify: `apps/mobile/src/screens/MomentDetailScreen.js`

**Verification:** this is the integration + the **on-device acceptance smoke** (spec §11).

- [ ] **Step 1: Implement the sheet**

```jsx
// apps/mobile/src/components/card/MomentCardSheet.js
// Share Preview sheet: hosts the LIVE MomentCard (its rendered output is the
// capture source), the two privacy toggles + the aspect choice, and the Share
// button. Toggles re-render the card live. Reuses the in-app Modal/sheet idiom.
import React, { useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Switch, StyleSheet, ScrollView } from 'react-native';
import MomentCard from './MomentCard';
import { buildCardViewModel, defaultShowIntent } from '../../lib/card/card-view-model';
import { useMomentCardShare } from '../../hooks/useMomentCardShare';
import { getLastLocation } from '../../lib/location-storage';
import { colors, fonts } from '../../theme';

export default function MomentCardSheet({ visible, onClose, window: w, activity, showToast }) {
  const location = useMemo(() => getLastLocation(), []);
  const [showLocation, setShowLocation] = useState(false);
  const [showIntent, setShowIntent] = useState(defaultShowIntent(activity));
  const [aspect, setAspect] = useState('9:16');
  const cardRef = useRef(null);
  const { share, sharing } = useMomentCardShare(showToast);

  const vm = useMemo(
    () => buildCardViewModel(w, { activity, location, showLocation, showIntent }),
    [w, activity, location, showLocation, showIntent],
  );

  const onShare = async () => {
    const r = await share(cardRef);
    if (r.ok) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.cardWrap}>
              <MomentCard ref={cardRef} vm={vm} aspect={aspect} />
            </View>

            <Row label="Show my city" value={showLocation} onChange={setShowLocation} />
            <Row label="Show the occasion" value={showIntent} onChange={setShowIntent} />

            <View style={styles.aspectRow}>
              {['9:16', '1:1'].map((a) => (
                <Pressable key={a} onPress={() => setAspect(a)} style={[styles.chip, aspect === a && styles.chipOn]}>
                  <Text style={[styles.chipText, aspect === a && styles.chipTextOn]}>{a}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={onShare} disabled={sharing} style={[styles.shareBtn, sharing && styles.shareBusy]}>
              <Text style={styles.shareText}>{sharing ? 'Preparing…' : 'Share'}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface2, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  scroll: { padding: 20, gap: 14, alignItems: 'stretch' },
  cardWrap: { alignItems: 'center', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontFamily: fonts.body ?? 'Inter_500Medium', fontSize: 15, color: colors.text },
  aspectRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderGlow },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.body ?? 'Inter_500Medium', color: colors.textMuted },
  chipTextOn: { color: colors.text },
  shareBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  shareBusy: { opacity: 0.5 },
  shareText: { fontFamily: fonts.body ?? 'Inter_600SemiBold', fontSize: 16, color: colors.text },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontFamily: fonts.body ?? 'Inter_400Regular', color: colors.textMuted },
});
```

- [ ] **Step 2: Wire into MomentDetailScreen**

In `apps/mobile/src/screens/MomentDetailScreen.js`:
1. Import the sheet: `import MomentCardSheet from '../components/card/MomentCardSheet';`
2. Add state near the other `useState`s: `const [cardOpen, setCardOpen] = useState(false);`
3. Replace the body of the existing `handleShare` (lines ~188–207) with: `const handleShare = () => setCardOpen(true);`
4. Wire the inert header `IconBtn` (lines ~224–226) `onPress={handleShare}` so both Share surfaces open the sheet (the footer Share button already calls `handleShare`).
5. Render the sheet as a sibling of the Toast (near lines ~356–363):

```jsx
<MomentCardSheet
  visible={cardOpen}
  onClose={() => setCardOpen(false)}
  window={w}
  activity={activity}
  showToast={showToast}
/>
```

Confirm `activity` (line ~157) and `showToast` (lines ~148–153) are in scope at the render site.

- [ ] **Step 3: ON-DEVICE ACCEPTANCE SMOKE (the gate, spec §11)**

Re-enable a dev build (`npx expo run:ios`), open a real moment, tap Share. Verify **in the exported PNG** (use the Share sheet → Save Image, or re-add a temporary `captureRef`→log as in the Phase 0 probe):
- Both `9:16` and `1:1` produce a clean, valid PNG.
- **Halo appears in the PNG** (capture-safe) — before any intensity judgment — then reads tier-correct (gold for strong, violet for good, etc.).
- Default (toggles off): **no city, no clock, no tz** — soft band only; sensitive activity shows the generic line.
- Location toggle on: coarse **city + tz-abbrev + exact clock** appear.
- "Show the occasion" off: **no activity name**.
- Fraunces headline + Inter chrome rasterize (no fallback font).

Record PASS/FAIL. (Real-device iOS remains the deferred pre-ship gate.)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/card/MomentCardSheet.js apps/mobile/src/screens/MomentDetailScreen.js
git commit -m "feat(card): Share Preview sheet + wire Moment Detail entry; on-device smoke"
```

---

## Task 12: Remove Phase 0 spike scaffolding

**Files:**
- Remove: `apps/mobile/src/screens/CaptureSpikeScreen.js`
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Delete the probe + flag**

```bash
git rm apps/mobile/src/screens/CaptureSpikeScreen.js
```

In `App.js`, remove: the `CaptureSpikeScreen` import, the `SPIKE_CAPTURE` constant, and the `if (SPIKE_CAPTURE) { … }` early-return block.

- [ ] **Step 2: Verify the app + tests are clean**

Run: `cd apps/mobile && npm test` → Expected: PASS (all card suites green).
Run: `node -e "require('@babel/core').transformFileSync('App.js',{presets:['babel-preset-expo']})" && echo OK` → Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/App.js
git commit -m "chore(card): remove Phase 0 capture-spike scaffolding"
```

---

## Compound V — Partition Map

Most of this plan is a sequential spine (view-model depends on helpers; components depend on the view-model). Disjoint leaf-helpers can parallelize after Task 1.

| Batch | Tasks | Files (disjoint) | Parallel? | Model |
|---|---|---|---|---|
| 0 (sequential, first) | Task 1 `features.ts` | `src/config/features.ts` (SHARED — gate) | No | Sonnet |
| 1 (parallel) | Tasks 2, 3, 4, 5 | `lib/card/grade-to-mood.ts`, `lib/card/time-of-day.ts`, `lib/card/format-tz.ts`, `lib/card/card-strings.ts` (all disjoint) | **Yes** | Sonnet |
| 2 (sequential) | Task 6 `card-view-model` | `lib/card/card-view-model.ts` (imports batch 1) | No | Sonnet |
| 3 (parallel) | Task 7 share seam · Task 8 `CaptureSafeMoon` | `src/share/*` · `components/card/CaptureSafeMoon.js` (disjoint) | **Yes** | Sonnet |
| 4 (sequential) | Task 9 `MomentCard` | `components/card/MomentCard.js` (imports CaptureSafeMoon + view-model) | No | Sonnet |
| 5 (sequential) | Task 10 hook → Task 11 sheet+screen | `hooks/useMomentCardShare.js`, `components/card/MomentCardSheet.js`, `screens/MomentDetailScreen.js` (SHARED screen) | No | Opus (integration + on-device smoke) |
| 6 (sequential, last) | Task 12 cleanup | `App.js` (SHARED), delete probe | No | Sonnet |

**Shared-resource notes:** `features.ts` (Batch 0, must precede anything reading the gate), `MomentDetailScreen.js` + `App.js` (single-writer, sequential). `Moon.js`, `mood-tokens.js`, `activities.ts`, `theme.js` are **read-only imports** — never modified.

---

## Self-Review

**Spec coverage:** §3 native path (Tasks 7, 11) · §4 spike (done; §11 smoke in Task 11) · §6 content/data (Task 6) · §7a gradeToMood (Task 2, golden) · §7b capture-safe halo (Task 8) · §7c-1 intent default (Tasks 5, 6) · §7c-2 soft time (Tasks 3, 6) · §7c-3 aspect 9:16+1:1 (Tasks 9, 11) · §8 i18n seam (Task 5) · §9 architecture/units (all) · §10 composition A (Task 9) · §11 testing+smoke (Tasks 1–7 vitest, Task 11 smoke) · §12 server fallback slot (Task 7 throws "not implemented") · §13 non-fortune-telling (Task 5 forbidden-word test). Quota-exempt: no API call anywhere in the card flow (§10). ✓ No gaps.

**Placeholder scan:** No TBD/TODO; every code step is complete. Tier phrases are explicitly DRAFT-pending-astrologer (a real value is shipped, flagged in §12) — not a placeholder.

**Type consistency:** `MoodKey` (Task 2) ⇒ `TIER_PHRASES` keys (Task 5) ⇒ `vm.moodKey` (Task 6) ⇒ `CaptureSafeMoon mood` (Task 8). `CardViewModel` fields (Task 6) match `MomentCard` reads (Task 9). `ShareProviderId` (Task 1) ⇒ `resolveShareProvider` (Task 7) ⇒ `FEATURES.MOMENT_CARD_SHARE_PROVIDER` (Task 10). `ShareResult` (Task 7) ⇒ hook handling (Task 10). ✓
