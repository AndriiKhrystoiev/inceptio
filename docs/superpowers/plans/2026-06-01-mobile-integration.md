# Mobile Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Worker-side daily-note feature (already shipped at commit `03b1324`, frozen until astrologer ruling) into the mobile app's Today screen, retiring the prototype `CardA/B/C` hero and laying scaffold for a future SavedSearch concept.

**Architecture:** New `useDailyNote()` hook calls a new `getDailyNote()` in `lib/api.ts` that hits the existing Worker `/daily-note` endpoint. Response feeds a new `DailyNoteSection` component family under `src/components/daily-note/` (deliberate subfolder for mental-model parity with the Worker's `daily-notes/` directory). `TodayScreen.js` shrinks from ~320 LOC to ~40 by replacing the three-state hero (`CardA/CardB/CardC` + `useTodayMoment`) with the section, dropping "Best windows ahead", keeping `StatePicker` (rewired to mood values) and the `PrimaryButton`. Saved-search status components ship as unwired scaffold for a future SavedSearch feature.

**Tech Stack:** Expo SDK 55, React Native 0.83, NativeWind (Tailwind for RN), TanStack Query v5 (already installed), AsyncStorage v2 via the sync `storage` wrapper, vitest 2.1.9 (lib/ tests only — no component tests in this codebase), Maestro (3 existing flows + 1 new tour flow).

**Hard scope boundary:** `workers/api-proxy/**` is FROZEN until the astrologer-ruling PR. No Worker changes in this plan. The mobile spec's contract assumptions are locked against Worker commit `03b1324`.

---

## File Structure

**Create:**
```
apps/mobile/src/lib/format-date.ts
apps/mobile/src/lib/__tests__/format-date.test.ts
apps/mobile/src/lib/__tests__/post-alert-ack.test.ts
apps/mobile/src/hooks/useDailyNote.ts
apps/mobile/src/components/daily-note/mood-tokens.js
apps/mobile/src/components/daily-note/DailyHero.js
apps/mobile/src/components/daily-note/DailyNoteBody.js
apps/mobile/src/components/daily-note/EmptyInvite.js
apps/mobile/src/components/daily-note/DailyNoteSection.js
apps/mobile/src/components/daily-note/scaffold/README.md
apps/mobile/src/components/daily-note/scaffold/activity-display.js
apps/mobile/src/components/daily-note/scaffold/SavedRow.js
apps/mobile/src/components/daily-note/scaffold/InWindowCard.js
apps/mobile/src/components/daily-note/scaffold/NewWindowCard.js
apps/mobile/src/components/daily-note/scaffold/StatusStack.js
apps/mobile/maestro/flows/04-daily-note-tour.yaml
```

**Modify:**
```
apps/mobile/src/lib/api.ts                — add getDailyNote() and postAlertAck()
apps/mobile/src/lib/location-storage.ts:4 — update stale useTodayMoment doc-comment
apps/mobile/src/lib/nav-params.ts:9       — update stale useTodayMoment doc-comment
apps/mobile/src/screens/TodayScreen.js    — replace hero (~280 LOC delete, ~40 LOC final)
apps/mobile/maestro/flows/01-wedding-full.yaml   — recalibrate scroll count empirically
apps/mobile/maestro/flows/02-travel-quick.yaml   — recalibrate scroll count empirically
apps/mobile/maestro/flows/03-list-view-demo.yaml — recalibrate scroll count empirically
```

**Delete:**
```
apps/mobile/src/hooks/useTodayMoment.ts   — sole caller (TodayScreen.js) is refactored
```

**Untouched (DO NOT modify):**
```
workers/api-proxy/**       — frozen until astrologer-ruling PR
src/components/Moon.js     — halo work happens at wrapper level (DailyHero), Moon.js stays a primitive
src/components/StatusLine.js — different concept (score+grade pill); subfolder sidesteps the collision
src/components/MoonRiseHeader.js — still used by Calendar/You screens, not Today
src/components/ActivityChip.js / src/screens/ActivityPickerScreen.js — known emoji surfaces; cleanup deferred to SavedSearch wire-in
src/lib/draft-store.ts     — SavedMoment shape stays as-is
src/lib/query-client.ts    — global TQ config stays; useDailyNote overrides per-query
src/theme.js               — no new tokens for MVP (all four mood colors already exist)
```

---

## Astrologer-ruling sequencing — N/A

The Worker is frozen pending astrologer ruling on Mercury/Venus retrograde phrasings (per spec §11.4 of the voice doc). The mobile integration does NOT depend on which phrasings ship — the contract (`/daily-note` returns `DailyNoteResponseShape`) is stable across the ruling. Whatever copy lands in `closed-mercury-retrograde` / `closed-venus-retrograde` arrives via the API response and renders correctly without mobile changes.

---

# Phase 1 — Data layer

## Task 1: `format-date.ts` + test

**Files:**
- Create: `apps/mobile/src/lib/format-date.ts`
- Create: `apps/mobile/src/lib/__tests__/format-date.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/lib/__tests__/format-date.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDailyEyebrow } from '../format-date';

describe('formatDailyEyebrow', () => {
  it('formats an ISO date as lowercase "weekday, mon day"', () => {
    // 2026-05-23 was a Saturday in en-US calendar
    expect(formatDailyEyebrow('2026-05-23')).toBe('saturday, may 23');
  });

  it('uses short month name', () => {
    // 2026-09-04 was a Friday
    expect(formatDailyEyebrow('2026-09-04')).toBe('friday, sep 4');
  });

  it('does not pad single-digit days', () => {
    // 2026-01-01 was a Thursday
    expect(formatDailyEyebrow('2026-01-01')).toBe('thursday, jan 1');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/__tests__/format-date.test.ts`
Expected: FAIL with "Cannot find module '../format-date'"

- [ ] **Step 3: Implement `format-date.ts`**

Create `apps/mobile/src/lib/format-date.ts`:

```ts
/**
 * Format an ISO YYYY-MM-DD date as the daily-note eyebrow string,
 * e.g. "saturday, may 23".
 *
 * Source of the input: the daily-note response's `daily_note.date` field
 * (Worker-emitted ISO date in event tz per PICKER-CONTRACT §2).
 *
 * Used by:
 *   - DailyNoteBody (the eyebrow above the daily-note headline)
 *
 * Five other surfaces in the codebase format dates ad-hoc with their own
 * Intl.DateTimeFormat calls (DatePickerScreen, YourMomentsScreen,
 * MomentDetailScreen, CalendarScreen, current TodayScreen). Broader
 * consolidation is deferred to a separate codebase-hygiene pass.
 */
export function formatDailyEyebrow(dateIso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(`${dateIso}T00:00:00Z`))
    .toLowerCase();
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/__tests__/format-date.test.ts`
Expected: PASS — 3/3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/format-date.ts apps/mobile/src/lib/__tests__/format-date.test.ts
git commit -m "feat(mobile/lib): formatDailyEyebrow shared helper"
```

---

## Task 2: `api.ts` — `getDailyNote()`

**Files:**
- Modify: `apps/mobile/src/lib/api.ts` — append `getDailyNote()` after the existing exports

No test in this task — `getDailyNote()` is exercised through `useDailyNote` (Task 4) and the Maestro `04-daily-note-tour.yaml` (Task 21). The shared-types `DailyNoteResponseSchema` enforces shape at runtime.

- [ ] **Step 1: Append `getDailyNote()` to `api.ts`**

Append the following to `apps/mobile/src/lib/api.ts` (after the existing `healthCheck()` function at the end of the file):

```ts
// ─── /daily-note ──────────────────────────────────────────────────────────

import { DailyNoteResponseSchema } from '@inceptio/shared-types';
import type { DailyNoteResponse } from '@inceptio/shared-types';

export interface DailyNoteResult {
  response: DailyNoteResponse;
  cacheHit: boolean;
}

export interface GetDailyNoteInput {
  lat: number;
  lng: number;
  tz: string;
}

/**
 * GET /daily-note?lat={n}&lng={n}&tz={iana}
 *
 * Worker contract per docs/superpowers/design-handoff/daily-note/
 * PICKER-CONTRACT.md. Mobile sends lat/lng/tz; Worker derives
 * today_iso_date server-side and returns the full DailyNoteResponseShape
 * (daily_note + saved_searches + total_saved_count + library_version +
 * part_of_day_cutoffs).
 *
 * Errors map to the existing discriminated hierarchy:
 *   - 429 rate-limited → RateLimitError (shares the per-device counter
 *     since /daily-note internally fans out to /electional/search)
 *   - 429 upstream quota → UpstreamQuotaError
 *   - 502 → ServerError(502, ...)
 *   - Zod parse failure → SchemaMismatchError
 */
export async function getDailyNote(
  input: GetDailyNoteInput,
): Promise<DailyNoteResult> {
  const url = `${API_CONFIG.baseUrl}/daily-note?lat=${input.lat}&lng=${input.lng}&tz=${encodeURIComponent(input.tz)}`;

  const res = await fetchWithTimeout(
    url,
    { method: 'GET' },
    API_CONFIG.timeout,
  );

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      reset_at_unix?: number;
      upstream?: { detail?: { error?: { error_code?: string; message?: string } } };
    };
    const upstreamError = body.upstream?.detail?.error;
    if (upstreamError?.error_code === 'RATE_LIMIT_EXCEEDED') {
      throw new UpstreamQuotaError(upstreamError.message ?? 'Upstream quota exhausted');
    }
    throw new RateLimitError(body.reset_at_unix ?? null);
  }

  if (!res.ok) {
    throw new ServerError(res.status, `HTTP ${res.status}`);
  }

  const json = await res.json();
  const parseResult = DailyNoteResponseSchema.safeParse(json);
  if (!parseResult.success) {
    console.error(
      '[getDailyNote] schema mismatch — zod issues:',
      JSON.stringify(parseResult.error.issues, null, 2),
    );
    throw new SchemaMismatchError(parseResult.error.issues);
  }

  return {
    response: parseResult.data,
    cacheHit: parseResult.data.cache_hit ?? false,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/api.ts
git commit -m "feat(mobile/api): getDailyNote() client for /daily-note endpoint"
```

---

## Task 3: `api.ts` — `postAlertAck()` + smoke test

**Files:**
- Modify: `apps/mobile/src/lib/api.ts` — append `postAlertAck()`
- Create: `apps/mobile/src/lib/__tests__/post-alert-ack.test.ts`

`postAlertAck` is API surface contract, not dead logic. Smoke test catches silent drift (renamed fields, swapped headers, refactored device-id calls).

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/lib/__tests__/post-alert-ack.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// device-id reads from storage which requires hydration; mock it.
vi.mock('../device-id', () => ({
  getDeviceId: vi.fn(async () => 'test-device-id-abc'),
}));

import { postAlertAck, ServerError } from '../api';

describe('postAlertAck', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('POSTs { device_id, alert_id } to /daily-note/alert-ack', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    await postAlertAck('alert-test-1');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]!;
    expect(String(calledUrl)).toContain('/daily-note/alert-ack');
    expect(calledInit).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    });
    const body = JSON.parse(String(calledInit.body));
    expect(body).toEqual({
      device_id: 'test-device-id-abc',
      alert_id: 'alert-test-1',
    });
  });

  it('throws ServerError on 5xx', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 })) as unknown as typeof fetch;

    await expect(postAlertAck('alert-x')).rejects.toBeInstanceOf(ServerError);
  });

  it('throws ServerError on 4xx', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 400 })) as unknown as typeof fetch;

    await expect(postAlertAck('alert-x')).rejects.toBeInstanceOf(ServerError);
  });

  it('resolves void on 200', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 })) as unknown as typeof fetch;

    await expect(postAlertAck('alert-x')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/__tests__/post-alert-ack.test.ts`
Expected: FAIL — `postAlertAck` is not yet exported from `../api`.

- [ ] **Step 3: Append `postAlertAck()` to `api.ts`**

Append the following to `apps/mobile/src/lib/api.ts` (after `getDailyNote()` from Task 2):

```ts
/**
 * POST /daily-note/alert-ack
 *
 * Fire-and-forget acknowledgement of a new-window alert. KV.put is
 * idempotent — calling this twice with the same alert_id is a no-op.
 *
 * Currently unwired in MVP: NewWindowCard (scaffold/) doesn't render,
 * so no caller invokes this. Function exists as API surface contract
 * so a future SavedSearch wire-in plugs in mechanically. Smoke test in
 * src/lib/__tests__/post-alert-ack.test.ts guards against silent drift
 * (renamed fields, swapped headers) before the caller arrives.
 *
 * Future timing decision (pinned in design memo §6):
 *   When NewWindowCard wires in, ack on USER INTERACTION (tap card to
 *   navigate or tap to dismiss). NOT on render. NOT on viewport
 *   visibility. Render-ack treats scroll-past as a dismissal — wrong.
 */
export async function postAlertAck(alertId: string): Promise<void> {
  const deviceId = await getDeviceId();
  const url = `${API_CONFIG.baseUrl}/daily-note/alert-ack`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, alert_id: alertId }),
    },
    API_CONFIG.timeout,
  );
  if (!res.ok) {
    throw new ServerError(res.status, `Alert ack failed: HTTP ${res.status}`);
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/__tests__/post-alert-ack.test.ts`
Expected: PASS — 4/4 tests green.

If you see a failure with `Cannot find module '../device-id'` or similar at import time, the vitest environment is choking on a transitive native-module import via `src/config/api.ts` (verification nit from the spec §13 handoff). Add a vitest mock for whichever module is the problem and re-run. The `Platform.OS` import from react-native is the likely culprit — mock it at the top of the test:

```ts
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/api.ts apps/mobile/src/lib/__tests__/post-alert-ack.test.ts
git commit -m "feat(mobile/api): postAlertAck() + smoke test for unwired API surface contract"
```

---

## Task 4: `useDailyNote` hook

**Files:**
- Create: `apps/mobile/src/hooks/useDailyNote.ts`

This hook mirrors the *shape* of `useElectionalSearch.ts` (queryKey + queryFn + enabled) but **diverges on cache policy**: overrides the global `query-client.ts` defaults (`staleTime: 6 days`, `gcTime: 7 days`) with `staleTime: Infinity` + `gcTime: 24h` because the queryKey embeds `todayIsoDate` — day rollover auto-rolls via the key change, no spontaneous refetches within a day. Also includes the silent library-version invalidation per spec §3 Layer 1.

- [ ] **Step 1: Create the hook**

Create `apps/mobile/src/hooks/useDailyNote.ts`:

```ts
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getDailyNote, type DailyNoteResult } from '../lib/api';
import { getLastLocation } from '../lib/location-storage';
import { storage } from '../lib/storage';

const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
} as const;

const KEY_LIBRARY_VERSION = 'inceptio.daily_note_library_version';

/**
 * Build today_iso_date as the local-calendar date in the event location's tz.
 * Uses Intl.DateTimeFormat with `en-CA` because that locale produces
 * YYYY-MM-DD natively (no manual padding needed) and Hermes ships full ICU
 * in RN 0.83 / Expo SDK 55.
 */
function isoTodayInTz(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

/**
 * The Today screen's data source per design memo Layer 1.
 *
 * Hook shape mirrors useElectionalSearch.ts (queryKey + queryFn + enabled).
 * Cache policy DIVERGES from query-client.ts defaults: staleTime is
 * Infinity (queryKey embeds todayIsoDate, so day rollover triggers a fresh
 * fetch automatically — no spontaneous refetches within a day) and gcTime
 * is 24h (release memory by the next day at latest).
 *
 * Library-version invalidation (PICKER-CONTRACT §6, design memo §3):
 *   On every successful fetch, compare response.library_version against
 *   the persisted marker. On mismatch, store the new value and
 *   invalidateQueries(['daily-note']) — silent, no UI surface.
 *   Astrology changes quietly.
 */
export function useDailyNote(): UseQueryResult<DailyNoteResult, Error> {
  const queryClient = useQueryClient();

  const { lat, lng, tz } = useMemo(() => {
    const loc = getLastLocation();
    if (loc) return { lat: round2(loc.lat), lng: round2(loc.lng), tz: loc.timezone };
    return {
      lat: round2(FALLBACK_LOCATION.lat),
      lng: round2(FALLBACK_LOCATION.lng),
      tz: FALLBACK_LOCATION.timezone,
    };
  }, []);

  const todayIsoDate = useMemo(() => isoTodayInTz(tz), [tz]);

  const query = useQuery<DailyNoteResult, Error>({
    queryKey: ['daily-note', lat, lng, tz, todayIsoDate] as const,
    queryFn: () => getDailyNote({ lat, lng, tz }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: true,
  });

  // Silent library-version invalidation. Runs after every successful fetch.
  useEffect(() => {
    if (!query.data) return;
    const incoming = query.data.response.library_version;
    const lastSeen = storage.getString(KEY_LIBRARY_VERSION);
    if (lastSeen !== incoming) {
      storage.set(KEY_LIBRARY_VERSION, incoming);
      queryClient.invalidateQueries({ queryKey: ['daily-note'] });
    }
  }, [query.data, queryClient]);

  return query;
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useDailyNote.ts
git commit -m "feat(mobile/hooks): useDailyNote with silent library-version invalidation"
```

---

# Phase 2 — Daily-note components

No vitest tests in this phase — the mobile codebase doesn't test components. Visual verification happens through Maestro `04-daily-note-tour.yaml` (Task 21) and manual Expo Go runs.

## Task 5: `mood-tokens.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/mood-tokens.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/mood-tokens.js`:

```js
// Mood → visual treatment tokens for the daily-note hero.
// All four colors already exist in theme.js; no new theme tokens.
//
// NO `phase` field. The DailyNote.jsx mockup had phase-per-mood defaults
// as a fallback. Production strictly uses the API's moon_phase. The mood
// determines color/halo only, never overrides the actual lunar cycle.
// Removing the field is a structural guarantee that mood and moon_phase
// don't conflate semantically.
import { colors } from '../../theme';

export const MOOD_TOKENS = {
  strong: { dot: colors.gold,        halo: 'rgba(240,216,154,0.55)', dim: false },
  good:   { dot: colors.primaryGlow, halo: 'rgba(169,141,255,0.45)', dim: false },
  mixed:  { dot: colors.goldMuted,   halo: 'rgba(212,184,114,0.30)', dim: false },
  closed: { dot: colors.textSubtle,  halo: null,                     dim: true },
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/daily-note/mood-tokens.js
git commit -m "feat(mobile/daily-note): mood tokens (color/halo/dim per quality bucket)"
```

---

## Task 6: `DailyHero.js` (+ LoadingHero + ErrorHero named exports)

**Files:**
- Create: `apps/mobile/src/components/daily-note/DailyHero.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/DailyHero.js`:

```js
// DailyHero — backdrop for the daily-note section.
//
// Composition: HeroGradient + Starfield + (mood-haloed Moon | Pulse | error).
// Three variants share the same backdrop so load→loaded→error transitions
// don't reflow the whole zone:
//
//   default export  — DailyHero        (rendered when data is loaded)
//   named LoadingHero                  (rendered while data is fetching)
//   named ErrorHero                    (rendered on fetch error)
//
// Moon halo: wraps the existing Moon primitive in a <View> with
// shadowColor/shadowOpacity/shadowRadius driven by MOOD_TOKENS. Passes
// glow={false} to Moon so its default gold halo doesn't double-draw.
// Moon.js itself stays unchanged — its other consumers (MoonRiseHeader on
// Calendar/You, OnboardingScreen, MomentDetailScreen) keep the default
// gold halo.
//
// Platform note: shadowColor paints a colored halo on iOS. Android's
// elevation falls back to a generic grey material drop-shadow, not a
// colored halo. Acceptable for MVP — halo is decorative.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import Moon from '../Moon';
import Pulse from '../Pulse';
import { MOOD_TOKENS } from './mood-tokens';
import { friendlyMessage } from '../../lib/error-messages';

function HeroBackdrop({ children }) {
  return (
    <View
      className="overflow-hidden pt-[60px] pb-5 px-6"
      style={{ minHeight: 260 }}>
      <HeroGradient height={300}/>
      <Starfield density="heavy"/>
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
}

/**
 * Default — rendered when daily-note data has loaded.
 * Props:
 *   mood     — one of 'strong' | 'good' | 'mixed' | 'closed' (drives halo/dim)
 *   phase    — one of 8 MoonPhase values (drives the moon glyph)
 *   children — DailyNoteBody (eyebrow + headline + supporting)
 */
export default function DailyHero({ mood = 'good', phase = 'waxing-crescent', children }) {
  const m = MOOD_TOKENS[mood] || MOOD_TOKENS.good;
  return (
    <HeroBackdrop>
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: 0,
          opacity: m.dim ? 0.55 : 1,
          // iOS colored halo via shadow. Android falls back to grey elevation.
          ...(m.halo
            ? {
                shadowColor: m.halo.replace(/rgba\(([^)]+),[^,]+\)/, 'rgba($1,1)'),
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 13,
                elevation: 2,
              }
            : null),
        }}>
        <Moon phase={phase} size={62} glow={false}/>
      </View>
      <View>{children}</View>
    </HeroBackdrop>
  );
}

/**
 * Named export — rendered while useDailyNote.isLoading.
 * Same backdrop, centered Pulse + text, no moon.
 */
export function LoadingHero() {
  return (
    <HeroBackdrop>
      <View className="items-center justify-center" style={{ minHeight: 160 }}>
        <Pulse/>
        <Text className="font-ui text-[14px] text-muted mt-4">
          Looking at the sky for you…
        </Text>
      </View>
    </HeroBackdrop>
  );
}

/**
 * Named export — rendered when useDailyNote.isError.
 * Same backdrop, centered friendlyMessage + retry pressable, no moon.
 */
export function ErrorHero({ error, onRetry }) {
  return (
    <HeroBackdrop>
      <View className="items-center justify-center px-4" style={{ minHeight: 160 }}>
        <Text className="font-display-reg text-[20px] leading-7 text-cream text-center">
          {friendlyMessage(error)}
        </Text>
        <Pressable onPress={onRetry} className="mt-3">
          <Text className="font-ui-med text-[14px] text-primary-glow">Try again</Text>
        </Pressable>
      </View>
    </HeroBackdrop>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/daily-note/DailyHero.js
git commit -m "feat(mobile/daily-note): DailyHero with LoadingHero + ErrorHero variants"
```

---

## Task 7: `DailyNoteBody.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/DailyNoteBody.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/DailyNoteBody.js`:

```js
// DailyNoteBody — the actual daily-note content rendered inside DailyHero.
//
// Layout (top → bottom):
//   eyebrow row:  6×6 mood dot (with halo shadow except closed) + date string
//   headline:     Fraunces 500 32/38 cream, max-w 300, tracking -0.02em
//   supporting:   Inter 400 15/22 muted, max-w 318, mt 12
//
// Hard maxima from voice spec §7: headline ≤ 48 chars, supporting ≤ 140.
// Awkward wraps at the limit are COPY-side fixes in the Worker dictionary,
// NOT layout fixes. The Worker lint enforces the maxes; mobile renders.

import React from 'react';
import { View, Text } from 'react-native';
import { MOOD_TOKENS } from './mood-tokens';
import { formatDailyEyebrow } from '../../lib/format-date';

/**
 * Props:
 *   mood       — 'strong' | 'good' | 'mixed' | 'closed' (drives dot color/halo)
 *   date       — ISO YYYY-MM-DD from daily_note.date (event tz)
 *   headline   — locked copy, ≤ 48 chars
 *   supporting — locked copy, ≤ 140 chars
 */
export default function DailyNoteBody({ mood = 'good', date, headline, supporting }) {
  const m = MOOD_TOKENS[mood] || MOOD_TOKENS.good;
  const eyebrow = date ? formatDailyEyebrow(date) : '';
  return (
    <View>
      <View className="flex-row items-center" style={{ marginBottom: 12 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: m.dot,
            ...(m.halo
              ? {
                  shadowColor: m.halo.replace(/rgba\(([^)]+),[^,]+\)/, 'rgba($1,1)'),
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 4,
                  elevation: 1,
                }
              : null),
            marginRight: 8,
          }}
        />
        <Text className="font-ui-med text-[13px] text-muted lowercase" style={{ letterSpacing: 0.4 }}>
          {eyebrow}
        </Text>
      </View>

      <Text
        className="font-display text-cream"
        style={{ fontSize: 32, lineHeight: 38, letterSpacing: -0.6, maxWidth: 300 }}>
        {headline}
      </Text>

      <Text
        className="font-ui text-muted"
        style={{ fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 318 }}>
        {supporting}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/daily-note/DailyNoteBody.js
git commit -m "feat(mobile/daily-note): DailyNoteBody (eyebrow + headline + supporting)"
```

---

## Task 8: `EmptyInvite.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/EmptyInvite.js`

The chip-style invite shown beneath the daily-note hero when the user has zero saved moments. Renders as text `"Choose a moment of your own"` + a separate `<ChevronRight>` icon — NOT as a literal `→` glyph. The voice spec's literal arrow is shorthand for "affordance," not a glyph spec.

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/EmptyInvite.js`:

```js
// EmptyInvite — "Choose a moment of your own" chip rendered beneath the
// daily-note hero ONLY when the user has zero saved moments.
//
// Rendering decision (design memo §8): text + separate chevron icon,
// NOT a literal → glyph in the string. The voice spec §6.2 literal
// "Choose a moment of your own →" is shorthand for "text-with-affordance".
// The icon carries the affordance signal; standard RN separation of
// concerns.
//
// Gating-rationale caveat (design memo §8): gates on
// getSavedMoments().length === 0 in MVP because mobile doesn't have a
// SavedSearch concept yet. The voice spec gates on
// saved_searches.length === 0 — happens to produce identical behavior
// because Worker stubs saved_searches as []. Don't silently flip the
// gate when SavedSearch lands later; surface the decision in the
// SavedSearch brainstorm.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Plus } from 'lucide-react-native';

/**
 * Props:
 *   onPress — invoked when the user taps the chip. Should navigate to the
 *             search/picker flow (same destination as the PrimaryButton at
 *             the bottom of TodayScreen).
 */
export default function EmptyInvite({ onPress }) {
  return (
    <Pressable onPress={onPress}>
      <View
        className="flex-row items-center mx-6 mt-3"
        style={{
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 18,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#5B4F8A',
        }}>
        <View
          className="items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            backgroundColor: 'rgba(139,111,232,0.14)',
            borderWidth: 1,
            borderColor: '#5B4F8A',
          }}>
          <Plus size={18} color="#A98DFF"/>
        </View>
        <Text className="flex-1 font-ui-med text-cream" style={{ fontSize: 15 }}>
          Choose a moment of your own
        </Text>
        <ChevronRight size={18} color="#A98DFF"/>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/daily-note/EmptyInvite.js
git commit -m "feat(mobile/daily-note): EmptyInvite (text + chevron, no literal arrow)"
```

---

## Task 9: `DailyNoteSection.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/DailyNoteSection.js`

The screen-level composer used by TodayScreen. Combines Hero + Body + (EmptyInvite when applicable).

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/DailyNoteSection.js`:

```js
// DailyNoteSection — the screen-level composer used by TodayScreen.
// Combines DailyHero + DailyNoteBody + (EmptyInvite when applicable).
//
// Loading/error states are handled at the screen level via the LoadingHero
// and ErrorHero named exports of DailyHero — this component is rendered
// only when data has loaded successfully.

import React from 'react';
import DailyHero from './DailyHero';
import DailyNoteBody from './DailyNoteBody';
import EmptyInvite from './EmptyInvite';

/**
 * Props:
 *   dailyNote          — { mood, moon_phase, date, headline, supporting } from
 *                        the response's daily_note field. mood may be
 *                        overridden by the screen's StatePicker (design QA).
 *   savedMomentsCount  — getSavedMoments().length; controls EmptyInvite render
 *   onInvitePress      — callback for the EmptyInvite tap (typically
 *                        go('picker'))
 */
export default function DailyNoteSection({ dailyNote, savedMomentsCount, onInvitePress }) {
  return (
    <>
      <DailyHero mood={dailyNote.mood} phase={dailyNote.moon_phase}>
        <DailyNoteBody
          mood={dailyNote.mood}
          date={dailyNote.date}
          headline={dailyNote.headline}
          supporting={dailyNote.supporting}
        />
      </DailyHero>
      {savedMomentsCount === 0 && <EmptyInvite onPress={onInvitePress}/>}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/daily-note/DailyNoteSection.js
git commit -m "feat(mobile/daily-note): DailyNoteSection composer"
```

---

# Phase 3 — Scaffold (built but not wired)

No tests — components aren't rendered. The scaffold's purpose is to lock prop signatures and document the wait-state so a future SavedSearch wire-in is mechanical.

## Task 10: `scaffold/activity-display.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/scaffold/activity-display.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/scaffold/activity-display.js`:

```js
// Activity nouns sourced from voice spec §6.3 STATUS_PRE_WINDOW template.
// MUST match the Worker dictionary verbatim — drift breaks the contract.
// Worker side: workers/api-proxy/src/translations/dictionary/status-lines.ts
// ACTIVITY_NOUNS.
//
// Drift-prevention: the enum is enumerated against the locked voice library,
// not hand-rolled per-call. A scaffold-time mistake like
// `business_launch → 'business'` (which would drop the voice-locked noun
// "Launch") is structurally impossible because the value is sourced from
// this table, not invented at call sites.

export const ACTIVITY_NOUNS = {
  wedding:         'Wedding',
  contracts:       'Contract',
  business_launch: 'Launch',
  travel:          'Travel',
};

export function getActivityNoun(activity) {
  return ACTIVITY_NOUNS[activity] ?? 'Window';
}

// Visual tokens for ActivityPlate. Tint/ring rgba literals at scaffold-time
// MUST promote to theme.js semantic tokens before wire-in per the README's
// "Before wire-in" section.
export const ACTIVITY_DISPLAY = {
  wedding:         { emoji: '💍', tint: 'rgba(249,181,200,0.16)', ring: 'rgba(249,181,200,0.30)' },
  contracts:       { emoji: '📋', tint: 'rgba(244,193,154,0.16)', ring: 'rgba(244,193,154,0.30)' },
  business_launch: { emoji: '🚀', tint: 'rgba(229,199,125,0.16)', ring: 'rgba(229,199,125,0.30)' },
  travel:          { emoji: '✈️', tint: 'rgba(103,232,199,0.16)', ring: 'rgba(103,232,199,0.30)' },
};

/**
 * ActivityPlate — emoji-in-tinted-square used by SavedRow, InWindowCard,
 * NewWindowCard.
 *
 * Props:
 *   activity — Activity enum value
 *   size     — pixel size (default 32)
 */
import React from 'react';
import { View, Text } from 'react-native';

export function ActivityPlate({ activity, size = 32 }) {
  const a = ACTIVITY_DISPLAY[activity] || ACTIVITY_DISPLAY.wedding;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        backgroundColor: a.tint,
        borderWidth: 1,
        borderColor: a.ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.5 }}>{a.emoji}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/daily-note/scaffold/activity-display.js
git commit -m "feat(mobile/daily-note/scaffold): activity-display with §6.3-sourced nouns"
```

---

## Task 11: `scaffold/SavedRow.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/scaffold/SavedRow.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/scaffold/SavedRow.js`:

```js
// SavedRow — quiet status row used inside StatusStack.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ActivityPlate } from './activity-display';

/**
 * Props:
 *   activity — Activity enum value
 *   text     — pre-rendered status string (e.g. "Wedding window — in 3 days")
 *   last     — when true, omits the bottom border
 *   onPress  — tap handler
 */
export default function SavedRow({ activity, text, last, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <View
        className="flex-row items-center"
        style={{
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: '#2A2247',
        }}>
        <ActivityPlate activity={activity}/>
        <Text
          className="flex-1 font-ui"
          style={{ fontSize: 14, lineHeight: 19, color: '#D8D2E4' }}>
          {text}
        </Text>
        <ChevronRight size={16} color="#7A7195"/>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/daily-note/scaffold/SavedRow.js
git commit -m "feat(mobile/daily-note/scaffold): SavedRow (quiet status row)"
```

---

## Task 12: `scaffold/InWindowCard.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/scaffold/InWindowCard.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/scaffold/InWindowCard.js`:

```js
// InWindowCard — emphasized warm-and-steady variant for state='in-window'.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ActivityPlate } from './activity-display';

/**
 * Props:
 *   activity — Activity enum value
 *   text     — main status copy
 *   sub      — optional secondary copy (e.g. "Open until 4:08")
 *   onPress  — tap handler
 */
export default function InWindowCard({ activity, text, sub, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          marginHorizontal: 24,
          marginTop: 12,
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#1F1838',
          borderWidth: 1,
          borderColor: 'rgba(240,216,154,0.42)',
        }}>
        <View className="flex-row items-center" style={{ gap: 8, marginBottom: 12 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: '#F0D89A',
              shadowColor: '#F0D89A',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            }}
          />
          <Text
            className="font-ui-semi uppercase"
            style={{ fontSize: 11, color: '#F0D89A', letterSpacing: 1.1 }}>
            Happening now
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <ActivityPlate activity={activity} size={38}/>
          <View className="flex-1">
            <Text
              className="font-display-reg text-cream"
              style={{ fontSize: 18, lineHeight: 24 }}>
              {text}
            </Text>
            {sub ? (
              <Text style={{ marginTop: 3, fontSize: 13, lineHeight: 18, color: '#E5C77D' }}>
                {sub}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/daily-note/scaffold/InWindowCard.js
git commit -m "feat(mobile/daily-note/scaffold): InWindowCard (emphasized warm)"
```

---

## Task 13: `scaffold/NewWindowCard.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/scaffold/NewWindowCard.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/scaffold/NewWindowCard.js`:

```js
// NewWindowCard — emphasized bright-and-brief variant for state='new-window'.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.
//
// onAck is a generic () => void callback. The future wire-in passes
// () => postAlertAck(alertId) at the use site. NewWindowCard stays ignorant
// of network concerns; tests render it with a noop ack.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ActivityPlate } from './activity-display';

/**
 * Props:
 *   activity — Activity enum value
 *   text     — main status copy (e.g. "A stronger wedding window — Thursday")
 *   alertId  — passed through, used by the future wire-in for onAck
 *   onPress  — tap handler (typically navigates to detail + fires onAck)
 *   onAck    — () => void; future wire-in passes () => postAlertAck(alertId)
 */
export default function NewWindowCard({ activity, text, alertId, onPress, onAck }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          marginHorizontal: 24,
          marginTop: 12,
          padding: 15,
          borderRadius: 16,
          backgroundColor: '#1F1838',
          borderWidth: 1,
          borderColor: 'rgba(169,141,255,0.55)',
        }}>
        <View className="flex-row items-center" style={{ gap: 7, marginBottom: 10 }}>
          <Text style={{ color: '#A98DFF', fontSize: 12 }}>✦</Text>
          <Text
            className="font-ui-semi uppercase"
            style={{ fontSize: 11, color: '#A98DFF', letterSpacing: 1.1 }}>
            New · just found
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <ActivityPlate activity={activity}/>
          <Text
            className="flex-1 font-ui-med text-cream"
            style={{ fontSize: 15, lineHeight: 20 }}>
            {text}
          </Text>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Text className="font-ui-semi" style={{ fontSize: 13, color: '#A98DFF' }}>
              See it
            </Text>
            <ChevronRight size={14} color="#A98DFF"/>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/daily-note/scaffold/NewWindowCard.js
git commit -m "feat(mobile/daily-note/scaffold): NewWindowCard (emphasized bright)"
```

---

## Task 14: `scaffold/StatusStack.js`

**Files:**
- Create: `apps/mobile/src/components/daily-note/scaffold/StatusStack.js`

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/scaffold/StatusStack.js`:

```js
// StatusStack — container for up to 3 SavedRows + "+N more →" overflow.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import SavedRow from './SavedRow';

const VISIBLE_CAP = 3;

/**
 * Props:
 *   rows       — array of { activity, text, onPress } (sorted by priority)
 *   moreCount  — number of overflow rows beyond VISIBLE_CAP
 *   onMore     — tap handler for the "+N more →" affordance
 *   onRow      — tap handler for individual rows (alt to row.onPress)
 */
export default function StatusStack({ rows = [], moreCount = 0, onMore, onRow }) {
  const visible = rows.slice(0, VISIBLE_CAP);
  return (
    <View
      style={{
        marginHorizontal: 24,
        marginTop: 12,
        backgroundColor: '#1F1838',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#3A3258',
        overflow: 'hidden',
      }}>
      {visible.map((r, i) => (
        <SavedRow
          key={`${r.activity}-${i}`}
          activity={r.activity}
          text={r.text}
          last={i === visible.length - 1 && moreCount <= 0}
          onPress={() => (onRow ? onRow(r) : r.onPress?.())}
        />
      ))}
      {moreCount > 0 && (
        <Pressable onPress={onMore}>
          <View
            className="flex-row items-center"
            style={{
              gap: 6,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: '#2A2247',
            }}>
            <Text className="font-ui-med" style={{ fontSize: 13, color: '#A98DFF' }}>
              +{moreCount} more
            </Text>
            <ChevronRight size={14} color="#A98DFF"/>
          </View>
        </Pressable>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/daily-note/scaffold/StatusStack.js
git commit -m "feat(mobile/daily-note/scaffold): StatusStack (3-cap + overflow)"
```

---

## Task 15: `scaffold/README.md` (the wait-state contract)

**Files:**
- Create: `apps/mobile/src/components/daily-note/scaffold/README.md`

The README is the load-bearing artifact for this layer — it documents WHY these components exist unwired, locks the activation criteria, and cross-references known tech debt in the existing production codebase.

- [ ] **Step 1: Create the file**

Create `apps/mobile/src/components/daily-note/scaffold/README.md`:

```markdown
# scaffold/ — built but not wired (MVP scope cut)

These components implement the saved-search status row variants from
PICKER-CONTRACT.md §1 + §2 + §6.4. They are not imported by
DailyNoteSection or any active screen.

## Why deferred

The mobile app's "saved" concept is `SavedMoment` (a bookmarked specific
window — see `lib/draft-store.ts`), not `SavedSearch` (an actively-
monitored search with lifecycle states). The picker contract's
saved_searches array is for the latter. The Worker returns
`saved_searches: []` for MVP, mirroring this.

## Activation criteria

When a `SavedSearch` concept lands (new storage shape, new creation UX,
alert mechanics), the wire-in is:

- DailyNoteSection reads `response.saved_searches` from useDailyNote()
- For each item, select:
    state === 'in-window'                          → InWindowCard
    state === 'new-window' && !acknowledged        → NewWindowCard
    state === 'pre-window'                         → SavedRow
    state === 'none-yet'                           → SavedRow with
                                                     searched_through
                                                     rendered per the
                                                     PICKER-CONTRACT
                                                     precision rule
    state === 'passed'                             → SavedRow visually
                                                     muted (~70% opacity)
                                                     per voice spec
                                                     §6.3.4
- Sort by `priority` (ascending), cap at 3, overflow into
  StatusStack.moreCount.
- NewWindowCard.onAck calls `() => postAlertAck(alertId)`.

## Don't

- Don't try to populate these from SavedMoment data. See Finding A in
  docs/superpowers/specs/2026-05-29-mobile-integration-design.md.
  The semantics don't fit, and a half-working synthesis is worse than
  no rendering.
- Don't reuse src/components/StatusLine.js — different concept
  (score+grade pill).

## Before wire-in — locked requirements

1. **Production wire-in MUST swap emoji for lucide-react-native icons**
   (Heart, FileText, Rocket, Plane or equivalent crafted glyphs). The
   emoji values in activity-display.js (💍/📋/🚀/✈️) are scaffold
   placeholders.

   **Known tech debt — existing emoji surfaces in production:**
   - `src/screens/ActivityPickerScreen.js` ships 💍/📋/🚀/✈️ in the
     activity selector
   - `src/components/ActivityChip.js` is a reusable production emoji
     component

   These predate the documented icon-language goal (thin SVG / lucide).
   At SavedSearch wire-in time, ALL three surfaces (scaffold +
   ActivityPickerScreen + ActivityChip) migrate together to lucide —
   partial migration would create inconsistency. If wire-in lands
   before this cleanup, file a separate cleanup PR FIRST to align
   production with the scaffold's icon language; then wire in. Do not
   ship a half-migrated state.

2. **The four tint/ring rgba literals MUST promote to theme.js as
   semantic tokens before wire-in.** Hard-coded rgba in component code
   does not ship. Promote to colors.activityWeddingTint /
   activityWeddingRing / etc.

3. **Activity nouns MUST source from `ACTIVITY_NOUNS` in
   activity-display.js**, not from hand-rolled `shortName` fields at
   render call sites. The table enumerates against voice spec §6.3 and
   is the structural drift-prevention. A render that hand-codes
   "business" instead of "Launch" is the exact failure mode this table
   was designed to make impossible.
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/daily-note/scaffold/README.md
git commit -m "docs(mobile/daily-note/scaffold): README documenting wait-state + tech debt"
```

---

# Phase 4 — TodayScreen integration

## Task 16: Refactor `TodayScreen.js`

**Files:**
- Modify: `apps/mobile/src/screens/TodayScreen.js` — replace entire body

This is the structurally biggest task: ~280 LOC delete (CardA/B/C, CardShell, CTAInline, deriveState, todayLabel, all related imports) + ~40 LOC of new code wiring the daily-note section.

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/mobile/src/screens/TodayScreen.js` with:

```js
// 01 Today — daily-note hero + Find-a-moment CTA.
// "Best windows ahead" dropped per design memo Layer 5 (info-density vs
// ritual + upstream credit budget). Forward-window browsing lives on
// Calendar.
//
// StatePicker retained as design QA override for the four mood variants.
// Letter prefixes (A·/B·/C·/D·) are dev-tool affordances, not user-facing
// copy — don't "fix" in a voice pass. Load-bearing in Maestro
// 04-daily-note-tour.yaml sentinel.

import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useDailyNote } from '../hooks/useDailyNote';
import DailyNoteSection from '../components/daily-note/DailyNoteSection';
import { LoadingHero, ErrorHero } from '../components/daily-note/DailyHero';
import StatePicker from '../components/StatePicker';
import PrimaryButton from '../components/PrimaryButton';
import { getSavedMoments } from '../lib/draft-store';

export default function TodayScreen({ go }) {
  const { data, isLoading, isError, error, refetch } = useDailyNote();
  const [moodOverride, setMoodOverride] = useState(null);

  if (isLoading) return <LoadingHero/>;
  if (isError) return <ErrorHero error={error} onRetry={refetch}/>;

  const dailyNote = data.response.daily_note;
  const renderedMood = moodOverride ?? dailyNote.mood;
  const savedMomentsCount = getSavedMoments().length;

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 120 }}>
      <DailyNoteSection
        dailyNote={{ ...dailyNote, mood: renderedMood }}
        savedMomentsCount={savedMomentsCount}
        onInvitePress={() => go('picker')}
      />

      <StatePicker
        value={renderedMood}
        onChange={setMoodOverride}
        options={[
          ['strong', 'A · strong'],
          ['good',   'B · good'],
          ['mixed',  'C · mixed'],
          ['closed', 'D · closed'],
        ]}
      />

      <View className="px-6 mt-7">
        <PrimaryButton onPress={() => go('picker')}>Find a moment for…</PrimaryButton>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/TodayScreen.js
git commit -m "refactor(mobile/Today): replace CardA/B/C hero with DailyNoteSection"
```

---

## Task 17: Delete `useTodayMoment.ts` + clean stale doc-comments

**Files:**
- Delete: `apps/mobile/src/hooks/useTodayMoment.ts`
- Modify: `apps/mobile/src/lib/location-storage.ts:4` — update prose
- Modify: `apps/mobile/src/lib/nav-params.ts:9` — update prose

- [ ] **Step 1: Delete the hook file**

Run:

```bash
git rm apps/mobile/src/hooks/useTodayMoment.ts
```

- [ ] **Step 2: Update `location-storage.ts:4` comment**

Open `apps/mobile/src/lib/location-storage.ts`. Find line 4, which currently reads:

```
// useTodayMoment (today's single-day query) and the picker chain when the
```

Replace with:

```
// the Today screen's useDailyNote query and the picker chain when the
```

- [ ] **Step 3: Update `nav-params.ts:9` comment**

Open `apps/mobile/src/lib/nav-params.ts`. Find line 9, which currently reads:

```
 * single-day query via useTodayMoment, CalendarScreen does a 30-day query.
```

Replace with:

```
 * single-day query via /daily-note, CalendarScreen does a 30-day search.
```

- [ ] **Step 4: Type-check + verify no callers remain**

Run:

```bash
cd apps/mobile && npx tsc --noEmit
grep -rn "useTodayMoment" src/ 2>/dev/null
```

Expected: tsc clean. Grep returns nothing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/useTodayMoment.ts apps/mobile/src/lib/location-storage.ts apps/mobile/src/lib/nav-params.ts
git commit -m "chore(mobile): delete useTodayMoment.ts + clean stale doc-comments"
```

---

# Phase 5 — Maestro flows

The existing flows tap "Find a moment for…" after scrolling past the old hero. With the new hero being shorter (no CardA/B/C, no "Best windows ahead"), the scroll count likely drops. **Empirically recalibrate** — don't pre-guess.

## Task 18: Recalibrate `01-wedding-full.yaml`

**Files:**
- Modify: `apps/mobile/maestro/flows/01-wedding-full.yaml`

- [ ] **Step 1: Run the flow once against the current code**

With an emulator running and the Expo dev server up:

```bash
cd apps/mobile && maestro test maestro/flows/01-wedding-full.yaml
```

Watch for the `tapOn: "Find a moment for…"` step. Note whether it succeeded without scrolling, after one scroll, or only after two.

- [ ] **Step 2: Adjust the scroll count**

Open `apps/mobile/maestro/flows/01-wedding-full.yaml`. Find the block:

```yaml
- scroll
- scroll
- tapOn: "Find a moment for…"
```

Adjust based on Step 1's observation:
- If the tap succeeded WITHOUT any scrolls: delete both `- scroll` lines.
- If after ONE scroll: delete one `- scroll` line.
- If both scrolls were needed (unlikely given the hero shrinks): leave as-is.

- [ ] **Step 3: Run again to confirm the new count works**

```bash
cd apps/mobile && maestro test maestro/flows/01-wedding-full.yaml
```

Expected: flow completes through all 17 steps without hanging.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/maestro/flows/01-wedding-full.yaml
git commit -m "test(mobile/maestro): recalibrate 01-wedding-full scroll for new hero"
```

---

## Task 19: Recalibrate `02-travel-quick.yaml`

**Files:**
- Modify: `apps/mobile/maestro/flows/02-travel-quick.yaml`

- [ ] **Step 1: Run + adjust + verify**

Repeat the same pattern as Task 18 against `02-travel-quick.yaml`:

```bash
cd apps/mobile && maestro test maestro/flows/02-travel-quick.yaml
```

Find the equivalent `scroll; scroll; tapOn: "Find a moment for…"` block. Reduce scrolls to match the new screen height. Re-run to confirm.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/maestro/flows/02-travel-quick.yaml
git commit -m "test(mobile/maestro): recalibrate 02-travel-quick scroll for new hero"
```

---

## Task 20: Recalibrate `03-list-view-demo.yaml`

**Files:**
- Modify: `apps/mobile/maestro/flows/03-list-view-demo.yaml`

- [ ] **Step 1: Run + adjust + verify**

```bash
cd apps/mobile && maestro test maestro/flows/03-list-view-demo.yaml
```

Adjust scroll count for the new hero, re-run to confirm.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/maestro/flows/03-list-view-demo.yaml
git commit -m "test(mobile/maestro): recalibrate 03-list-view-demo scroll for new hero"
```

---

## Task 21: Create `04-daily-note-tour.yaml`

**Files:**
- Create: `apps/mobile/maestro/flows/04-daily-note-tour.yaml`

Narrow tour for the new section with StatePicker mood cycle. Load-bearing for stakeholder demo recordings — the four mood variants are the visually-strongest aspect of this feature.

- [ ] **Step 1: Create the flow file**

Create `apps/mobile/maestro/flows/04-daily-note-tour.yaml`:

```yaml
appId: host.exp.Exponent
name: "Inceptio Demo — Daily Note"
---
# clearState: false — same rationale as 01-wedding-full.yaml. Clearing
# Expo Go's state forgets the loaded project.
- launchApp:
    clearState: false

- waitForAnimationToEnd:
    timeout: 8000

# Fallback if Expo Go landed on its project list.
- runFlow:
    when:
      visible: "Recently opened"
    commands:
      - tapOn: "Inceptio"
      - waitForAnimationToEnd:
          timeout: 8000

# Skip onboarding.
- tapOn: "Find your moment"
- waitForAnimationToEnd

# Wait for the daily-note section to fully render. The StatePicker's
# "A · strong" label is the load-bearing sentinel: it appears ONLY after
# isLoading=false AND the section is mounted, and is unique to this
# screen (won't false-positive on any other UI element).
#
# Plan-time verification note (design memo §13): if Maestro's text matcher
# fails to recognize the middle-dot (U+00B7), swap the sentinel to a
# plain-ASCII alternative like "Find a moment for…".
- extendedWaitUntil:
    visible: "A · strong"
    timeout: 30000

# Hold so the recording sees the rendered hero.
- waitForAnimationToEnd:
    timeout: 4000

# Cycle StatePicker through all four mood variants for design-QA video.
- tapOn: "A · strong"
- waitForAnimationToEnd:
    timeout: 2000
- tapOn: "B · good"
- waitForAnimationToEnd:
    timeout: 2000
- tapOn: "C · mixed"
- waitForAnimationToEnd:
    timeout: 2000
- tapOn: "D · closed"
- waitForAnimationToEnd:
    timeout: 2000
```

- [ ] **Step 2: Run the flow to verify**

```bash
cd apps/mobile && maestro test maestro/flows/04-daily-note-tour.yaml
```

Expected: flow completes, all four StatePicker taps succeed.

If `extendedWaitUntil: "A · strong"` times out, the U+00B7 middle-dot isn't matching. Swap to `visible: "Find a moment for…"` (also load-bearing, appears only after data load) and re-run.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/maestro/flows/04-daily-note-tour.yaml
git commit -m "test(mobile/maestro): 04-daily-note-tour for design-QA mood cycle"
```

---

# Done

After Task 21, the mobile integration is feature-complete per the design memo's MVP scope. Run a final smoke pass:

```bash
cd apps/mobile && npx tsc --noEmit && npx vitest run
```

Expected: tsc clean, vitest all green (your new tests + existing dev-resets / location-storage / nominatim suites).

## Out of scope for this plan (do not touch)

- SavedSearch as a mobile concept — own future brainstorm
- Push notifications — own future brainstorm per voice spec §11.5
- Watch / monitoring — own future brainstorm
- Onboarding changes
- iPad / tablet layouts
- Worker-side changes (frozen until astrologer ruling)
- ActivityPickerScreen + ActivityChip emoji-to-lucide migration — separate cleanup PR before SavedSearch wire-in
- Broader format-date.ts consolidation — 5+ surfaces stay ad-hoc
- "See more in Calendar" migration hint for the "Best windows ahead" drop
- Persistent daily-note response cache — session-only TanStack Query is enough

## Plan-time verification nits (referenced in tasks above)

These are deliberate one-shot checks the implementing engineer should run during the tasks they belong to, not separate work items:

- **Task 3 (postAlertAck test):** if vitest chokes on transitive native-module imports via `src/config/api.ts`, mock `react-native` at the top of the test (`vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))`).
- **Task 21 (Maestro tour):** if `extendedWaitUntil: "A · strong"` times out, the U+00B7 isn't matching Maestro's text matcher. Swap the sentinel.
