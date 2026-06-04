# Default-Location Picker Spec

**Status:** Brainstorm-reviewed (rulings 1–27); awaiting spec-reviewer + user sign-off before `/plan-and-implement`.
**Branch:** `feature/set-default-location`.
**Authoritative source docs:**
- Prior tz-fix spec: `docs/superpowers/specs/2026-06-03-location-timezone-correctness.md`
- Prior tz-fix plan: `docs/superpowers/plans/2026-06-03-location-timezone-correctness.md`
- Activity-preference spec (architectural precedent): `docs/superpowers/specs/2026-06-02-activity-preference.md`
- Project context: `CLAUDE.md`
- Active gates memory: `tz-fix-active-gates.md`

---

## 1. Goal

Let the user set a **default location** the app reads on every cold boot, so the Today screen shows daily timing for *their* place instead of silently substituting a hardcoded Kyiv fallback. The default is set in onboarding (NEW), in YouScreen Settings (NEW), or from a Today empty-state CTA (NEW). The shipped per-search flow is **unchanged** — it still treats each search as a fresh "where is the event" pick.

---

## 2. Background

### What's already shipped

- **Mobile tz-fix (Phase 1+2)** is on `feature/set-default-location`. `pickToSavedLocation` derives canonical IANA tz from coordinates via `tryTzLookup`; `migrateLocationTimezones_v1` rewrites legacy entries at boot. EC-19 (tz is load-bearing electional input via Swiss Ephemeris) is **closed by inheritance** — any location this feature writes goes through `pickToSavedLocation` and gets a correct coord-derived tz for free. There is no Worker-correction dependency for the picker.
- **Activity-preference** is the architectural precedent. `default_activity` lives in `apps/mobile/src/lib/activity-preference.ts` with an `useSyncExternalStore` hook (`useActivityPreference`), an `initActivityPreference()` init function called from `App.js` boot, and a `FirstLaunchActivityPicker` modal-interceptor at `App.js:147–160` that fires when `hydrationStatus === 'unset'`.
- **Worker tz authority** corrects mismatched timezones on receive (Phase 3 + alias-aware amendment). Independent of this feature's correctness.

### What's broken today

- `apps/mobile/src/hooks/useDailyNote.ts:9–13` defines `FALLBACK_LOCATION = { lat: 50.4501, lng: 30.5234, timezone: 'Europe/Kyiv' }`. Cold-install users with no `last_location` get a daily note computed for **Kyiv coordinates regardless of where they actually are**. This is the silent-substitution surface the picker work is targeted at.
- `useDailyNote.ts:72–80` uses `useMemo([])` (empty deps array) to capture location at first mount. When `default_location` changes mid-session (e.g., user sets it via Settings), the Today screen does NOT refresh until app restart. The lockup ships today.

### What this spec ships

Surface 1 (Today reads the default) + onboarding entry + Settings row + Today empty-state CTA — **one cohesive feature, not three rungs**.

---

## 3. Scope

### In

- **NEW preference store** `apps/mobile/src/lib/location-preference.ts` (standalone, mirrors `activity-preference.ts` shape exactly). Owns `inceptio.default_location` + `inceptio.onboarding_location_step_v1`.
- **NEW composition hook** `apps/mobile/src/hooks/useEffectiveLocation.ts`. Returns `default ?? lastSeed ?? null` with `lastSeed` mount-frozen via lazy `useState` init.
- **NEW onboarding interceptor** `apps/mobile/src/screens/SetDefaultLocationScreen.js` (generalized — used by 3 entry points). Renders the existing `LocationPickerScreen` as a child with `embedded=true`.
- **NEW empty-state component** `apps/mobile/src/components/daily-note/EmptyStateHero.js`. Today renders this when location is null after hydration completes.
- **EDIT** `apps/mobile/src/screens/LocationPickerScreen.js` — add `onConfirm(location)` and `embedded?:boolean` props. Per-search caller passes `onConfirm={() => go('loading')}` and omits `embedded` — byte-identical behavior including Back/Close. **No `initialLocation` prop. No `onBack`/`onClose` props.**
- **EDIT** `apps/mobile/src/hooks/useDailyNote.ts` + `apps/mobile/src/hooks/useDailyNote.helpers.ts` — remove `FALLBACK_LOCATION` constant, remove empty-deps `useMemo`, read via `useEffectiveLocation`, extend `__computeEnabled` to gate on `effectiveLocation !== null` plus `locationHydrationStatus === 'set'`.
- **EDIT** `apps/mobile/src/screens/TodayScreen.js` — empty-state guard at the top of the guard order (BEFORE isLoading/isError checks); empty-state CTA opens SetDefaultLocationScreen directly.
- **EDIT** `apps/mobile/App.js` — add second interceptor block for the location step (parallel to the activity one); register `set-default-location` screen; call `initLocationPreference()` from boot effect AFTER `initActivityPreference()`.
- **EDIT** `apps/mobile/src/screens/YouScreen.js` — new "Default location" Settings row, mirrors the activity Row.
- **Tests** — unit + integration + Maestro `05-onboarding-location-step.yaml`.

### Out of scope (deferred)

- **Per-search prefill (Surface 2)** — DROPPED per ruling 20. The line-47 `LocationPickerScreen.js` comment ("Selection is intentionally NOT restored") + the "location of the event, not where you are" framing show per-search was deliberately kept fresh. With Today reading the default (Surface 1) + the onboarding seed carrying the default's value forward, prefill's marginal benefit is outweighed by wrong-location risk + framing conflict.
- Multiple default locations / favorite cities.
- Auto-detection from device GPS as a silent default.
- Cross-device sync (device-only identity per CLAUDE.md MVP).
- Skip-vs-completed behavioral distinction in MVP (no re-prompting skippers) — flag is tri-state but interceptor logic is binary.
- Cache eviction or migration of any pre-existing data — there is no pre-existing default_location data because the key is new.

### Out-of-scope guard

Implementer MUST NOT silently expand into: per-search caller edits **beyond the single `onConfirm={() => go('loading')}` addition mandated by D30**, `initialLocation` / `defaultValue` / `onBack` / `onClose` props on LocationPickerScreen, multi-default UI, GPS-auto-default, or behavioral skip-vs-completed split.

The per-search caller (the existing site rendering `<LocationPickerScreen go={go}/>`) gets EXACTLY ONE line added: `onConfirm={() => go('loading')}`. Anything more — refactoring the draft-store wiring, adding state for a prefill, threading new params through the per-search flow — is out of scope. D30 in §11 pins this; this guard sentence reinforces it for the implementer's quick-scan.

---

## 4. Architecture

### 4.1 Parallel interceptor (mirrors FirstLaunchActivityPicker)

`App.js` currently intercepts cold-install users with no activity preference at line 147:

```js
if (hydrationStatus === 'unset' && screen !== 'first-launch-activity') {
  return <FirstLaunchActivityPicker go={go}/>;
}
```

The picker work adds a **second** interceptor immediately after:

```js
if (hydrationStatus === 'set' &&
    locationOnboardingStatus === 'pending' &&
    screen !== 'set-default-location') {
  return <SetDefaultLocationScreen go={go} dismissLabel="Skip for now"/>;
}
```

Sequence on cold install:
1. Welcome (`OnboardingScreen`, the existing single welcome card)
2. User taps "Find your moment" → `go('today')`
3. Activity interceptor preempts (activity unset) → `FirstLaunchActivityPicker` → user picks → activity 'set'
4. Location interceptor preempts (status 'pending') → `SetDefaultLocationScreen` → user picks or skips → status 'completed' or 'skipped'
5. Today renders

### 4.2 Generalized flow (D22)

`SetDefaultLocationScreen` is **one** screen used by all three entry points. The dismiss affordance varies by prop:

| Entry point | Render | `dismissLabel` | `onConfirm` writes | On dismiss |
|---|---|---|---|---|
| Onboarding interceptor | Modal | "Skip for now" | `default_location`, `status='completed'` | `status='skipped'` |
| YouScreen Settings row | Modal | "Cancel" | `default_location` | close, return to YouScreen |
| Today empty-state CTA | Modal | "Cancel" | `default_location`, `status='completed'` (if was skipped) | close, return to Today (still empty-state if no default) |

It renders `LocationPickerScreen embedded={true}` as a child, supplies its own header chrome (soft-anchor heading "Where do you usually start from?" per ruling 10, dismiss button), and listens for `onConfirm`.

**Today empty-state CTA opens this flow DIRECTLY**, not via a hop through YouScreen. (D22.)

### 4.3 LocationPickerScreen contract extension (D16, D22)

Current contract:
```js
export default function LocationPickerScreen({ go }) { ... }
```

New contract:
```js
export default function LocationPickerScreen({ go, onConfirm, embedded = false }) { ... }
```

Behavior:
- **`onConfirm(location: SavedLocation): void`** — REPLACES the hardcoded `go('loading')` at line 149. Callers that want the existing per-search behavior pass `onConfirm={() => go('loading')}`. Onboarding wrapper passes `onConfirm={(loc) => { setDefaultLocation(loc); markOnboardingComplete(); go('today'); }}`.
- **`embedded?:boolean`** — when `true`, LocationPickerScreen suppresses its own header (the Back/Close IconBtns at lines 166/172) because the parent wrapper supplies header chrome. When `false` or absent, header renders as today — `go('date')` / `go('today')` byte-identical.

Per-search caller change: ONE LINE inside the existing per-search caller (likely `App.js` rendering of `LocationPickerScreen` for the 'location' screen state). Pass `onConfirm={() => go('loading')}`. No `embedded`. Existing draft-store side effects (`patchDraft`) run inside LocationPickerScreen before `onConfirm` fires — preserved as-is.

**Not extended:** `initialLocation`, `onBack`, `onClose`. Per-search remains fresh (D20). Embedded mode handles chrome at the wrapper level; the picker doesn't need callbacks for navigation it isn't responsible for.

### 4.4 File layout mirrors activity-preference exactly (D21)

```
apps/mobile/src/lib/
  activity-preference.ts      ← existing
  location-preference.ts      ← NEW; mirrors activity-preference.ts shape exactly
  location-storage.ts         ← UNCHANGED (last_location + pickToSavedLocation + migration; Phase 1+2 work)
  storage.ts                  ← UNCHANGED (sync-cache + async-flush wrapper)
```

Naming mirrors:

| Activity | Location |
|---|---|
| `KEY_DEFAULT_ACTIVITY` | `KEY_DEFAULT_LOCATION`, `KEY_ONBOARDING_LOCATION` |
| `type HydrationStatus = 'loading' \| 'unset' \| 'set'` | identical |
| `migrateOrInvalid()` | `parseStoredLocation()` (validates shape; no migration map needed for MVP) |
| `initActivityPreference()` | `initLocationPreference()` |
| `setDefaultActivity()` | `setDefaultLocation()` |
| `getDefaultActivitySync()` | `getDefaultLocationSync()` |
| `useActivityPreference()` returning `{hydrationStatus, activity}` | `useLocationPreference()` returning `{hydrationStatus, defaultLocation}` |
| `__resetForTests()`, `__getSubscribeAndSnapshot()` | identical helpers |
| `__readActivityHydrationStatusSync()` ← **NEW, added in T0.5 (D28)** | (no mirror — this is an Activity-side export needed by `initLocationPreference`'s upgrade-path init per D14) |

**`useDefaultLocation` is NOT a separate hook** — the parallel of `useActivityPreference` is `useLocationPreference`. Naming is "the location PREFERENCE" not "the default location", matching the activity precedent.

**`__readActivityHydrationStatusSync()` is one-directional**, not a bidirectional mirror. It is a new export added to `activity-preference.ts` (T0.5 per the implementation phases below) so `initLocationPreference()` can read the activity hydration status synchronously without triggering a subscription, enabling the D14 upgrade-path init logic. There is no corresponding Location → Activity helper because Activity does not need to read Location state.

### 4.5 useEffectiveLocation composition hook (D11 from parked brainstorm)

```ts
// apps/mobile/src/hooks/useEffectiveLocation.ts
import { useState } from 'react';
import { useLocationPreference } from '../lib/location-preference';
import { getLastLocation, type SavedLocation } from '../lib/location-storage';

/**
 * Composes the effective location used for daily-note + display.
 *
 * Precedence:
 *   default_location  →  lastSeed (mount-frozen mirror of last_location)  →  null
 *
 * The lastSeed is FROZEN at mount via lazy useState init. Per-search edits
 * to `last_location` do NOT poison Today's display by leaking back through
 * useEffectiveLocation. Only explicit `default_location` mutations propagate
 * reactively (via the useSyncExternalStore subscription inside
 * useLocationPreference). Spec §6 D11.
 *
 * Returns null when neither default nor lastSeed is present. Callers (the
 * daily-note hook + TodayScreen empty-state guard) decide what to do with
 * null — typically: gate the query, render empty-state.
 *
 * IMPORTANT: do NOT use this hook inside the per-search flow. Per-search
 * intentionally treats each pick as fresh (the picker writes last_location
 * but reads nothing). D20.
 */
export function useEffectiveLocation(): SavedLocation | null {
  const { defaultLocation } = useLocationPreference();
  const [lastSeed] = useState(() => getLastLocation());
  return defaultLocation ?? lastSeed ?? null;
}
```

**Mount-frozen seed semantics (D11):** when a user is on Today and runs a per-search flow that updates `last_location`, `useEffectiveLocation()` on Today does NOT re-render with the new value. Today is anchored to either the explicit default or to the location it had at first mount. Only changing `default_location` (via Settings or via re-opening onboarding via empty-state) causes Today to re-render.

### 4.6 useDailyNote integration

Current shape (`useDailyNote.ts:68–104`):
```ts
const { hydrationStatus, activity } = useActivityPreference();
const { lat, lng, tz } = useMemo(() => {
  const loc = getLastLocation();
  if (loc) return { lat: round2(loc.lat), lng: round2(loc.lng), tz: loc.timezone };
  return { lat: ..., lng: ..., tz: FALLBACK_LOCATION.timezone };  // ← Kyiv hardcoded
}, []);  // ← lockup: never recomputes
```

New shape:
```ts
const { hydrationStatus: activityHydrationStatus, activity } = useActivityPreference();
const { hydrationStatus: locationHydrationStatus } = useLocationPreference();
const effectiveLocation = useEffectiveLocation();

const { lat, lng, tz } = effectiveLocation !== null
  ? { lat: round2(effectiveLocation.lat), lng: round2(effectiveLocation.lng), tz: effectiveLocation.timezone }
  : { lat: 0, lng: 0, tz: 'UTC' };  // sentinel values; never sent — enabled=false guards

const todayIsoDate = useMemo(() => isoTodayInTz(tz), [tz]);

const query = useQuery<DailyNoteResult, Error>({
  queryKey: __computeQueryKey({ lat, lng, tz, todayIsoDate, activity }),
  queryFn: () => getDailyNote({ lat, lng, tz, activity: activity! }),
  staleTime: Infinity,
  gcTime: 1000 * 60 * 60 * 24,
  enabled: __computeEnabled({
    activityHydrationStatus,
    locationHydrationStatus,
    activity,
    effectiveLocation,
  }),
});
```

`__computeEnabled` extension in `useDailyNote.helpers.ts`:
```ts
type ComputeEnabledArgs = {
  activityHydrationStatus: HydrationStatus;
  locationHydrationStatus: HydrationStatus;
  activity: Activity | undefined;
  effectiveLocation: SavedLocation | null;
};

export function __computeEnabled(args: ComputeEnabledArgs): boolean {
  return args.activityHydrationStatus === 'set'
    && args.locationHydrationStatus === 'set'
    && args.activity !== undefined
    && args.effectiveLocation !== null;
}
```

Removed: `FALLBACK_LOCATION` constant, the empty-deps `useMemo`, the `getLastLocation` import (now imported transitively via `useEffectiveLocation`).

### 4.7 TodayScreen guard ordering (D26 + D27)

Current (`TodayScreen.js:25–41`):
```js
const { data, isLoading, isError, error, refetch } = useDailyNote();
const [moodOverride, setMoodOverride] = useState(null);

if (isLoading) return <LoadingHero/>;
if (isError) return <ErrorHero error={error} onRetry={refetch}/>;
// ... uses data.response.daily_note
```

New:
```js
const { hydrationStatus: locationHydrationStatus } = useLocationPreference();
const effectiveLocation = useEffectiveLocation();
const { data, isLoading, isError, error, refetch } = useDailyNote();
const [moodOverride, setMoodOverride] = useState(null);

// Empty-state guard FIRST — fires when location hydration is done AND
// no effective location resolves. Must come before isLoading/isError
// because when useDailyNote is enabled=false, isLoading is false too,
// and the next check would fall through to `data.response.daily_note`
// on undefined data → crash. D27.
if (locationHydrationStatus === 'set' && effectiveLocation === null) {
  return <EmptyStateHero onSetLocation={() => go('set-default-location')}/>;
}
if (isLoading) return <LoadingHero/>;
if (isError) return <ErrorHero error={error} onRetry={refetch}/>;
// ... existing path
```

**Why the precise condition `locationHydrationStatus === 'set' && effectiveLocation === null` (D27):**
- During hydration window (`'loading'`), `useDailyNote` is also disabled (gated on `locationHydrationStatus === 'set'`), and `isLoading` is false. A bare `effectiveLocation === null` check would fire EmptyStateHero in this window → visible flash before the real location loads. The two-condition check stays silent until hydration resolves.
- After hydration:
  - `effectiveLocation !== null` → normal Loading → daily-note render
  - `effectiveLocation === null` → EmptyStateHero (user is fully onboarded but skipped the location step OR cleared the default with no `last_location` to fall back to OR is an upgrader who never searched)

**EmptyStateHero design notes** (UX detail to settle during implementation; this spec pins the contract):
- Soft-anchor copy. Suggestion: "Set a default location to see your daily timing."
- CTA: "Add a location" → `go('set-default-location')`. Opens `SetDefaultLocationScreen` directly per D22 (no Settings hop).
- Render variant: hero-card style consistent with the existing mood variants (strong / good / mixed / closed); designer + voice review during implementation.
- Re-uses `HeroGradient` + `Starfield` background per existing pattern.

### 4.8 Onboarding-status flag init (D14, D25)

`location-preference.ts` exports `initLocationPreference()` called from `App.js` boot effect AFTER `initActivityPreference()`.

```ts
const KEY_DEFAULT_LOCATION = 'inceptio.default_location';
const KEY_ONBOARDING_LOCATION = 'inceptio.onboarding_location_step_v1';

type HydrationStatus = 'loading' | 'unset' | 'set';
type OnboardingLocationStatus = 'pending' | 'skipped' | 'completed';

let hydrationStatus: HydrationStatus = 'loading';
let currentDefault: SavedLocation | null = null;
let onboardingStatus: OnboardingLocationStatus = 'pending';
const listeners = new Set<() => void>();

/** Idempotent. Called from App.js boot AFTER initActivityPreference(). */
export function initLocationPreference(): void {
  if (hydrationStatus !== 'loading') return;

  // 1. Default location primitive
  const rawDefault = storage.getString(KEY_DEFAULT_LOCATION);
  if (rawDefault) {
    const parsed = parseStoredLocation(rawDefault);
    if (parsed !== undefined) {
      currentDefault = parsed;
    } else {
      console.warn('[location-pref] invalid stored default, clearing:', rawDefault);
      storage.delete(KEY_DEFAULT_LOCATION);
    }
  }

  // 2. Onboarding-status primitive
  const rawStatus = storage.getString(KEY_ONBOARDING_LOCATION);
  if (rawStatus === undefined) {
    // First boot of this version. Decide based on activity-preference state.
    // EXISTING USERS (activity already 'set') → init to 'completed' so the
    // location interceptor does NOT fire retroactively. FRESH INSTALLS
    // (activity 'unset') → 'pending' so the chain Welcome → Activity → Location
    // fires. D14.
    const { hydrationStatus: activityStatus } = __readActivityHydrationStatusSync();
    const initStatus: OnboardingLocationStatus = activityStatus === 'set' ? 'completed' : 'pending';
    onboardingStatus = initStatus;
    storage.set(KEY_ONBOARDING_LOCATION, initStatus);
  } else if (rawStatus === 'pending' || rawStatus === 'skipped' || rawStatus === 'completed') {
    onboardingStatus = rawStatus;
  } else {
    console.warn('[location-pref] invalid onboarding status, resetting to completed:', rawStatus);
    onboardingStatus = 'completed';
    storage.set(KEY_ONBOARDING_LOCATION, 'completed');
  }

  hydrationStatus = 'set';
  notify();
}
```

`__readActivityHydrationStatusSync()` is a tiny exported helper in `activity-preference.ts` that exposes the in-memory `hydrationStatus` (NOT triggering subscription, NOT re-reading storage). Since `initActivityPreference()` runs first, this read sees the correct post-init value.

**Mirror exactly: NO retroactive interceptor for upgraders.** The activity-preference work intentionally never re-prompted users who had previously completed onboarding; the location interceptor mirrors this discipline.

### 4.9 Setter + idempotency

```ts
export function setDefaultLocation(loc: SavedLocation): void {
  currentDefault = loc;
  storage.set(KEY_DEFAULT_LOCATION, JSON.stringify(loc));
  notify();
}

export function clearDefaultLocation(): void {
  currentDefault = null;
  storage.delete(KEY_DEFAULT_LOCATION);
  notify();
}

export function markOnboardingLocationStatus(s: OnboardingLocationStatus): void {
  onboardingStatus = s;
  storage.set(KEY_ONBOARDING_LOCATION, s);
  notify();
}
```

Same ordering as activity-preference (D8 EC-14 inherited): in-memory state updated BEFORE storage.set. Sync-cache + async-flush risk inherited; documented in JSDoc.

### 4.10 Hook

```ts
type Snapshot = {
  hydrationStatus: HydrationStatus;
  defaultLocation: SavedLocation | null;
  onboardingLocationStatus: OnboardingLocationStatus;
};

let cachedSnapshot: Snapshot = computeSnapshot();

function computeSnapshot(): Snapshot {
  return { hydrationStatus, defaultLocation: currentDefault, onboardingLocationStatus: onboardingStatus };
}

function notify() {
  cachedSnapshot = computeSnapshot();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): Snapshot {
  return cachedSnapshot;
}

export function useLocationPreference(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

Mirror of `useActivityPreference()` exactly.

---

## 5. Surfaces detail

### 5.1 Onboarding location step

**Trigger:** `App.js` interceptor when `activityHydrationStatus === 'set'` AND `onboardingLocationStatus === 'pending'`.

**Renders:** `<SetDefaultLocationScreen go={go} dismissLabel="Skip for now" onDismissStatus="skipped"/>`.

**Behavior:**
- Header: soft-anchor heading ("Where do you usually start from?") + Skip button on the right
- Body: `<LocationPickerScreen embedded={true} onConfirm={handleConfirm}/>`
  - `embedded` suppresses LocationPickerScreen's own Back/Close header (those nav actions don't make sense here — onboarding has no Back, only Skip)
  - Search field + result list + "Find moments" button label is repurposed visually as "Continue" via embedded styling (TBD detail — could be a label prop later if multiple variants need different button text; keep simple in MVP and accept the literal label "Find moments" if changing is non-trivial — to settle in implementation)
- `handleConfirm(loc)`:
  1. `setDefaultLocation(loc)` (writes `default_location`)
  2. `markOnboardingLocationStatus('completed')`
  3. `go('today')` — interceptor stops firing (status === 'completed'), Today renders
- Skip handler:
  1. `markOnboardingLocationStatus('skipped')`
  2. `go('today')` — interceptor stops firing; Today shows EmptyStateHero (effective location null + hydration set)

**GPS-trap guard (D11):** "Use current location" button stays functional but is SECONDARY in onboarding context (smaller, below the city search). LocationPickerScreen's existing GPS button doesn't need wholesale restructuring — when `embedded=true`, the wrapper's chrome de-emphasizes the GPS affordance via layout/styling (TBD detail; the spec pins the principle: explicit button OK, prominent default action NOT OK).

### 5.2 YouScreen Settings row

**Position:** Below the existing "Default activity" row (mirrors the same Row design).

**Display:** "Default location" + the currently-set location's city name (or "Not set" if `defaultLocation === null`).

**Tap behavior:** Opens `<SetDefaultLocationScreen go={go} dismissLabel="Cancel" onDismissStatus={null}/>`. The `onDismissStatus={null}` signal means "don't change onboarding-status on dismiss" — they're already past onboarding; cancelling here just returns to YouScreen without writing.

**On confirm:** `setDefaultLocation(loc)` only (don't touch onboarding status). Then close → return to YouScreen → row re-renders with the new value via `useLocationPreference()`.

### 5.3 Today empty-state

Fires when `locationHydrationStatus === 'set' && effectiveLocation === null` (D27).

`EmptyStateHero` props:
- `onSetLocation: () => void` — wired to `go('set-default-location')`

The Today screen passes `go('set-default-location')` (a new screen state in App.js's `SCREENS` map). When user taps the CTA, App.js routes to `SetDefaultLocationScreen` with `dismissLabel="Cancel" onDismissStatus="completed"` (because the user is explicitly engaging with the prompt — Cancel means "I don't want to set right now; remember I'm aware of it" → status='completed', NOT 'skipped').

Setting `onDismissStatus="completed"` even on Cancel from the empty-state CTA prevents the empty-state CTA from re-firing the location interceptor (which would be weird UX: tap CTA, cancel, get bounced back into the modal). The interceptor only watches `pending`; `completed` and `skipped` both terminal.

### 5.4 TodayScreen integration

```js
import EmptyStateHero from '../components/daily-note/EmptyStateHero';
import { useLocationPreference } from '../lib/location-preference';
import { useEffectiveLocation } from '../hooks/useEffectiveLocation';

export default function TodayScreen({ go }) {
  const { hydrationStatus: locationHydrationStatus } = useLocationPreference();
  const effectiveLocation = useEffectiveLocation();
  const { data, isLoading, isError, error, refetch } = useDailyNote();
  const [moodOverride, setMoodOverride] = useState(null);

  if (locationHydrationStatus === 'set' && effectiveLocation === null) {
    return <EmptyStateHero onSetLocation={() => go('set-default-location')}/>;
  }
  if (isLoading) return <LoadingHero/>;
  if (isError) return <ErrorHero error={error} onRetry={refetch}/>;

  const dailyNote = data.response.daily_note;
  // ... rest unchanged
}
```

`EmptyStateHero` is a new file; signature suggested above. Designer + voice review during implementation.

---

## 6. Storage model

### 6.1 Keys

| Key | Owner module | Shape | Set by | Read by |
|---|---|---|---|---|
| `inceptio.default_location` | `location-preference.ts` | `JSON.stringify(SavedLocation)` | `setDefaultLocation` | `initLocationPreference`, `useLocationPreference`, indirectly by `useEffectiveLocation` |
| `inceptio.onboarding_location_step_v1` | `location-preference.ts` | string: `'pending' \| 'skipped' \| 'completed'` | `initLocationPreference`, `markOnboardingLocationStatus` | `useLocationPreference`, App.js interceptor |
| `inceptio.last_location` | `location-storage.ts` (unchanged) | `JSON.stringify(SavedLocation)` | `saveLocation` (called by per-search caller) | `getLastLocation` (called by `useEffectiveLocation` once at mount), `migrateLocationTimezones_v1` |
| `inceptio.default_activity` | `activity-preference.ts` (unchanged) | string | `setDefaultActivity` | `initActivityPreference`, `useActivityPreference` |

### 6.2 Precedence (D11, D20)

For consumers reading the effective location (currently only `useDailyNote` + TodayScreen):

```
default_location  →  lastSeed (mount-frozen mirror of last_location)  →  null
```

The mount-frozen step (`useState(() => getLastLocation())`) is critical (D11): per-search edits to `last_location` would otherwise reactively poison Today's display via the subscription chain. Per-search and Today are intentionally decoupled by this freeze — per-search is "where the event is right now"; Today is "where I usually start from".

Per-search flow has its OWN precedence (unchanged):
- `last_location` for restoring the prior pick if user navigates back to the picker mid-flow (the picker's existing behavior)
- ELSE empty (user picks fresh) — line 47 "Selection intentionally NOT restored" comment

`default_location` is NEVER read by the per-search flow (D20).

### 6.3 Migration

- **No data migration for `default_location`** — the key is new on this branch; nothing to migrate.
- **No data migration for `onboarding_location_step_v1`** — the key is new; `initLocationPreference()` decides absent-value semantics based on activity-preference state (D14).
- **`last_location` migration** is already shipped (`migrateLocationTimezones_v1` from Phase 2). Default-location work inherits its correctness — when `default_location` is later read for the daily-note query, the tz field is whatever `pickToSavedLocation` wrote at set-default time (canonical via tryTzLookup).

No new migration function. The init function handles upgrade scenarios for the new keys; the existing migration handles legacy tz on the existing key.

### 6.4 SavedLocation shape (UNCHANGED)

```ts
// From apps/mobile/src/lib/location-storage.ts:13-21
export interface SavedLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
  timezone: string;
  selected_at: number;
}
```

`default_location` writes this exact shape via `pickToSavedLocation`. No version field needed for MVP — if SavedLocation's shape evolves later, that's a separate migration concern across both keys.

---

## 7. App.js state machine + interceptor wiring

### 7.1 New screen registration

Add `'set-default-location': SetDefaultLocationScreen` to the `SCREENS` map. Add `'set-default-location'` to `MODAL_SCREENS` so the tab bar hides while the user is in the flow.

### 7.2 Init wire-in

Inside the existing hydrate effect (currently lines ~80–94 per Phase 2 wire-in):

```js
useEffect(() => {
  hydrateStorage().then(() => {
    storage.delete('inceptio.results_view');
    migrateLocationTimezones_v1();
    initActivityPreference();
    initLocationPreference();           // ← NEW; AFTER initActivityPreference so it can read activity status
    setStorageReady(true);
  });
}, []);
```

`setStorageReady(true)` remains the LAST call so consumers waiting on storage readiness fire after all inits.

### 7.3 Interceptor block

```js
const { hydrationStatus: activityHydrationStatus } = useActivityPreference();
const { hydrationStatus: locationHydrationStatus, onboardingLocationStatus } = useLocationPreference();

// ... loading boot view unchanged ...

// First-launch activity gate (existing, unchanged)
if (activityHydrationStatus === 'unset' && screen !== 'first-launch-activity') {
  return <FirstLaunchActivityPicker go={go}/>;
}

// First-launch location gate (NEW)
if (activityHydrationStatus === 'set' &&
    locationHydrationStatus === 'set' &&
    onboardingLocationStatus === 'pending' &&
    screen !== 'set-default-location') {
  return <SetDefaultLocationScreen
    go={go}
    dismissLabel="Skip for now"
    onDismissStatus="skipped"
  />;
}

// Normal screen tree
const Screen = SCREENS[screen] || SCREENS.today;
// ...
```

**Why the four-part condition:**
- `activityHydrationStatus === 'set'` → activity onboarding done (interceptor sequencing: activity must clear first)
- `locationHydrationStatus === 'set'` → location-preference hydration completed (the `'loading'` window doesn't fire the interceptor — important on first render of the App.js effect)
- `onboardingLocationStatus === 'pending'` → user hasn't completed OR skipped yet
- `screen !== 'set-default-location'` → don't recursively re-intercept while user is actively in the screen (mirrors `FirstLaunchActivityPicker`'s self-exclusion)

### 7.4 Boot view + loading window

During hydration (`storageReady === false`), the existing ActivityIndicator boot view stays. After hydration completes, both `activityHydrationStatus` and `locationHydrationStatus` will be `'set'` (unset for activity if cold install). The activity interceptor fires (if needed), then the location interceptor (if needed), then Today renders.

---

## 8. Hook contracts

### 8.1 `useLocationPreference()` (NEW)

```ts
import { useSyncExternalStore } from 'react';

type Snapshot = {
  hydrationStatus: 'loading' | 'unset' | 'set';
  defaultLocation: SavedLocation | null;
  onboardingLocationStatus: 'pending' | 'skipped' | 'completed';
};

export function useLocationPreference(): Snapshot;
```

`hydrationStatus === 'unset'` is never produced by this implementation — initLocationPreference always transitions to `'set'` (status field has 3 values regardless of default_location presence). The `'unset'` variant exists in the type for parity with `useActivityPreference` and future extensibility, but consumers should treat `'set'` as the meaningful post-hydration value and `'loading'` as the pre-hydration value.

### 8.2 `useEffectiveLocation()` (NEW)

```ts
export function useEffectiveLocation(): SavedLocation | null;
```

Returns:
- `defaultLocation` from the preference store if non-null (reactive)
- Else the mount-frozen `lastSeed` from `getLastLocation()` if non-null (NOT reactive — frozen at mount)
- Else `null`

### 8.3 `useDailyNote()` (MODIFIED)

Signature unchanged. Internal subscriptions add `useLocationPreference()` + `useEffectiveLocation()`. `FALLBACK_LOCATION` removed. Empty-deps `useMemo` removed. `__computeEnabled` extended (4 args instead of 2).

### 8.4 `__computeEnabled(args)` (MODIFIED)

```ts
type ComputeEnabledArgs = {
  activityHydrationStatus: HydrationStatus;
  locationHydrationStatus: HydrationStatus;
  activity: Activity | undefined;
  effectiveLocation: SavedLocation | null;
};

export function __computeEnabled(args: ComputeEnabledArgs): boolean {
  return args.activityHydrationStatus === 'set'
    && args.locationHydrationStatus === 'set'
    && args.activity !== undefined
    && args.effectiveLocation !== null;
}
```

---

## 9. Test pack

### 9.1 Unit — location-preference.ts (new file)

Mirrors `activity-preference.test.ts` shape. ~150–200 lines.

**Init tests (D14, D25):**
1. Fresh install + no stored values → `hydrationStatus = 'set'`, `defaultLocation = null`, `onboardingLocationStatus = 'pending'`, flag persists to storage
2. Fresh install + activity already 'set' (the upgrade scenario) + no location keys → `onboardingLocationStatus` initializes to `'completed'`, flag persists
3. Stored `default_location` JSON parseable → `defaultLocation = parsed`
4. Stored `default_location` JSON corrupt → cleared from storage, `defaultLocation = null`
5. Stored `onboarding_location_step_v1` is valid value → that value used
6. Stored `onboarding_location_step_v1` invalid string → reset to `'completed'`, persists
7. Init is idempotent — second call after `hydrationStatus === 'set'` is a no-op

**Setter tests:**
8. `setDefaultLocation(loc)` updates in-memory + storage; subscribers notified
9. `clearDefaultLocation()` clears both
10. `markOnboardingLocationStatus('completed')` updates flag + notifies

**Subscription tests:**
11. `useLocationPreference()` returns initial snapshot
12. After `setDefaultLocation`, subscribers re-render
13. After `markOnboardingLocationStatus`, subscribers re-render

### 9.2 Unit — useEffectiveLocation.ts (new file)

~80 lines.

1. Returns `defaultLocation` when set
2. Returns mount-frozen `lastSeed` when `defaultLocation === null`
3. Returns `null` when both null
4. **Mount-frozen invariant (D11):** mount with `lastSeed = A`, simulate per-search edit setting `last_location = B`, re-render hook → still returns A (the frozen seed)
5. **Default reactivity:** mount with `defaultLocation = A`, call `setDefaultLocation(B)` → hook returns B on next render

### 9.3 Unit — useDailyNote.ts (MODIFIED)

Existing tests at `useDailyNote.test.ts` (~50 lines today, mostly `__computeQueryKey` + `__computeEnabled`). Additions:

1. `__computeEnabled` returns false when `locationHydrationStatus === 'loading'`
2. `__computeEnabled` returns false when `effectiveLocation === null` (even with activity set + location hydrated)
3. `__computeEnabled` returns true with all four gates green
4. `__computeQueryKey` queryKey content changes when `effectiveLocation` changes (lockup fix regression guard)

Existing tests for activity-only gates stay (add `locationHydrationStatus: 'set'`, `effectiveLocation: <stub>` to their args).

### 9.4 Unit — LocationPickerScreen contract

~30 lines.

1. **Per-search caller regression:** rendering `<LocationPickerScreen go={go} onConfirm={() => go('loading')}/>` (no `embedded`) behaves byte-identically to today — Find moments → onConfirm fires → caller routes to 'loading'; Back → go('date'); Close → go('today')
2. **Embedded mode:** `<LocationPickerScreen go={go} onConfirm={spy} embedded={true}/>` does not render the Back/Close IconBtns at lines 166/172 (the wrapper supplies header)
3. **onConfirm fires with SavedLocation:** verify the callback receives the picked location and not undefined

### 9.5 Integration — TodayScreen

~80 lines.

1. **Empty-state fires** when location null + hydration set
2. **Empty-state does NOT fire during hydration window** (D27): mock `useLocationPreference` returning `{hydrationStatus: 'loading'}` → TodayScreen renders LoadingHero, not EmptyStateHero
3. **Empty-state CTA opens SetDefaultLocationScreen** via `go('set-default-location')`
4. **Setting default refreshes Today**: simulate the user setting default via the empty-state flow → Today re-renders with daily-note data (lockup fix regression guard)
5. **Existing upgrader path**: locationHydrationStatus 'set', defaultLocation null, lastSeed non-null (from existing last_location) → useEffectiveLocation returns lastSeed → useDailyNote enabled → Today renders normally

### 9.6 Integration — App.js interceptor chain

~80 lines (or extend the existing App.js test if one exists).

1. **Cold install sequence**: storageReady → activityStatus 'unset' → activity interceptor → user picks → activityStatus 'set' + locationStatus 'pending' → location interceptor → user picks → 'completed' → Today renders
2. **Upgrade path**: storageReady → activityStatus 'set' (existing user) + onboardingLocationStatus 'completed' (auto-init per D14) → no interceptor → Today renders (with EmptyStateHero if no last_location)
3. **Skip flow**: location interceptor → user taps Skip → 'skipped' → Today renders → EmptyStateHero shows (because no default_location set and possibly no last_location)
4. **Settings entry**: from YouScreen, tap Default location row → SetDefaultLocationScreen opens; Cancel returns to YouScreen without status change
5. **Empty-state CTA entry**: from Today empty-state, tap CTA → SetDefaultLocationScreen opens; Cancel sets status to 'completed' and returns to Today (still empty-state)

### 9.7 Maestro `05-onboarding-location-step.yaml`

NEW. Two flows in the file:

**Flow A — fresh install, pick a city:**
1. launch Expo Go → Inceptio
2. Welcome → tap "Find your moment"
3. Activity picker appears → tap an activity → Continue
4. Location step appears → search "Tokyo" → tap result → Continue
5. Today renders with daily-note for Tokyo

**Flow B — fresh install, skip:**
1. launch Expo Go → Inceptio
2. Welcome → tap "Find your moment"
3. Activity picker → pick → Continue
4. Location step appears → tap "Skip for now"
5. Today renders empty-state with "Add a location" CTA

Sentinel strings determined at implementation time by grep against the live screens (same pattern as `04-location-picker-regression.yaml`).

### 9.8 Existing test regression coverage

- **04-location-picker-regression.yaml** (Phase 1 Task 1.4) must still pass byte-identically — the contract extension preserves per-search behavior
- All ~70 mobile vitest tests must still pass (modulo extensions to useDailyNote.test.ts which become part of the picker test pack)

---

## 10. Edge cases

| ID | Case | Resolution |
|---|---|---|
| EC-1 | Existing upgrader, never set activity (impossible per current shipping state but theoretical) | Activity interceptor fires first as today; location interceptor fires after (status auto-init 'pending' because activity wasn't already 'set' at init time) |
| EC-2 | Existing upgrader, activity already 'set' at init | `initLocationPreference` reads activity status, sees 'set', initializes onboarding-status to 'completed' → interceptor never fires. User opens YouScreen to set default if they want. (D14) |
| EC-3 | User completes activity onboarding, then closes app before completing location step | Storage state: activity 'set' + onboarding_location 'pending'. Next launch: activity interceptor doesn't fire (already set), location interceptor fires (status pending). Resume. |
| EC-4 | User on Today with `default_location` set, opens YouScreen, clears default | `clearDefaultLocation()` → `defaultLocation = null` → `useEffectiveLocation()` falls through to mount-frozen `lastSeed`. If `lastSeed !== null`, Today continues showing daily-note for `lastSeed`. If `lastSeed === null`, Today re-renders empty-state. |
| EC-5 | User on Today, opens per-search, picks Tokyo, hits Find moments → completes → goes back to Today | `last_location` was updated to Tokyo. `useEffectiveLocation()` on Today still returns `defaultLocation` (if set) OR the original `lastSeed` (if not). **Per-search edits do NOT poison Today** per D11 mount-frozen seed. |
| EC-6 | App backgrounded mid-onboarding (between activity and location steps) | iOS preserves the screen state machine; on resume, interceptor logic re-evaluates against current storage. User lands back on the appropriate step. |
| EC-7 | Hydration window (storageReady false OR locationHydrationStatus 'loading') | TodayScreen empty-state guard requires `locationHydrationStatus === 'set'` → no flash. ActivityIndicator boot view OR LoadingHero handles the visual. (D27) |
| EC-8 | `storage.set` async-flush failure during onboarding (e.g., user taps Continue, app crashes before MMKV flushes) | Inherited from activity-preference EC-14. In-memory state is correct for the session; on next boot, the unsynced write is lost → user re-prompted via interceptor (if location was unsaved) OR Today shows empty-state (if default was unsaved). Acceptable; documented in JSDoc. |
| EC-9 | GPS button explicitly tapped in onboarding context | Functions normally — fills in current location. Explicit user action (D11), not silent substitution. Goes through `pickToSavedLocation` for canonical tz. |
| EC-10 | `defaultLocation` has stale tz from a prior version (e.g., shipped before tz-fix) | Won't happen — `default_location` is new on this branch; no prior data. (Contrast: `last_location` was migrated by Phase 2.) |
| EC-11 | Worker tz authority correction when Today queries with `default_location` | The Worker's tz authority + alias-aware comparison handles this transparently. Even if the device's `default_location.timezone` is slightly stale (e.g., legacy `Europe/Kiev`), the Worker either confirms equivalence (alias-aware, no warn) or corrects it (genuine cross-location, warn + counter). Default-location correctness is structural via `pickToSavedLocation`; Worker remains the defense-in-depth. (Closed-by-inheritance from tz-fix.) |
| EC-12 | User pinches/zooms or sees layout shift during empty-state → set-default flow | UX detail handled at implementation; not a correctness concern. |
| EC-13 | `cluster-windows.ts:108` pre-existing TS error | Out of scope (memo `tz-fix-pre-existing-debt`; predates branch; not introduced by this work). |
| EC-14 | Race: `setDefaultLocation` called twice in quick succession | External store last-write-wins; both `notify()` calls fire; subscribers get the latest snapshot. Standard useSyncExternalStore semantics. |
| EC-15 | User explicitly sets default via Settings while NOT logged into onboarding step (i.e., already past it) | Settings entry uses `onDismissStatus={null}` → no onboarding-status mutation. Default-location is set; onboarding-status stays whatever it was (probably 'completed' from auto-init or actual completion). |
| EC-16 | Empty-state CTA → Cancel from SetDefaultLocationScreen | Cancel sets status to 'completed' (NOT 'skipped') so the empty-state CTA doesn't trigger the location interceptor on next render. Status was likely already 'completed' or 'skipped'; either way, ends terminal. |
| EC-17 | LocationPickerScreen rendered embedded but with no parent providing header | Currently impossible (only `SetDefaultLocationScreen` uses `embedded={true}`). If some future caller misuses, picker has no Back/Close affordance and user can only Continue or use the device back button. Acceptable failure mode; not a correctness concern for MVP. |
| EC-18 | TypeScript strictness for `useLocationPreference` return type when consumers destructure | Standard TS inferred type. Test consumers explicitly to ensure no `any` leaks. |

---

## 11. Decision log

D-numbering preserves the rulings 1–27 from the user's brainstorm review. Decisions discovered during spec-writing get D28+.

| D# | Decision | Source |
|---|---|---|
| D1–D8 | Picker MVP scope, two-key model, precedence rules, override semantics, empty-state principle, useMemo lockup fix path, GPS-trap awareness, symmetry baseline | User rulings 1–8 (pre-compaction context, summarized) |
| D6 | NO silent substitution — empty-state when no default/lastSeed (explicit > silent) | Ruling 6 (referenced by 11, 12, 18) |
| D9 | Default-location write paths: onboarding step (new) + YouScreen Settings row + per-search override writes last_location (unchanged) | Ruling 9 |
| D10 | Framing split — Onboarding+Settings = "your default location" (soft anchor); per-search keeps "location of the event" framing | Ruling 10 |
| D11 | GPS-trap guard in onboarding: city search lead, "use current location" SECONDARY (button OK; not prominent default) | Ruling 11 |
| D12 | Onboarding location step is SKIPPABLE ("Skip for now") | Ruling 12 |
| D13 | Onboarding arc: activity → location → land on Today | Ruling 13 |
| D14 | Flag absent-value semantics: fresh install → 'pending'; upgrade with activity 'set' → 'completed' (no retroactive interceptor fire) | Ruling 14 |
| D15 | (Originally: per-search prefill in MVP. **Reversed by D20.**) | Ruling 15 |
| D16 | LocationPickerScreen contract = `onConfirm(location)` + `embedded?:boolean`. No `initialLocation`, no `onBack`/`onClose`. | Rulings 16 + 22 (contract refined) |
| D17 | File layout mirrors activity-preference exactly | Ruling 17 |
| D18 | TodayScreen empty-state is NEW UI (not relabel of existing) | Ruling 18 + investigation |
| D19 | Tri-state flag (pending/skipped/completed); binary behavior in MVP (skipped == completed for interceptor) | Ruling 19 |
| D20 | **Per-search prefill (Surface 2) DROPPED**. Reverses D15. No per-search-caller edit; LocationPickerScreen does NOT need `initialLocation`. | Ruling 20 |
| D21 | NEW `location-preference.ts` mirroring `activity-preference.ts` (Option A). `location-storage.ts` unchanged. Hook: `useLocationPreference()` | Ruling 21 |
| D22 | Generalized `SetDefaultLocationScreen` (one screen, three entry points). LocationPickerScreen contract = `onConfirm + embedded`. Empty-state CTA opens flow DIRECTLY (not via Settings hop). | Ruling 22 |
| D23 | Onboarding step is part of THIS spec — one cohesive feature, not a separate rung | Ruling 23 |
| D24 | Parallel interceptor confirmed | Ruling 24 |
| D25 | `initLocationPreference()` sketch + 5 test cases confirmed | Ruling 25 |
| D26 | All `useDailyNote` consumers audited; only TodayScreen needs the empty-state guard | Ruling 26 + investigation |
| D27 | Empty-state guard CONDITION = `locationHydrationStatus === 'set' && effectiveLocation === null`. Bare `effectiveLocation === null` would fire during hydration window → visible flash. | Ruling 27 |
| D28 | `__readActivityHydrationStatusSync()` helper exported from `activity-preference.ts` for `initLocationPreference()` to read activity status without triggering subscription. Tiny addition; mirrors `getDefaultActivitySync()` pattern. | Spec-writing |
| D29 | `EmptyStateHero` is a new component file at `apps/mobile/src/components/daily-note/EmptyStateHero.js`. Naming + location mirror `LoadingHero` / `ErrorHero` precedent at `DailyHero.js`. | Spec-writing |
| D30 | Per-search caller (the existing place rendering `<LocationPickerScreen go={go}/>`) gets ONE-LINE change: add `onConfirm={() => go('loading')}`. No `embedded`. No other props. Byte-identical to today. | Spec-writing |
| D31 | TodayScreen empty-state CTA passes `'completed'` (not `'skipped'`) when user Cancels from empty-state entry to SetDefaultLocationScreen — prevents the empty-state CTA from triggering the location interceptor on next render. | Spec-writing (EC-16) |

---

## 12. Implementation phases

The spec maps to ~6 phases for the `/plan-and-implement` step. Phases are sequential by default; parallelizable units flagged.

### Phase 0 — Foundational
- T0.1: New file `apps/mobile/src/lib/location-preference.ts` skeleton (types, keys, init signature, hook export, test helpers); does NOT yet implement init logic
- T0.2: New file `apps/mobile/src/hooks/useEffectiveLocation.ts` skeleton (signature only, returns `null`)
- T0.3: New file `apps/mobile/src/components/daily-note/EmptyStateHero.js` skeleton (renders soft placeholder card)
- T0.4: New file `apps/mobile/src/screens/SetDefaultLocationScreen.js` skeleton (renders LocationPickerScreen passthrough)
- T0.5: Export `__readActivityHydrationStatusSync()` from `activity-preference.ts` (D28)

### Phase 1 — Storage primitives
- T1.1: Failing tests for `initLocationPreference()` (the 7 init cases from §9.1) + tests for `setDefaultLocation`/`clearDefaultLocation`/`markOnboardingLocationStatus`
- T1.2: Implement `initLocationPreference()` + setters per §4.8
- T1.3: Wire `initLocationPreference()` into `App.js` boot effect AFTER `initActivityPreference()`

### Phase 2 — Hook (useLocationPreference + useEffectiveLocation)
- T2.1: Failing tests for `useLocationPreference()` snapshot + subscription
- T2.2: Implement `useLocationPreference()` per §4.10
- T2.3: Failing tests for `useEffectiveLocation()` (mount-frozen invariant + reactive default)
- T2.4: Implement `useEffectiveLocation()` per §4.5

### Phase 3 — useDailyNote integration + FALLBACK removal
- T3.1: Extend `__computeEnabled` tests to cover location dimension; failing tests
- T3.2: Extend `ComputeEnabledArgs` + `__computeEnabled` per §8.4
- T3.3: Modify `useDailyNote.ts` per §4.6 — remove FALLBACK_LOCATION + empty-deps useMemo; subscribe to useLocationPreference + useEffectiveLocation
- T3.4: Verify all 70+ existing mobile tests still pass + new tests green

### Phase 4 — LocationPickerScreen contract extension
- T4.1: Failing tests for `onConfirm` callback wiring + `embedded` header suppression
- T4.2: Add `onConfirm` + `embedded` props per §4.3
- T4.3: Update per-search caller (one-line addition per D30): `onConfirm={() => go('loading')}`
- T4.4: Verify `04-location-picker-regression.yaml` Maestro flow still passes byte-identically (run in CI / locally if simulator available)

### Phase 5 — SetDefaultLocationScreen + entry-point wiring
- T5.1: Implement `SetDefaultLocationScreen` per §5.1, accepting `dismissLabel`, `onDismissStatus`, `go` props
- T5.2: Wire as `'set-default-location'` screen in `App.js SCREENS` map + `MODAL_SCREENS` set
- T5.3: Add parallel interceptor block to `App.js` per §7.3
- T5.4: Implement `EmptyStateHero` in `apps/mobile/src/components/daily-note/EmptyStateHero.js`
- T5.5: Modify `TodayScreen.js` empty-state guard per §4.7 + §5.4
- T5.6: Add YouScreen "Default location" row per §5.2

### Phase 6 — Verification + Maestro
- T6.1: Write Maestro `05-onboarding-location-step.yaml` per §9.7 (two flows: pick + skip)
- T6.2: Full mobile vitest suite green
- T6.3: Mobile tsc clean except pre-existing `cluster-windows.ts(108,35)`
- T6.4: Manual smoke: fresh install on iOS simulator → activity step → location step → Today shows default. Skip flow → Today shows empty-state → tap CTA → SetDefaultLocationScreen opens → set → Today renders.

---

## 13. Self-review checklist (writer)

- **Spec coverage:** All 27 rulings mapped to D-numbers in §11. Rulings 20 (Surface 2 dropped) and 22 (generalized flow) explicitly reverse/refine earlier rulings; documented.
- **Out-of-scope guard:** §3 names six specifically forbidden expansions; implementer cannot silently add per-search edits, `initialLocation`, `onBack`/`onClose`, multi-default, GPS-auto, or skip-vs-completed behavioral split.
- **Placeholder scan:** No "TBD" without disposition. UX details flagged as "to settle at implementation" where appropriate (empty-state copy, GPS de-emphasis exact styling, embedded button label) — these are bounded UX choices, not undefined behavior.
- **Type consistency:** `SavedLocation` shape unchanged. `HydrationStatus` shared via type imports. `useLocationPreference` returns `{hydrationStatus, defaultLocation, onboardingLocationStatus}` consistently across the file. `__computeEnabled` args extension explicit.
- **TDD discipline:** Each implementation phase has a failing-tests task BEFORE the implementation task (Phase 1 T1.1 → T1.2; Phase 2 T2.1 → T2.2; etc.). Phase 0 is structural skeleton (no behavior).
- **Hermes / Worker / push-main constraints:**
  - Hermes gate already satisfied (Phase 1 Hermes confirm); this work executes Hermes-aware (`__DEV__` gates etc.)
  - Worker prod deploy independent track (CP-C reframed); picker work does not block on it
  - push-main denies stay; work continues on `feature/set-default-location`
- **Frequent commits:** Each task closes with a `git commit`. Phase 0 commits are small skeletons (one file per task). Phase 1+ commits include both tests and implementation in the same task where appropriate.
- **Migration:** No data migration needed for new keys. `last_location` migration already shipped. Documented in §6.3.
- **EC-19 closure:** Documented in §2 and §6 — default-location inherits tz correctness via `pickToSavedLocation`.

---

## 14. Out of scope (explicit, for implementer)

1. Per-search caller edits BEYOND the one-line `onConfirm={() => go('loading')}` addition. The flow stays fresh. (D20)
2. `initialLocation` / `defaultValue` prop on LocationPickerScreen. (D16, D20)
3. `onBack` / `onClose` props on LocationPickerScreen. (D16)
4. Multi-default or favorite cities UI.
5. GPS-as-silent-default. The button stays explicit; the prominent action stays city search. (D11)
6. Skip-vs-completed behavioral split in MVP (no re-prompting skippers; storage value preserved for future). (D19)
7. Cache eviction / migration of pre-existing `default_location` data. (No pre-existing data; key is new.)
8. Worker amendments. The Worker is correct; default-location ships as a pure mobile feature.
9. Push-to-main. Work continues on `feature/set-default-location`; merge is a separate operator step gated by push-main denies.

---

*End of spec. Spec-reviewer pass next; then user sign-off; then `/plan-and-implement`.*
