# Mobile integration — daily-note section on Today screen (design memo)

**Status:** Brainstorm output. Feeds into a subsequent /plan-and-implement.
**Date:** 2026-05-29
**Authoritative artifacts upstream of this memo:**
- Voice/copy spec — `docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md`
- Picker contract — `docs/superpowers/design-handoff/daily-note/PICKER-CONTRACT.md`
- Design hand-off renders — `docs/superpowers/design-handoff/daily-note/{DailyNote.jsx, design-canvas.jsx, Daily Note - Today.html}`
- Worker implementation — commits up to `03b1324` on main (230 tests, route + cache + endpoints + shared-types schema)

---

## 1. Summary

The Worker side of the daily-note feature is complete. Mobile must consume the `/daily-note` and `/daily-note/alert-ack` endpoints, render the daily-note section as the new Today-screen hero, and lay the groundwork for a future SavedSearch concept without shipping it now.

**Scope decisions (signed off across the brainstorm):**

1. **No saved-search rendering in MVP.** The mobile codebase has `SavedMoment` (bookmarked specific windows), not `SavedSearch` (active monitored searches). The picker contract's lifecycle states (`pre-window / new-window / in-window / passed / none-yet`) require the latter. The Worker returns `saved_searches: []` already; mobile mirrors this. SavedSearch is its own future feature with its own brainstorm.
2. **Replace TodayScreen's three-card hero with the daily-note section.** `CardA/B/C` + `useTodayMoment` were the prototype daily-note logic; they retire when the Worker-side production logic ships. Daily-note section becomes the new above-the-fold hero.
3. **Drop "Best windows ahead" from Today.** Daily-note is the sole hero. Forward-window browsing lives on Calendar (one tap away).
4. **Build saved-search status components as scaffold-only.** Files exist with locked prop signatures, README documents the wait-state, no integration in the active render path.
5. **Build `postAlertAck()` as minimal API surface with a smoke test.** No hook, no caller. The function is contract surface, not dead logic.

---

## 2. Foundational findings (call out for the plan)

### Finding A — Mobile has SavedMoments, not SavedSearches

`apps/mobile/src/lib/draft-store.ts` defines `SavedMoment`: a bookmarked specific window with frozen `start`/`end` timestamps. The picker contract's `saved_searches` array describes active searches being re-evaluated over time, with lifecycle transitions (`new-window`, `none-yet`). Different abstractions.

**Three paths were considered:**
1. Skip saved-search rendering for MVP — daily-note standalone, scaffold built but not wired. *(Chosen.)*
2. Synthesize a degraded saved-search status from SavedMoments — rejected. Half-working lifecycle (no `new-window` / `none-yet`) would read as broken, not as honestly scoped. The eventual SavedSearch feature would face migration confusion.
3. Introduce SavedSearch as a new mobile concept now — rejected. Scope explosion the size of the Worker work itself. Belongs in its own brainstorm AFTER daily-note ships.

### Finding B — TodayScreen already has a daily-note-equivalent hero

`apps/mobile/src/screens/TodayScreen.js` currently renders `MoonRiseHeader` + `StatePicker` + three conditional cards (`CardA viable / CardB caution / CardC blocked`) via `useTodayMoment` (single-day electional search). This IS prototype daily-note logic — score, headline, mood-bucketed cards.

The new daily-note is the production version of the same surface. Two heroes can't coexist; the prototype retires.

---

## 3. Layer 1 — Fetching + data layer

### Files to create

- `src/lib/api.ts` — extend with `getDailyNote()` and `postAlertAck()` alongside existing `searchElectional()`
- `src/hooks/useDailyNote.ts` — new hook mirroring the *shape* of `useElectionalSearch.ts` (queryKey + queryFn + enabled). **Diverges on cache policy:** overrides the global `query-client.ts` defaults (`staleTime: 6 days`, `gcTime: 7 days`) with `staleTime: Infinity` + `gcTime: 24h` for the daily-note's day-bounded utility. `useElectionalSearch` does NOT override the defaults — different cache regime, by design.
- `src/lib/format-date.ts` — `formatDailyEyebrow(dateIso: string)` extracted from existing `todayLabel()`. **Narrow scope:** only the daily-note eyebrow case. Five other surfaces (`DatePickerScreen`, `YourMomentsScreen`, `MomentDetailScreen`, `CalendarScreen`, current `TodayScreen`) format dates ad-hoc with their own `Intl.DateTimeFormat` calls — broader DRY consolidation is deferred to a separate cleanup, out of scope for this plan.

### Request shape

```
GET /daily-note?lat={n}&lng={n}&tz={iana}
```

No body. Worker derives `today_iso_date` server-side. Mobile sends lat/lng/tz only.

**Source of location + tz:** `getLastLocation() ?? FALLBACK_LOCATION` — same pattern as existing `useTodayMoment`. Last-known saved location wins; Kyiv fallback when none.

### Hard-decision #3 (TZ for today_iso_date) — RESOLVED

Use the **saved location's tz**, not device tz. The daily-note describes the sky at the user's planning frame (the location they saved for searches), not their current physical presence. Falls back to device tz only if no saved location exists (first launch before any search).

### TanStack Query setup

```ts
useQuery({
  queryKey: ['daily-note', round2(lat), round2(lng), tz, todayIsoDate],
  queryFn: () => getDailyNote({ lat, lng, tz }),
  staleTime: Infinity,                  // queryKey embeds date → auto-rollover at midnight
  gcTime: 1000 * 60 * 60 * 24,          // 24h memory
  enabled: !!location,
});
```

- **Why `staleTime: Infinity`:** queryKey includes `todayIsoDate`. Day rollover → new key → auto-fetch. No spontaneous refetches within a day.
- **Why round lat/lng to 2 decimals:** matches Worker cache key granularity (~1.1 km). Otherwise GPS jitter generates distinct mobile-side keys for the same Worker cache entry.

### Refetch policy

| Trigger | Behavior |
|---|---|
| Screen mount | React Query auto-handles. No refetch within same day. Fresh fetch on day rollover. |
| Pull-to-refresh | `query.refetch()` |
| Saved-searches change | N/A in MVP |
| Location change (new search committed) | Different lat/lng/tz → new queryKey → auto-fetch |
| App foreground | Default off (matches existing `query-client.ts` policy) |

### Hard-decision #2 (cache strategy) — RESOLVED

**Session-only TanStack Query for the response. AsyncStorage holds only the library_version marker.**

Persisting the daily-note response across cold launches would only smooth a <1s skeleton flash (Worker KV serves cold opens cheaply) at the cost of a real rollover-race surface (persisted-vs-fresh divergence). Not worth it for a day-bounded artifact.

### Hard-decision #4 (library-version invalidation) — RESOLVED

**Silent invalidation on every fetch via `queryClient.invalidateQueries`. No UI surface.**

```ts
const lastSeen = storage.getString('inceptio.daily_note_library_version');
if (lastSeen !== response.library_version) {
  storage.set('inceptio.daily_note_library_version', response.library_version);
  queryClient.invalidateQueries({ queryKey: ['daily-note'] });
}
```

Rationale: a "copy updated" flash would itself be a horoscope-style reaction. Astrology changes quietly. The post-astrologer-ruling roll-over happens silently — copy changes on the next refetch boundary (typically next day or pull-to-refresh).

### Error handling

Reuse existing `lib/api.ts` discriminated hierarchy: `ApiError`, `NetworkError`, `TimeoutError`, `RateLimitError`, `UpstreamQuotaError`, `SchemaMismatchError`, `ServerError`. Worker responses map cleanly:

| Worker | Mobile error |
|---|---|
| 400 `bad_request` | `ServerError(400, ...)` |
| 429 `rate_limited` | `RateLimitError` (shares the per-device counter — `/daily-note` internally fans out to `/electional/search`) |
| 429 upstream quota | `UpstreamQuotaError` |
| 502 `no_top_window` / `upstream_failure` | `ServerError(502, ...)` |
| Zod parse failure | `SchemaMismatchError` |

### Known edge case (flagged, not solved in MVP)

**App open across midnight.** The `staleTime: Infinity` + date-keyed queryKey pattern auto-rolls *if* a render or focus event triggers re-computation of `todayIsoDate`. A user who opens the app at 23:55 and leaves it foregrounded through midnight will see yesterday's daily-note until next screen interaction. Acceptable for MVP. Future polish options: timer set for next local midnight, or AppState `'active'` listener that re-computes the date. Don't engineer now.

---

## 4. Layer 2 — Daily-note rendering

### Component file structure

New subfolder: `src/components/daily-note/`.

**Repo-convention note.** `src/components/` is currently 17 flat files; this plan introduces a subfolder. The divergence is deliberate, three stacked reasons:

1. **Mental-model parity with the Worker.** Worker has `workers/api-proxy/src/translations/daily-notes/`. Mobile mirroring with `src/components/daily-note/` means "the daily-note feature lives in a daily-note directory" on both sides — navigation is faster.
2. **File count.** This feature adds 7-8 active component files + scaffold/. Flat-with-prefix would push `src/components/` to ~25 files with 8 of them semantically clustered. Readability regression, not improvement.
3. **The `scaffold/` subfolder is already a justified divergence.** The implicit rule isn't "no subfolders" — it's "subfolders need a rationale." Feature-grouping for what's currently the largest component family in the codebase is at least as valid a rationale as "deliberate parking lot."

The decision is structural (feature is growing into a cluster), not stylistic. Sidesteps the existing `StatusLine.js` (score+grade pill) name collision as a bonus.

```
src/components/daily-note/
  DailyNoteSection.js    — screen-level section composing Hero + Body
                           (EmptyInvite removed 2026-06-04 — see §8)
  DailyHero.js           — radial gradient + starfield + moon-with-halo (default export)
                           plus named exports LoadingHero + ErrorHero — same backdrop
                           shape, different middle content (centered Pulse + text /
                           friendlyMessage + retry pressable). Same file so the three
                           variants share the gradient + starfield primitives.
  DailyNoteBody.js       — mood dot + date eyebrow + headline + supporting
  EmptyInvite.js         — REMOVED 2026-06-04 (was: "Choose a moment of your own →" chip card; see §8 reversal)
  mood-tokens.js         — MOOD palette (dot color, halo color, dim flag)
  scaffold/              — built-but-not-wired components for future SavedSearch
    SavedRow.js
    InWindowCard.js
    NewWindowCard.js
    StatusStack.js
    activity-display.js
    README.md            — wait-state contract
```

### Mood-via-moon-halo source

`Moon.js` already implements 8 phases as SVG with a `glow` prop. **Wrap externally** in `DailyHero.js` — `<View>` with `shadowColor` / `shadowOpacity` / `shadowRadius` driven by the mood's halo, `<Moon ... glow={false} />` so the default gold halo doesn't double-draw. **Zero changes to `Moon.js`** — its other callers (`MoonRiseHeader` on Today/Calendar/You) are unaffected.

### Mood tokens (no new theme.js additions)

All four mood colors already exist in `src/theme.js`:

| Mood | Dot | theme token | Halo (rgba) | Dim |
|---|---|---|---|---|
| strong | `#E5C77D` | `colors.gold` | `rgba(240,216,154,0.55)` | no |
| good | `#A98DFF` | `colors.primaryGlow` | `rgba(169,141,255,0.45)` | no |
| mixed | `#D4B872` | `colors.goldMuted` | `rgba(212,184,114,0.30)` | no |
| closed | `#7A7195` | `colors.textSubtle` | `null` (no halo) | **yes** (opacity 0.55) |

```js
// src/components/daily-note/mood-tokens.js
import { colors } from '../../theme';
export const MOOD_TOKENS = {
  strong: { dot: colors.gold,        halo: 'rgba(240,216,154,0.55)', dim: false },
  good:   { dot: colors.primaryGlow, halo: 'rgba(169,141,255,0.45)', dim: false },
  mixed:  { dot: colors.goldMuted,   halo: 'rgba(212,184,114,0.30)', dim: false },
  closed: { dot: colors.textSubtle,  halo: null,                     dim: true },
};
```

**No `phase` field.** The mockup's phase-per-mood defaults are removed in production code — strictly use the API's `moon_phase`. The mood determines color/halo only, never overrides the actual lunar cycle. The absent field is a structural guarantee that mood and moon_phase don't conflate semantically.

### Hero composition specs

| Element | Font (theme.js token) | Size / line-height | Color | Max width |
|---|---|---|---|---|
| Date eyebrow | `font-ui-med` (Inter 500) | 13 / — | `colors.textMuted`, letter-spacing 0.4px, lowercase | — |
| Mood dot | — | 6×6 circle + shadow `0 0 8px {halo}` (none for closed) | `MOOD_TOKENS[mood].dot` | — |
| Headline | `font-display` (Fraunces 500) | 32 / 38, tracking -0.02em | `colors.text` | 300 |
| Supporting | `font-ui` (Inter 400) | 15 / 22 | `colors.textMuted`, margin-top 12 | 318 |

**Wrap behavior at hard maxima:**
- 48-char headline at Fraunces 32px / 300px ≈ 14-16 chars/line → 3-4 lines. Acceptable above-the-fold.
- 140-char supporting at Inter 15px / 318px ≈ 32 chars/line → ~4-5 lines. Acceptable.

Awkward wraps are copy-side fixes in `workers/api-proxy/src/translations/dictionary/daily-notes.ts`, not layout fixes. Worker lint enforces the maxes.

### Date eyebrow extraction

Lift `todayLabel()` from `TodayScreen.js` into `src/lib/format-date.ts`:

```ts
export function formatDailyEyebrow(dateIso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).format(new Date(dateIso)).toLowerCase();
}
```

**Source of `dateIso`:** the daily-note response's `daily_note.date` field (Worker-emitted ISO YYYY-MM-DD in event tz per PICKER-CONTRACT §2). `DailyNoteBody` reads it from props.

**Scope:** narrow extraction only. Five other surfaces already format dates ad-hoc with `Intl.DateTimeFormat`; broader DRY consolidation is deferred (see §3 file list note).

### Known platform note (flagged, not solved in MVP)

**iOS-leaning halo treatment.** `shadowColor` + `shadowOpacity` paint a colored halo on iOS. Android's `elevation` renders a default material grey drop-shadow, not a colored halo — so on Android the moon has a generic elevation shadow, NOT the violet/gold mood halo iOS gets. Acceptable for MVP (halo is decorative, not functional, and `Moon.js` itself has the same iOS-leaning shadow handling for its existing `glow` prop). Future polish options: `react-native-shadow-2`, SVG-based halo with blur filter. Don't engineer now.

---

## 5. Layer 3 — Saved-search status rendering (scaffold-only)

Path 1 scope: component scaffold without integration. No code in `DailyNoteSection`'s active render path references these files.

### Files

```
src/components/daily-note/scaffold/
  README.md
  SavedRow.js
  InWindowCard.js
  NewWindowCard.js
  StatusStack.js
  activity-display.js
```

### Prop signatures (locked at scaffold time)

| Component | Props |
|---|---|
| `SavedRow` | `{ activity, text, last, onPress }` |
| `InWindowCard` | `{ activity, text, sub, onPress }` |
| `NewWindowCard` | `{ activity, text, alertId, onPress, onAck }` |
| `StatusStack` | `{ rows, moreCount, onMore, onRow }` |
| `ActivityPlate` | `{ activity, size }` (defaults 32px) |

**`NewWindowCard.onAck` is a generic `() => void` callback.** The future wire-in passes `() => postAlertAck(alertId)` at the use site — NewWindowCard stays ignorant of network concerns.

### activity-display.js — single source of truth for Activity → display

```js
// Activity nouns sourced from voice spec §6.3 STATUS_PRE_WINDOW template.
// MUST match the Worker dictionary verbatim — drift breaks the contract.
// Worker side: workers/api-proxy/src/translations/dictionary/status-lines.ts ACTIVITY_NOUNS.
//
// Drift-prevention: the enum is enumerated against the locked voice library,
// not hand-rolled per-call. A scaffold-time mistake like `business_launch →
// 'business'` (which would drop the voice-locked noun "Launch") is structurally
// impossible because the value is sourced from this table, not invented at
// call sites.
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
```

### README.md (the wait-state contract — verbatim)

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

### State → component mapping (for future wire-in)

| `state` (from `SavedSearchStatusOutput`) | Component | Visual tier |
|---|---|---|
| `in-window` | `InWindowCard` | emphasized warm |
| `new-window` && !`acknowledged` | `NewWindowCard` | emphasized bright |
| `pre-window` | `SavedRow` | quiet |
| `none-yet` | `SavedRow` (with `searched_through` precision per dictionary rule) | quiet |
| `passed` | `SavedRow` (~70% opacity per spec §6.3.4) | quiet |

### Known platform note (flagged, not solved in MVP)

**Emoji rendering varies across iOS (Apple Color Emoji) and Android (Noto).** 💍 / 📋 / 🚀 / ✈️ render acceptably on current OS targets, but the production wire-in MUST swap to lucide icons per the README — no surprise refactor required, the contract is documented.

### No tests in MVP

Scaffold isn't rendered. Tests land with the wire-in feature.

---

## 6. Layer 4 — Alert-ack mechanics (minimal API surface)

### What ships

A single function in `src/lib/api.ts`, ~15 LOC, plus a vitest smoke test.

```ts
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

### Smoke test (~20 LOC)

```ts
// src/lib/__tests__/post-alert-ack.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { postAlertAck, ServerError } from '../api';

describe('postAlertAck', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('POSTs { device_id, alert_id } to /daily-note/alert-ack', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    await postAlertAck('alert-test-1');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/daily-note/alert-ack'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.stringContaining('alert-test-1'),
      }),
    );
  });

  it('throws ServerError on 4xx/5xx', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 })) as any;
    await expect(postAlertAck('a')).rejects.toBeInstanceOf(ServerError);
  });

  it('resolves void on 200', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 })) as any;
    await expect(postAlertAck('a')).resolves.toBeUndefined();
  });
});
```

### Why a smoke test for an unwired function

`postAlertAck` is **API surface contract**, not dead logic. Without a test, someone can quietly rename `alert_id` → `alertId`, swap `getDeviceId()` for tz handling, or drop the `Content-Type` header during a refactor pass — and nobody finds out until SavedSearch wire-in months later, when the bug is buried under unrelated PRs. The smoke test is cheap insurance against the exact failure mode unwired scaffolding is vulnerable to (silent drift), and vitest runs the whole suite per patch — the test is just always in the green band.

### Hard-decision #5 (alert-ack timing) — DEFERRED with future-recommendation pinned

Moot for MVP (no `NewWindowCard` renders). Pinned for the future implementer so the decision doesn't get relitigated:

> When NewWindowCard wires in: **ack on user interaction** (tap card to navigate OR tap to dismiss). NOT on render. NOT on viewport visibility.
> - Render-ack treats scroll-past as a dismissal — wrong.
> - Viewport-ack adds intersection-observer complexity that doesn't pay off for an alert that appears once per saved-search lifecycle.
> - Interaction-ack matches "the user actually engaged" semantics.

### What's NOT shipping in MVP

- `useAlertAck` hook (no caller)
- Retry policy (KV.put is idempotent → safe to retry on transient failure when caller exists)
- Optimistic dismiss UI (no NewWindowCard render)
- Multi-device coordination (Worker state is source of truth; mobile reads from `response.saved_searches[*].acknowledged`)

---

## 7. Layer 5 — Today screen integration

### Hard-decision #6 (Today screen restructuring) — RESOLVED

**Replace** the `CardA/B/C` hero with the daily-note section. **Drop** "Best windows ahead". **Keep** StatePicker (rewired to mood values) and PrimaryButton.

### What's deleted

| Item | Notes |
|---|---|
| `src/hooks/useTodayMoment.ts` | Sole caller was TodayScreen; delete the file. **Also update the two stale doc-comment mentions** at `src/lib/location-storage.ts:4` and `src/lib/nav-params.ts:9` so prose references don't reference a deleted module. |
| `deriveState()` in TodayScreen | No longer needed (mood comes from API) |
| `todayLabel()` in TodayScreen | Lifted to `src/lib/format-date.ts` as `formatDailyEyebrow()` |
| `CardA`, `CardB`, `CardC`, `CardShell`, `CTAInline` (in TodayScreen) | ~100 LOC of prototype hero |
| `useTodayMoment` import + state | Replaced by `useDailyNote` |
| `MoonRiseHeader`, `ScorePill`, `Starfield`, `Glyph`, `reasonToGlyph` imports | Unused after card removal |

### What's added

| Item | From |
|---|---|
| `useDailyNote` import + state | Layer 1 |
| `DailyNoteSection` import + render | Layer 2 |
| `formatDailyEyebrow` import (used inside DailyNoteSection) | Layer 2 |

### What stays untouched

| Item | Why |
|---|---|
| `ScrollView` wrapper + `paddingBottom: 120` | Existing layout container |
| `bg-base` background class | Existing theme |
| Loading shape (`<Pulse />` + "Looking at the sky for you...") | Refactored to use `useDailyNote.isLoading` (and to render inside the DailyHero zone — see Layer 6) |
| Error shape (`friendlyMessage(error)` + retry pressable) | Refactored to use `useDailyNote.isError` |
| `PrimaryButton` "Find a moment for…" at the bottom | Persistent search-entry CTA, same destination |
| `StatePicker` component file | Generic, just gets a different `options` array |

### StatePicker rewiring

Same component, mood options:

```js
<StatePicker
  value={moodOverride ?? data.daily_note.mood}
  onChange={setMoodOverride}
  options={[
    ['strong', 'A · strong'],
    ['good',   'B · good'],
    ['mixed',  'C · mixed'],
    ['closed', 'D · closed'],
  ]}
/>
```

**`A · / B · / C · / D ·` letter prefixes are deliberate dev-tool affordances, not user-facing copy.** The voice spec's §2 boundary tests and §6 voice rules govern user-facing copy on the daily-note surface — they do NOT govern QA tooling. Don't "fix" the letter prefixes in a future voice-cleanup pass; they're load-bearing in the Maestro `04-daily-note-tour.yaml` sentinel and in design-QA mood demonstration.

### "Best windows ahead" drop — reasoning consolidated

Three stacked reasons:

1. **Budget.** Two upstream calls per cold day (`useTodayMoment` with user's activity AND `useDailyNote` with internal `business_launch` activity) burns the 10/30-day per-device ceiling in ~5 days instead of ~10. Real constraint.
2. **The label was already misleading.** "Best windows ahead" is intraday, not forward. Keeping it required a reframe that would introduce a *different* bug (activity-agnostic list without context).
3. **Info density vs ritual.** Daily-note hero ("A gentle day for beginnings") + intraday slots list ("10:00–12:00 · Best at 11:32") are two restatements of the same idea. Information-dense but corrosive to the daily-ritual purpose. Daily-note should be the singular emotional anchor. A list beneath it works only when structurally complementary (saved-search lifecycle states — our future SavedSearch feature) — not when it repeats the same idea in tabular form.

Calendar is the right home for intraday browsing — separation by intent: ritual on Today, browsing on Calendar.

### Known behavior change (flagged, not solved in MVP)

**Existing users who scroll Today to find today's intraday slots will need to learn Calendar.** Real behavior change. The simple "Calendar tab is one tap away" framing understates it though: Calendar shows the user's *currently-selected activity's* heatmap, not an undirected intraday list across activities — it's not a 1:1 substitute. A user who today scrolls Today to find "wedding windows for today" gets that directly; with the drop, they need to (a) ensure their last-selected activity is the one they want, (b) navigate to Calendar, (c) zoom into today's cell, (d) tap through. Real cognitive-load shift, more than a tap.

For MVP, accept the trade-off. **Don't ship a migration hint or "see more in Calendar" link in MVP.** That's polish for later if user feedback shows discoverability is a real problem. Flag it so a future post-launch review reads it as a known *bigger-than-it-looks* trade-off, not a regression.

### `savedMomentsCount` sync sanity

`draft-store.ts:129` exports `getSavedMoments()` as a synchronous function (reads from the in-memory `storage` cache, hydrated at app boot via `hydrateStorage()`). Screen render path is sync-safe — no `useEffect` / async dance needed for the count check.

### Sketch — new TodayScreen.js shape (not locked code)

```js
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useDailyNote } from '../hooks/useDailyNote';
import DailyNoteSection from '../components/daily-note/DailyNoteSection';
import StatePicker from '../components/StatePicker';
import PrimaryButton from '../components/PrimaryButton';
import { getSavedMoments } from '../lib/draft-store';
import { LoadingHero, ErrorHero } from '../components/daily-note/DailyHero';

export default function TodayScreen({ go }) {
  const { data, isLoading, isError, error, refetch } = useDailyNote();
  const [moodOverride, setMoodOverride] = useState(null);

  if (isLoading) return <LoadingHero />;
  if (isError) return <ErrorHero error={error} onRetry={refetch} />;

  const dailyNote = data.daily_note;
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

Target: ~40 LOC (down from ~320).

---

## 8. Layer 6 — Edge cases & polish

### EmptyInvite + PrimaryButton coexistence

**DECISION REVERSED 2026-06-04: EmptyInvite removed. Only the persistent PrimaryButton "Find a moment for…" remains.** The original "Both stay" ruling and the counter-rationale that overturned it are both recorded below so the reversal is auditable.

**Original ruling (superseded) — "Both stay":** the two CTAs served distinct roles — EmptyInvite as a warm zero-saved-moments on-ramp chip rendered below the hero (gated `getSavedMoments().length === 0`), and PrimaryButton as the always-present persistent action at the bottom. The stated worry was that *hiding the PrimaryButton* on the empty state would strand a new user who looks at the invite, decides to "look around first," returns, and can't find how to start. **Both pointed at the same destination (`go('picker')`).**

**Counter-rationale (why it was reversed):** the original worry was specifically about removing the *PrimaryButton*, not the *invite*. Two same-destination CTAs stacked on the zero-saved-moments **first impression** read as redundant — a duplicated call to the identical flow. The persistent PrimaryButton already *is* the new-user fallback, so removing the invite does **not** reintroduce the strand-a-new-user risk the original ruling guarded against: the user still has an always-present, obvious entry point. The invite's separate "choose your own" framing also implied a distinct destination it never had (it routed to the same window-search picker), so removing it eliminates a false affordance rather than a real capability.

**Net:** remove the EmptyInvite render + its `getSavedMoments().length === 0` gating + dead plumbing (`onInvitePress`, `savedMomentsCount`, the `EmptyInvite.js` component). PrimaryButton unchanged. Empty-state new-user flow is unaffected — PrimaryButton covers it.

**SavedSearch note (the old gating-rationale caveat, now retired).** The prior version of this section carried a `// TODO(SavedSearch): EmptyInvite gating evolution` — it asked a future SavedSearch wire-in to decide whether EmptyInvite's trigger should evolve from `getSavedMoments().length` to `saved_searches.length`. **That TODO is retired: there is no longer an EmptyInvite to gate.** If SavedSearch later wants a zero-state invite affordance, that is a fresh design decision to make in the SavedSearch brainstorm — not a revival of this removed component by default.

### Loading state

Extend the existing `<Pulse />` + `"Looking at the sky for you…"` pattern INTO the DailyHero zone. Specifically:

- `LoadingHero` component renders `HeroGradient` + `Starfield` (no moon, no headline content) + centered `<Pulse />` + text.
- The load→loaded transition is just the moon appearing + headline materializing on top of the same backdrop. No screen swap.

**Ellipsis form — canonicalize on U+2026.** The codebase currently has three call-sites with inconsistent forms: existing `TodayScreen.js` uses `"..."` (three ASCII dots), `LoadingScreen.js:19` uses `"…"` (U+2026), `CLAUDE.md:70` uses `"..."`. **Use `"Looking at the sky for you…"` (U+2026) for the new code.** Matches `LoadingScreen.js` (more idiomatic), single character vs three. Updating the other call-sites is out of scope for this plan (separate codebase-hygiene pass).

**Why not pixel-perfect skeleton bones:** ~3-5 hours of work, zero functional value, mostly cosmetic. Pulse + Starfield reuse is good-enough for MVP. Revisit if user feedback shows loading feels janky.

### Error state

Reuse existing pattern: `friendlyMessage(error)` + retry pressable. No daily-note-specific error differentiation. The error UX is identical to what TodayScreen currently does — only the trigger source changes (from `useTodayMoment.isError` to `useDailyNote.isError`).

### Edge cases already covered in other layers (don't re-engineer)

- App open across midnight → Layer 1 (accept for MVP)
- Library-version mismatch UI → Layer 1 (silent invalidation, no UI)
- iOS/Android halo platform difference → Layer 2 (decorative, accept)
- Activity emoji platform variance → Layer 3 (placeholder anyway)
- Saved-search alert race conditions → Layer 4 (moot, no rendering)
- Multi-device coordination → Layer 4 (moot, no rendering)

---

## 9. Layer 7 — Maestro flow updates

### Existing flows — keep all three, recalibrate scrolls

| Flow | Action |
|---|---|
| `01-wedding-full.yaml` | Recalibrate scroll count empirically after implementation. Likely **1 scroll** (or **0**) since hero zone shrinks without `CardA/B/C` |
| `02-travel-quick.yaml` | Same |
| `03-list-view-demo.yaml` | Same |

**Plan-time approach:** after implementation, run each flow once. If `Find a moment for…` is visible without scrolling, drop both `scroll` lines. If one scroll suffices, drop one. Don't pre-guess — adjust empirically with one Maestro run per flow.

### New flow

**Add `04-daily-note-tour.yaml`.** Narrow tour for the new section with StatePicker mood cycle for design QA / demo recording.

```yaml
appId: host.exp.Exponent
name: "Inceptio Demo — Daily Note"
---
- launchApp: { clearState: false }
- waitForAnimationToEnd: { timeout: 8000 }

# Fallback if Expo Go landed on its project list.
- runFlow:
    when: { visible: "Recently opened" }
    commands:
      - tapOn: "Inceptio"
      - waitForAnimationToEnd: { timeout: 8000 }

# Skip onboarding.
- tapOn: "Find your moment"
- waitForAnimationToEnd

# Wait for daily-note section to fully render. The StatePicker's
# "A · strong" label is the load-bearing sentinel — it appears only
# AFTER isLoading=false AND the section is mounted, and is unique to
# this screen (won't false-positive on any other UI element).
- extendedWaitUntil:
    visible: "A · strong"
    timeout: 30000  # cold-cache /daily-note can take longer

# Hold for the recording.
- waitForAnimationToEnd: { timeout: 4000 }

# Cycle StatePicker through all four mood variants for design QA video.
- tapOn: "A · strong"
- waitForAnimationToEnd: { timeout: 2000 }
- tapOn: "B · good"
- waitForAnimationToEnd: { timeout: 2000 }
- tapOn: "C · mixed"
- waitForAnimationToEnd: { timeout: 2000 }
- tapOn: "D · closed"
- waitForAnimationToEnd: { timeout: 2000 }
```

**Why ship this now (not defer):** load-bearing for stakeholder demo recordings. The daily-note feature's visually-strongest aspect is the 4 mood variants. Without this flow, demo recordings have to be done manually with potential mistakes. Cheap (~15 min at implementation time).

**Sentinel choice rationale:** `"A · strong"` is the StatePicker label, guaranteed-present only when the daily-note section is fully rendered, unique to this screen, and right next to the mood cycle the flow performs. Beats a generic `"·"` (would match arbitrary separators in other UI elements and risk Maestro latching onto the wrong one).

---

## 10. Consolidated hard-decisions table

The original brief's six hard decisions, mapped to outcomes:

| # | Decision | Outcome |
|---|---|---|
| 1 | State management library | **TanStack Query** (already in use; v5.100.14). Matches `useElectionalSearch` pattern. Don't add new dependency. |
| 2 | Cache strategy | **Session-only TanStack Query for response. AsyncStorage only for `library_version` marker.** |
| 3 | TZ for `today_iso_date` | **Saved location's tz**, fallback to device tz if no location ever saved. |
| 4 | Library version invalidation | **Silent on-every-fetch comparison + `queryClient.invalidateQueries`**. No UI surface. |
| 5 | Alert-ack timing | **Moot in MVP** (no NewWindowCard renders). **Future-recommendation pinned: on user interaction** (tap to navigate or dismiss). |
| 6 | Today screen restructuring | **Replace CardA/B/C with daily-note section. Drop "Best windows ahead". Keep StatePicker (rewired) and PrimaryButton. Retire `useTodayMoment`.** |

---

## 11. Known issues / behavior changes (flagged, accepted for MVP)

For the implementation plan and post-launch review — these are *flagged trade-offs*, not regressions, not bugs.

1. **App open across midnight** — daily-note serves yesterday's content until next render/focus. Layer 1. Future polish: midnight timer or AppState listener.
2. **iOS vs Android halo treatment** — colored halo on iOS, grey elevation on Android. Layer 2. Acceptable; decorative. Future polish: SVG halo or `react-native-shadow-2`.
3. **Activity emoji in scaffold** — scaffold-only placeholder. MUST swap to lucide icons (Heart / FileText / Rocket / Plane) before wire-in. Locked in scaffold README. Layer 3.
4. **rgba literals in activity-display.js** — scaffold-only. MUST promote to theme.js semantic tokens (`colors.activityWeddingTint` etc.) before wire-in. Locked in scaffold README. Layer 3.
5. **"Best windows ahead" removal is a *bigger-than-it-looks* behavior change** — existing users who scrolled Today to find intraday slots will need to learn Calendar. Calendar shows the user's currently-selected activity's heatmap, NOT an undirected intraday list — so it's not a 1:1 substitute. Multi-step migration: ensure correct activity selected → navigate to Calendar → today's cell → tap through. Don't ship a migration hint in MVP. Future polish only if user feedback shows discoverability is a real problem. Layer 5.
6. **No persisted daily-note cache** — cold launch shows ~1s skeleton (Worker KV serves the cache hit). Acceptable. Layer 1.
7. **No skeleton-bone loading state** — Pulse + Starfield reuse is good-enough for MVP. Future polish if loading feels janky. Layer 6.

---

## 12. Files — concrete create / modify / delete

### Create

```
src/hooks/useDailyNote.ts
src/components/daily-note/DailyNoteSection.js
src/components/daily-note/DailyHero.js
src/components/daily-note/DailyNoteBody.js
src/components/daily-note/EmptyInvite.js
src/components/daily-note/mood-tokens.js
src/components/daily-note/scaffold/README.md
src/components/daily-note/scaffold/SavedRow.js
src/components/daily-note/scaffold/InWindowCard.js
src/components/daily-note/scaffold/NewWindowCard.js
src/components/daily-note/scaffold/StatusStack.js
src/components/daily-note/scaffold/activity-display.js
src/lib/format-date.ts
src/lib/__tests__/post-alert-ack.test.ts
maestro/flows/04-daily-note-tour.yaml
```

### Modify

```
src/lib/api.ts          — add getDailyNote(), postAlertAck()
src/screens/TodayScreen.js — replace hero (~280 LOC delete, ~40 LOC final)
maestro/flows/01-wedding-full.yaml — recalibrate scroll count empirically
maestro/flows/02-travel-quick.yaml — recalibrate scroll count empirically
maestro/flows/03-list-view-demo.yaml — recalibrate scroll count empirically
```

### Delete

```
src/hooks/useTodayMoment.ts  — sole caller (TodayScreen) is being refactored
```

### Untouched (DO NOT modify)

```
workers/api-proxy/**       — frozen until Task 21 (astrologer ruling) per prior agreement
src/components/Moon.js     — primitive shared with MoonRiseHeader; halo work happens at wrapper level
src/components/StatusLine.js — different concept (score+grade pill); name collision sidestepped via subfolder
src/lib/draft-store.ts     — SavedMoment shape stays as-is; saved-search is a future feature
src/lib/query-client.ts    — global TanStack Query config stays; useDailyNote overrides staleTime/gcTime per-query
src/theme.js               — no new tokens for MVP (mood colors all already exist)
```

---

## 13. Handoff to /plan-and-implement

When the plan author picks this up:

1. **Read this memo + the picker contract + the voice spec** as authoritative.
2. **Workers/api-proxy is frozen** — no Worker changes in this plan. If implementation surfaces a Worker need, surface it for a separate brainstorm before changing anything.
3. **Phase the plan by layer.** Each layer is independent enough to ship/test in isolation. Suggested order: 1 (data) → 2 (components, including DailyHero/Body/Section + EmptyInvite + LoadingHero/ErrorHero) → 3 (scaffold files + README + activity-display.js) → 4 (postAlertAck + smoke test) → 5 (TodayScreen.js refactor + delete useTodayMoment.ts + format-date.ts extraction) → 6 (loading + error wiring; already covered by Layer 5 if done together) → 7 (Maestro scroll recalibration + new flow).
4. **Empirical Maestro recalibration is a real step** — run flows after implementation, adjust scroll counts based on actual screen heights. Don't pre-guess.
5. **Smoke test for `postAlertAck` is required, not optional** — see Layer 4 rationale.
6. **Don't try to populate scaffold/ components from SavedMoment data** during implementation, even as a "quick win." See Finding A; the README warns about this.
7. **Plan-time verification nits** (from doc-validator pre-flight):
   - When `04-daily-note-tour.yaml` lands, run it once locally and confirm the U+00B7 middle-dot in `"A · strong"` matches Maestro's text matcher. If it doesn't (existing flows already warn about U+2026 encoding edge cases), swap the sentinel to a plain-ASCII alternative (e.g. `"Find a moment for…"` would also work as a load-bearing token).
   - When `post-alert-ack.test.ts` lands, confirm `src/config/api.ts` doesn't do eager native-module work at import time. If it does, mock it so the test loads cleanly in the node vitest environment.

### Out of scope for this plan

- SavedSearch as a mobile concept (own brainstorm, after daily-note ships)
- Push notifications (own brainstorm per voice spec §11.5)
- Watch / saved-search monitoring (own brainstorm)
- Onboarding changes
- iPad / tablet layouts (mobile-only for MVP)
- Worker-side changes (frozen until astrologer ruling)
- Pre-MVP polish: persisted daily-note cache, pixel-perfect skeleton, midnight-rollover timer, "see more in Calendar" migration hint, colored Android halo
