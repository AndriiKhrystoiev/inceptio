# Default activity preference — design memo

**Status:** Brainstorm output. Feeds into a subsequent `/plan-and-implement`.
**Date:** 2026-06-02
**Authoritative artifacts upstream of this memo:**
- Voice/copy spec — `docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md` (with §12.4 amendment landing in parallel with this memo)
- Mobile integration memo — `docs/superpowers/specs/2026-05-29-mobile-integration-design.md`
- Picker contract — `docs/superpowers/design-handoff/daily-note/PICKER-CONTRACT.md`
- Domain-expert audit (D3 rescue) — `docs/superpowers/expert/2026-06-02-default-activity-d3-audit.md`
- Knowledge base — `docs/superpowers/expert/_knowledge-base/astrology-electional.md`
- Project context — `CLAUDE.md`

---

## 1. Summary

Add a **user-selectable default activity preference** — wedding, contracts, business_launch, or travel — as a first-class, persisted user setting consumed by the daily-note voice, the first-launch experience, the Settings row in the You tab, and the search picker chain. The preference is a single source of truth read by several screens via a reactive `useActivityPreference()` hook.

**Scope decisions (signed off across the brainstorm + two pre-flight audits):**

1. **Default activity is its own persistent preference**, separate from the existing `KEY_LAST_ACTIVITY` per-search recall mirror. Two storage keys with non-overlapping semantics — see §3 (storage) and §10 (drift).
2. **Pre-flight code-archaeology rewrote five of brainstorm Section 6's architectural assumptions.** MMKV is not installed; no Context exists in the app; no Sentry; `ActivityPickerScreen` card is inline-private; `useDailyNote` queryKey does not include activity. Each is addressed in the layer that touches it.
3. **D3 reopened by domain-expert audit and rescued via the asymmetry-hint pattern.** The daily-note's base sky-state sentence stays activity-agnostic. Three sky conditions — Venus retrograde, Mercury retrograde, day-dominant Moon void-of-course — gain an optional one-line severity hint that varies by activity. **12 confirmed severity-hint strings** (3 conditions × 4 activities), **plus 4 pending astrologer ruling** for intraday Moon VOC (Entry 12 of the voice library), = 16 total. All other sky conditions (~17 of 21 voice library entries) remain activity-agnostic. See §7 and the voice spec §12.4 amendment.
4. **Reactive global state via `useSyncExternalStore` module pattern, NOT React Context.** ~20-line module shape (`lib/activity-preference.ts`); no new architectural layer. Migration path to Context is mechanical when the D18 threshold (3+ preferences) hits — consumer signatures stay identical. See §3.
5. **Worker `/daily-note` route accepts `activity` via phased migration.** Phase A: optional with logged fallback; Phase B: required with `400` on missing. Mobile rolls out before Worker tightens. See §6.
6. **First-launch experience adds an activity selection step.** Hydration-status-driven; never shows a visual default before hydration completes. See §4.
7. **Existing `KEY_LAST_ACTIVITY` is preserved**, not deprecated. Drift detection rule documented in §10.

---

## 2. Foundational findings (call out for the plan)

These five findings from the code-archaeology pre-flight changed enough Section 6 assumptions that the plan must internalize them before reading the layers.

### Finding A — Canonical `Activity` already exists in `@inceptio/shared-types`

`ActivitySchema` (Zod enum) + `Activity` (TS type) exported from `packages/shared-types/src/api/request.ts:4-10` and re-exported via `packages/shared-types/src/index.ts:1`. Already consumed by `apps/mobile/src/lib/draft-store.ts:1` and `workers/api-proxy/src/translations/dictionary/status-lines.ts:1`. **This spec reuses the canonical export. It does NOT create a parallel `apps/mobile/src/shared/activities.ts`.**

### Finding B — MMKV is not actually installed; AsyncStorage wrapper is the convention

CLAUDE.md's reference to `react-native-mmkv` is aspirational. Real code path: `apps/mobile/src/lib/storage.ts` exposes an MMKV-shaped wrapper over AsyncStorage + an in-memory sync cache (rationale comment in the file: Expo Go incompatible with Nitro Modules in MMKV v3). Per-key string convention, namespace `inceptio.<name>`. Reads return `undefined` until `hydrateStorage()` resolves; hydration is gated in `App.js:103-108`.

### Finding C — No Context, no Zustand anywhere in `apps/mobile/src/`

`grep -rn "createContext\|useContext\|zustand"` in `apps/mobile/src/` returns zero hits. App-wide state today is two `useState` calls in `App.js` (`screen`, `tab`) plus direct sync reads from `storage` inside each screen via `draft-store.ts` helpers. Only providers in the tree are `QueryClientProvider` and `SafeAreaProvider`. **A Context provider for activity preference would be the first Context in the codebase.** This spec chooses a `useSyncExternalStore` module pattern instead — see §3.4 for rationale and §13 for the future Context migration path.

### Finding D — `useDailyNote` does not currently take `activity`; Today screen unmounts on tab switch

`apps/mobile/src/hooks/useDailyNote.ts:64-70` has `queryKey: ['daily-note', round2(lat), round2(lng), tz, todayIsoDate]`. Activity is absent. `getDailyNote()` in `lib/api.ts` signature is `{lat, lng, tz}`. The Worker route does not currently validate `activity`. Adding it is a Worker-side change in scope — see §6 phased migration.

`App.js:111` renders `<Screen go={go}/>` where `Screen = SCREENS[screen]`. Only one screen is mounted at a time. TanStack Query cache survives unmounts (cached data is still served on remount). This means a default-activity change does NOT need a global broadcast to a persistently-mounted Today — it needs Today's hook to re-read the preference reactively when the user returns to the tab. Subscription-based hook satisfies this without Context.

### Finding E — `KEY_LAST_ACTIVITY` has five readers; deprecation is impossible without four screen migrations

Grep result (verified 2026-06-02):

| File | Line | Operation | Purpose |
|---|---|---|---|
| `apps/mobile/src/screens/ActivityPickerScreen.js` | 26 | `setLastActivity(activityId)` | Per-search recall — writes on every picker confirmation |
| `apps/mobile/src/screens/YouScreen.js` | 49 | `getLastActivity() ?? 'wedding'` | Display in "Default activity" Row (current implementation silently invents `wedding`) |
| `apps/mobile/src/screens/NoViableScreen.js` | 40 | `getLastActivity() ?? 'wedding'` | Implicit current-context fallback |
| `apps/mobile/src/screens/MomentDetailScreen.js` | 51, 157 | `getLastActivity() ?? 'wedding'` | Implicit current-context fallback |
| `apps/mobile/src/screens/CalendarScreen.js` | 163, 279 | `getLastActivity() ?? 'wedding'` | Implicit current-context fallback |

`KEY_LAST_ACTIVITY` serves a **different semantic** from `KEY_DEFAULT_ACTIVITY`: per-search context mirror vs explicit user preference. **Keep both keys.** Downstream screens 3/4/5 above silently invent `'wedding'` — that's a real EC-12 surface, but cleaning it up across all four screens is **out of scope for this feature** (see §11). They stay on `getLastActivity() ?? 'wedding'` for now; the activity-preference work doesn't touch them.

---

## 3. Layer 1 — Storage & reactive state

### Files to create

- `apps/mobile/src/lib/activity-preference.ts` — module + hook
- `apps/mobile/src/lib/activities.ts` — canonical display data (see §5)

### Storage key

```
inceptio.default_activity → string value (Activity enum member: 'wedding' | 'contracts' | 'business_launch' | 'travel')
```

Per-key string convention matches existing `KEY_LAST_ACTIVITY`, `KEY_DEVICE_ID`, etc. Not JSON. No settings blob. Persisted via the existing `storage` wrapper from `apps/mobile/src/lib/storage.ts`.

### Hard-decision #1 (state mechanism) — RESOLVED

**`useSyncExternalStore` module pattern, not Context, not Zustand.**

Rationale (changed from brainstorm's initial Context lean after code-archaeology Finding C + technical-correctness review):

- TanStack Query already handles cross-screen broadcasting for `useDailyNote` — when the queryKey changes, all subscribed components refetch. We don't need Context to *broadcast*; we need the hook's input to be *reactive*.
- `useSyncExternalStore` is the proper modern React pattern for external stores, not a hack. Documented in React docs as the supported escape hatch for non-React state.
- ~20 lines vs Context infrastructure — less boilerplate, no new app-level pattern.
- Migration path to Context (when D18 threshold of 3+ preferences is reached) is mechanical: replace the module's listener set with a Context, keep the hook signature identical. Consumer churn near zero.

### Module shape (locked)

```ts
// apps/mobile/src/lib/activity-preference.ts
import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import { ActivitySchema, type Activity } from '@inceptio/shared-types';

const KEY_DEFAULT_ACTIVITY = 'inceptio.default_activity';

type HydrationStatus = 'loading' | 'unset' | 'set';

let hydrationStatus: HydrationStatus = 'loading';
let current: Activity | undefined = undefined;
const listeners = new Set<() => void>();

/**
 * Forward-looking migration map. Empty for MVP — the 4 current activities have
 * no historical renames. When a future release renames an activity (e.g. v1.4
 * splits surgery → medical_procedure), add the old stored name as a key here
 * mapping to the new canonical Activity enum value. initActivityPreference
 * routes raw values through migrateOrInvalid (try schema → try map → undefined)
 * and persists the migrated canonical name back to storage so subsequent boots
 * read it directly. EC-6 below references this insurance.
 */
export const ACTIVITY_MIGRATIONS: Record<string, Activity> = {};

export function migrateOrInvalid(raw: string | undefined): Activity | undefined {
  if (raw === undefined || raw === '') return undefined;
  const parsed = ActivitySchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const migrated = ACTIVITY_MIGRATIONS[raw];
  return migrated;
}

/** Called once during app boot, after storage.hydrate() resolves. Idempotent. */
export function initActivityPreference(): void {
  if (hydrationStatus !== 'loading') return;
  const raw = storage.getString(KEY_DEFAULT_ACTIVITY);
  const migrated = migrateOrInvalid(raw);
  if (migrated !== undefined) {
    current = migrated;
    hydrationStatus = 'set';
    // Persist the migrated canonical name only when it differs from raw.
    if (raw !== migrated) storage.set(KEY_DEFAULT_ACTIVITY, migrated);
  } else {
    if (raw !== undefined) {
      console.warn('[activity-pref] invalid stored value, resetting to unset:', raw);
      storage.delete(KEY_DEFAULT_ACTIVITY);
    }
    current = undefined;
    hydrationStatus = 'unset';
  }
  listeners.forEach((fn) => fn());
}

export function setDefaultActivity(activity: Activity): void {
  const parsed = ActivitySchema.safeParse(activity);
  if (!parsed.success) {
    console.warn('[activity-pref] refused invalid set():', activity);
    return;
  }
  current = parsed.data;
  hydrationStatus = 'set';
  storage.set(KEY_DEFAULT_ACTIVITY, parsed.data);
  listeners.forEach((fn) => fn());
}

export function getDefaultActivitySync(): Activity | undefined {
  return current;
}

type Snapshot = { hydrationStatus: HydrationStatus; activity: Activity | undefined };

/**
 * Cached snapshot so useSyncExternalStore.getSnapshot returns a stable
 * reference between unrelated re-renders. Invalidated only when state changes.
 */
let snapshot: Snapshot = { hydrationStatus, activity: current };
function getSnapshot(): Snapshot {
  if (snapshot.hydrationStatus !== hydrationStatus || snapshot.activity !== current) {
    snapshot = { hydrationStatus, activity: current };
  }
  return snapshot;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useActivityPreference(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

### Hard-decision #2 (hydration status as trinary, not boolean) — RESOLVED

**`hydrationStatus: 'loading' | 'unset' | 'set'` — three states, never boolean.**

- `'loading'` — storage not yet read. UI MUST render splash/loading, NOT a visual default. Showing "Wedding" here misleads the user into thinking they have a selection when they don't.
- `'unset'` — storage read, no value found (first install, or value was invalid and got purged). UI MUST render the first-launch activity picker (see §4) or, if first launch is past, the Settings row's "Not set" state.
- `'set'` — storage read, `activity` is a valid `Activity` enum member. UI renders normally.

Consumer pattern (locked):

```ts
const { hydrationStatus, activity } = useActivityPreference();
if (hydrationStatus === 'loading') return <Splash />;
if (hydrationStatus === 'unset') return <FirstLaunchActivityPicker />;
// hydrationStatus === 'set' → activity is guaranteed defined
return <Today activity={activity!} />;
```

Anywhere in the spec that says "no activity set" or "first launch" refers to `hydrationStatus === 'unset'`. Anywhere that says "before storage hydration" refers to `hydrationStatus === 'loading'`.

### Boot wiring

`initActivityPreference()` MUST be called in `App.js` **after** `hydrateStorage()` resolves (existing gate at `App.js:103-108`) and **before** the first screen renders. Idempotent — multiple calls during dev hot-reload are safe.

```jsx
// App.js (sketch)
useEffect(() => {
  hydrateStorage().then(() => {
    initActivityPreference();
    setStorageReady(true);
  });
}, []);
```

### Re-render & subscription guarantees

- A `setDefaultActivity()` call notifies every consumer of `useActivityPreference()` synchronously. Order of `listeners` notification is insertion order (set semantics, guaranteed by JS spec).
- `getSnapshot` returns a cached reference — re-renders unrelated to activity preference do NOT cause unnecessary re-renders of consumers (React `useSyncExternalStore` compares snapshot references with `Object.is`).
- The listener set lives at module scope. Unmounting a consumer correctly removes its listener via the returned cleanup function from `subscribe`.

---

## 4. Layer 2 — First-launch picker + Onboarding integration

### Files to create

- `apps/mobile/src/screens/FirstLaunchActivityPicker.js` — new screen
- `apps/mobile/src/components/ActivityOption.js` — thin selection component (NOT extracted from `ActivityPickerScreen.js`)

### Hard-decision #3 (component for selection UI) — RESOLVED

**Build a thin new `ActivityOption` component. Do NOT extract the `Card` from `ActivityPickerScreen.js`.**

Rationale: `ActivityPickerScreen.js`'s `Card` is inline-private and tightly coupled to the per-search picker flow (handles draft mutation, navigation to `'date'`). Extracting it would touch a shipping flow and require regression testing of the New Search modal stack. The first-launch picker and Settings change-mode picker are different use cases (write to `setDefaultActivity()`, no draft mutation, no navigation chain). A thin selection component for them is cheaper and safer than extraction.

`ActivityOption` props (locked):

```ts
type ActivityOptionProps = {
  activity: Activity;
  selected: boolean;
  onPress: (activity: Activity) => void;
};
```

Renders emoji + label + selection indicator. Reads label from `ACTIVITY_LABELS` in the canonical `lib/activities.ts` (§5). Selection visual uses `accent-primary` ring at 100% opacity for selected, 0% for unselected. Text color follows EC-9 (see §11) — `text-muted` minimum, never `text-subtle`.

### First-launch picker contract

Triggered when `useActivityPreference()` returns `hydrationStatus === 'unset'` on the first screen the app would otherwise render (Today). Shown as a **full-screen modal step**, NOT as a tab-navigated screen. No back button.

Layout (high level — full visual spec in design handoff to follow):

```
[Starfield background]

  Welcome to Inceptio

  What kind of moment would you like
  to find first?

  ⊙ Wedding
  ⊙ Contract
  ⊙ Business launch
  ⊙ Travel

  You can change this anytime in You → Settings.

  [Continue] (disabled until a selection is made)
```

On Continue:
1. `setDefaultActivity(selected)` — writes to storage + broadcasts.
2. Modal closes — Today screen renders normally with `activity` available from `useActivityPreference()`.

### Onboarding integration

Onboarding (`OnboardingScreen.js`) already exists per CLAUDE.md screen map (00 Welcome). The first-launch activity picker is a **new step inserted between Onboarding's welcome screen and Today**, not a modification of Onboarding itself.

Flow:

```
First-ever app launch:
  OnboardingScreen → FirstLaunchActivityPicker → Today

Subsequent launches with hydrationStatus === 'set':
  Today
```

If a user reinstalls the app (and `KEY_DEFAULT_ACTIVITY` is absent because storage was wiped), they re-see both Onboarding and FirstLaunchActivityPicker. This is correct behavior — fresh install = fresh setup.

If a user upgrades from a prior version that wrote `KEY_LAST_ACTIVITY` but never `KEY_DEFAULT_ACTIVITY` (the migration case — see §10), they DO see FirstLaunchActivityPicker on next launch, with the picker **preselecting** the value from `KEY_LAST_ACTIVITY` as a courtesy. They tap Continue to confirm (no silent overwrite).

### Hard-decision #4 (visual default during loading) — RESOLVED

**Pre-hydration: render `<Splash />`, NEVER a visual default activity.**

Showing "Wedding" highlighted before hydration completes implies the user has a selection when they don't. This was originally caught in the (b)-refinement discussion and is a binding UI rule:

- Pre-hydration (`'loading'`): splash.
- Unset (`'unset'`): first-launch picker (no preselect except in the migration case above).
- Set (`'set'`): normal UI.

The existing `App.js:103-108` storage hydration gate already shows a splash equivalent; the FirstLaunchActivityPicker layers on top of it via the `useActivityPreference()` consumer pattern from §3.

---

## 5. Layer 3 — Canonical display data + duplication collapse

### Files to create

- `apps/mobile/src/lib/activities.ts` — canonical activity display data

### Files to modify (import-path swap only, no logic change)

- `apps/mobile/src/components/daily-note/scaffold/activity-display.js` — re-export from `lib/activities.ts`, delete duplicate `ACTIVITY_NOUNS`
- `apps/mobile/src/components/daily-note/scaffold/NewWindowCard.js` — import path swap
- `apps/mobile/src/components/daily-note/scaffold/InWindowCard.js` — import path swap
- `apps/mobile/src/components/daily-note/scaffold/SavedRow.js` — import path swap
- `apps/mobile/src/screens/ActivityPickerScreen.js` — `CARDS` keeps inline visual styling, but the **labels** (`title`, `subtitle`) read from `ACTIVITY_LABELS` in `lib/activities.ts`

### Files NOT modified — intentional divergence (NOT a verify-in-sync contract)

- `workers/api-proxy/src/translations/dictionary/status-lines.ts:9-14` — Worker noun map holds **Title Case display nouns** (`Wedding`, `Contract`, `Launch`, `Travel`) used internally to compose status-line templates like `"{activity_noun} window — tomorrow."`. This spec's `lib/activities.ts` `ACTIVITY_NOUNS` is the **sentence-context** map (`wedding`, `contract`, `launch`, `journey`) used in user-facing eyebrow / scaffold prose like `"for your journey"`. The semantic shift `travel → 'journey'` is deliberate — it pairs with `OnboardingScreen.js`'s existing poetic copy (`"a wedding, a launch, a journey, a fresh page"`). **The two maps are NOT mirrors and NOT subject to a sync test** — they are two canonical sources for two distinct surfaces. A `lib/activities.ts` header comment documents this so future maintainers don't re-introduce a false parity test (the original plan included one; it was deleted in Task 1.4's resolution).

### Canonical shape (locked)

```ts
// apps/mobile/src/lib/activities.ts
import type { Activity } from '@inceptio/shared-types';

export const ACTIVITY_LABELS: Record<Activity, string> = {
  wedding: 'Wedding',
  contracts: 'Contract',
  business_launch: 'Business launch',
  travel: 'Travel',
};

export const ACTIVITY_NOUNS: Record<Activity, string> = {
  wedding: 'wedding',
  contracts: 'contract',
  business_launch: 'launch',
  travel: 'journey',
};

export const ACTIVITY_EMOJI: Record<Activity, string> = {
  wedding: '💍',
  contracts: '📝',
  business_launch: '🚀',
  travel: '🧭',
};

// Theme-token-bound tint and ring colors. NOT raw rgba.
// Per scaffold/activity-display.js's own pre-wire-in note about promoting
// rgba literals to semantic tokens before wire-in.
export const ACTIVITY_DISPLAY: Record<Activity, { tint: string; ring: string }> = {
  wedding:         { tint: 'bg-wedding-tint',  ring: 'border-wedding-ring' },
  contracts:       { tint: 'bg-contracts-tint', ring: 'border-contracts-ring' },
  business_launch: { tint: 'bg-launch-tint',   ring: 'border-launch-ring' },
  travel:          { tint: 'bg-travel-tint',   ring: 'border-travel-ring' },
};

export function getActivityNoun(activity: Activity): string {
  return ACTIVITY_NOUNS[activity];
}

export function getActivityLabel(activity: Activity): string {
  return ACTIVITY_LABELS[activity];
}
```

NativeWind tokens MUST be added to `apps/mobile/tailwind.config.js` and `apps/mobile/src/theme.js` semantic-token map. **Naming detail:** the underlying color entry in `tailwind.config.js` is the **bare color name** (e.g. `'wedding-tint': '#3D2A4A'`, `'wedding-ring': 'rgba(...)'`). Tailwind auto-generates the `bg-`/`border-` utility classes from those bare names — so `ACTIVITY_DISPLAY.wedding.tint = 'bg-wedding-tint'` is the consumed utility class, while the entry in `tailwind.config.js` is `'wedding-tint'` (no `bg-` prefix). Same for ring colors: `'wedding-ring'` in config → `border-wedding-ring` utility. Current scaffold uses raw rgba (`scaffold/activity-display.js` flagged this in its own comment); this spec's promotion to semantic tokens IS the scaffold's pre-wire-in cleanup.

### Migration sequencing (low-risk)

1. Write `lib/activities.ts` with the data above.
2. Add NativeWind tokens.
3. Update three scaffold consumers to import from `lib/activities.ts`.
4. Update `scaffold/activity-display.js` to re-export from `lib/activities.ts` (preserving its existing `ActivityPlate` component) — OR move `ActivityPlate` into `apps/mobile/src/components/ActivityPlate.js` and delete `scaffold/activity-display.js`. Decision deferred to planner — both are mechanical.
5. Update `ActivityPickerScreen.js` `CARDS` to read labels from `ACTIVITY_LABELS` (keeps inline `subtitle` text since subtitles are per-screen tone, not canonical).
6. Add unit test for Worker-mirror parity (see §9).

---

## 6. Layer 4 — Worker `/daily-note` route + `useDailyNote` queryKey

### Files to modify

- `workers/api-proxy/src/routes/daily-note.ts` (or wherever the route lives — to be located by planner) — accept `activity` query param
- `apps/mobile/src/lib/api.ts` — `getDailyNote()` signature += `activity`
- `apps/mobile/src/hooks/useDailyNote.ts` — queryKey += activity, reactive read

### Hard-decision #5 (Worker route migration) — RESOLVED, phased

**Two-phase migration. Mobile rolls out before Worker tightens.**

**Phase A (deploys first, ships in same release as mobile change):**
- Worker accepts `?activity=` as **optional**.
- When absent: log `console.warn('[daily-note] activity missing, defaulting to business_launch')` and proceed with `business_launch` as fallback. Choice of `business_launch` is arbitrary — any of the 4 would work; this matches the existing translation-layer fallback convention. The fallback exists ONLY for backward compatibility with mobile clients on the previous version that don't send activity yet.
- When present: validate against `ActivitySchema` (Zod). Invalid value → 400 with `{ error: 'invalid_activity', valid: [...] }`.
- Cache key includes `activity` regardless of which path was taken (the fallback caches as `business_launch`).

**Phase B (deploys after mobile rollout reaches ≥95% of active devices):**
- `?activity=` becomes **required**.
- Missing → 400 with `{ error: 'missing_activity' }`.
- Fallback removed.

**Monitoring point between phases:** Worker `console.warn('[daily-note] activity missing, ...')` count over 7 rolling days. When that count is consistently < 0.5% of total `/daily-note` requests for at least 3 consecutive days, Phase B is safe to deploy. Until then, hold.

### `useDailyNote` queryKey change (locked)

```ts
// apps/mobile/src/hooks/useDailyNote.ts (sketch)
const { hydrationStatus, activity } = useActivityPreference();
// Hook MUST read activity reactively. Do NOT useMemo with empty deps.

const enabled = hydrationStatus === 'set' && activity !== undefined && !!location;

useQuery({
  queryKey: ['daily-note', round2(lat), round2(lng), tz, todayIsoDate, activity],
  queryFn: () => getDailyNote({ lat, lng, tz, activity: activity! }),
  staleTime: Infinity,
  gcTime: 1000 * 60 * 60 * 24,
  enabled,
});
```

- `enabled` gates on `hydrationStatus === 'set'` AND `activity` defined AND location present. While loading or unset, no fetch fires — the consumer hierarchy upstream (FirstLaunchActivityPicker, Splash) handles those states.
- queryKey position of `activity` is **last** to keep existing date-rollover behavior intact (date change still creates a new key; activity change creates a new key independently).
- When the user changes their default in Settings, `useActivityPreference()` re-renders Today, the new `activity` lands in the queryKey, and TanStack Query auto-fetches with the new value. **No imperative invalidation needed.**
- Existing global `staleTime: Infinity` + `gcTime: 24h` cache policy is preserved — when the user switches activity and switches back within 24h, cached data is served immediately.
- **Implementation note (do NOT wrap queryKey in `useMemo`).** The queryKey array is rebuilt every render; this is fine — TanStack Query hashes the array contents and only refetches on actual content change (`@tanstack/react-query` v5.x semantic). Wrapping it in `useMemo` with explicit deps creates a footgun: a missing dep (e.g. forgetting to add `activity`) would silently lock the key to a stale activity. The existing `useDailyNote.ts` does NOT memo its queryKey; preserve that pattern.

### Worker cache key change

The Worker's KV cache key currently uses `(lat, lng, tz, date)` (or similar — exact form to be confirmed by planner against Worker source). Adding `activity` to the key is mandatory in Phase A — without it, cache poisoning across activities is possible (user A's wedding response served to user B asking for travel on same coords/date).

Phase A cache key: `dn:v3:{lat}:{lng}:{tz}:{date}:{activity}` (where `:v3` is the existing library version namespace). When Phase A's fallback path is taken (activity absent), the entry is cached as `:business_launch`. Phase B never takes the fallback path.

### `lib/api.ts` signature change

```ts
// Before
export function getDailyNote(args: { lat: number; lng: number; tz: string }): Promise<DailyNote>;

// After
export function getDailyNote(args: { lat: number; lng: number; tz: string; activity: Activity }): Promise<DailyNote>;
```

Callers in scope: only `useDailyNote.ts`. No other code calls `getDailyNote()` today. Planner verifies via grep.

---

## 7. Layer 5 — Daily-note voice activation (eyebrow + severity-hint slot)

### Eyebrow + tappable activity-line (three-tier hierarchy)

The daily-note hero renders a **three-tier hierarchy** above the headline:

```
Tuesday, 2 June                  ← eyebrow (date only, text-muted)
for your wedding  ›              ← activity-line (secondary, TAPPABLE, opens ActivityChangeSheet)
A tender day for beginnings.     ← headline
Venus is warm and dignified.     ← body
[For a wedding, …]               ← optional severity-hint slot (asymmetric conditions only)
```

**Eyebrow** stays date-only — `formatDailyEyebrow(dateIso)`, rendered in `text-muted`. No inline activity append.

**Activity-line** is a separate, tappable affordance below the eyebrow. It reads the current default activity from `useActivityPreference()` and renders the matching phrase from `ACTIVITY_EYEBROW_PHRASES` in `lib/activities.ts` (canonical map). A right-arrow chevron (`›`) signals the tap affordance. Tapping opens `ActivityChangeSheet` (shared with FirstLaunchActivityPicker and YouScreen Default activity Row) in change mode; selecting a different activity calls `setDefaultActivity(next)` and the change broadcasts via `useActivityPreference` subscription — Today re-fetches with the new activity in the queryKey (§6), the line updates, the sheet dismisses.

`ACTIVITY_EYEBROW_PHRASES` is canonical in `lib/activities.ts` with launching draft phrases (`'for your wedding'`, `'for your contracts'`, `'for your launch'`, `'for your travels'`). Voice spec §3.5 owns the final copy — when voice spec ships a revision, update both surfaces in a coordinated PR (same verify-in-sync discipline as the Worker translation dictionary).

**Accessibility (locked):**
- `accessibilityRole="button"`.
- `accessibilityLabel="Change activity, currently <ACTIVITY_LABELS[activity]>"` (e.g. "Change activity, currently Wedding").
- Touch target ≥ 44pt — via `minHeight: 44` and/or `hitSlop`.

**Activity-line is rendered IFF `hydrationStatus === 'set'`.** During `'loading'` the splash is shown (gate cascade per §3 + §4); during `'unset'` the FirstLaunchActivityPicker is shown (also per §4). Today + the activity-line render only when an explicit preference exists.

**This is NOT a severity hint** — the activity-line is a constant frame, agnostic of sky condition.

### Severity-hint slot (D3 rescue)

For the three high-asymmetry sky conditions — Venus retrograde, Mercury retrograde, Moon void-of-course — the daily-note's body composition gains an **optional one-line severity hint** that varies by activity. The base sentence stays activity-agnostic.

**Composition (locked):**

```
[ Headline (activity-agnostic, e.g. "The Moon is between signs today.") ]
[ Body (activity-agnostic, e.g. "Efforts begun now don't take root the way they do on other days.") ]
[ Severity hint slot — RENDERED IFF the headline-driving condition is Venus Rx, Mercury Rx, or Moon VOC AND activity is set ]
```

**Component change:** the existing daily-note body component takes a new optional prop `severityHint?: string`. When provided, renders as a third line in the body in `text-muted` (NOT `text-subtle` — see EC-9). When absent, no second line.

**Where the string comes from:** the Worker's daily-note pipeline. The Worker already knows which sky condition is driving the headline (it composes the closed/mixed/strong bucket and selects an entry). When the entry is in one of the 3 asymmetric conditions, the Worker reads `activity` from the request (Phase A: from `?activity=`, Phase B: same) and picks the corresponding severity-hint string from the voice spec §12.4 table. The Worker returns this in the `displayable` response payload alongside the headline and body.

**The strings (12 confirmed + 4 pending = 16) live in `workers/api-proxy/src/translations/dictionary/`** — a new file `severity-hints.ts` keyed by `(condition, activity) → string`. Source-of-truth content is in voice spec §12.4 (this spec references that table; the Worker file mirrors it with the same verify-in-sync discipline as `status-lines.ts`). The 4 intraday Moon VOC strings (Entry 12) ship in the same dictionary but their inclusion in the asymmetry layer is itself flagged for astrologer ruling — until ruled in, the Worker MAY render Entry 12 without a severity_hint (legacy two-line composition).

### What stays activity-agnostic in voice

~18 of 21 entries in the voice library §3.3. All `closed-*` entries other than `closed-moon-voc`. All `strong-*` entries. Most `mixed-*` entries except those whose headline condition is Venus Rx, Mercury Rx, or Moon VOC. The voice spec's §12.4 amendment enumerates which voice-library entries gain the hint slot.

### Drift telemetry (D11)

When the Worker composes a daily-note response and the headline condition is one of the 3 asymmetric conditions AND `activity` was Phase-A-fallback-defaulted, log:

```
console.warn('[daily-note] severity-hint composed with fallback activity:', {
  date, condition, requested_activity: undefined, fallback_activity: 'business_launch'
});
```

This makes Phase A's drift surface observable from Worker logs. When Phase B ships, this log path is unreachable (request would 400 before reaching composition).

---

## 8. Layer 6 — Settings row in You tab

### Files to modify

- `apps/mobile/src/screens/YouScreen.js`
- Possibly: `apps/mobile/src/screens/ActivityChangeSheet.js` (or modal) — new screen for in-Settings activity change

### Current state (verified)

`YouScreen.js:148-150` already has a "Default activity" Row with `onPress = comingSoon` and `detail = getLastActivity() ?? 'wedding'`. The UI shell exists; this feature rewires it.

### Changes (locked)

1. Replace `getLastActivity() ?? 'wedding'` read with:
   ```ts
   const { hydrationStatus, activity } = useActivityPreference();
   const detail = hydrationStatus === 'set'
     ? getActivityLabel(activity!)
     : hydrationStatus === 'unset'
       ? 'Not set'
       : '...'; // 'loading' — brief, unlikely to render given hydration gate at app boot
   ```
2. Replace `onPress = comingSoon` with a handler that opens the change sheet (or navigates to it).
3. Row's `detail` text continues to use `text-muted` (already does — `Row` at YouScreen.js:230-235). Row's `hint` prop (rendered in `text-subtle` at line 226) is NOT used for the activity row in this feature. If a hint copy is added in future, it must use `text-muted` per EC-9.

### Activity change sheet

When the user taps the Default activity Row, present a bottom sheet (or full-screen modal — planner's call) with 4 `ActivityOption` rows. Current default is preselected. Tapping a different option calls `setDefaultActivity(newActivity)` and dismisses. Tapping the current activity is a no-op (no write).

No confirmation step. The action is reversible (user can change again immediately).

### `tick`-bump pattern — preserve, do not remove

The existing tick state at `YouScreen.js:46-47` and `:62` is used for **Reset operations** (clearing saved moments, resetting device id). It is NOT activity-specific. **This feature does not remove or modify tick-bump.** It only replaces the `getLastActivity() ?? 'wedding'` read on line 49 with the `useActivityPreference()` consumer pattern above. Tick continues to drive re-fetches of device id and re-renders of other Row values.

---

## 9. Layer 7 — Tests + verify-in-sync contracts

### Unit tests to write

- `apps/mobile/src/lib/__tests__/activity-preference.test.ts`
  - `initActivityPreference` from clean storage → `hydrationStatus === 'unset'`
  - `initActivityPreference` from valid stored value → `hydrationStatus === 'set'`, `activity === stored`
  - `initActivityPreference` from invalid stored value → `hydrationStatus === 'unset'`, storage purged, `console.warn` fired
  - `setDefaultActivity('wedding')` → notifies listeners, writes to storage, snapshot updates
  - `setDefaultActivity('not_a_real_activity' as any)` → refused, `console.warn` fired, state unchanged
  - `useActivityPreference()` snapshot identity stable across unrelated re-renders
  - `useActivityPreference()` snapshot updates on `setDefaultActivity()`
  - Multiple `initActivityPreference()` calls — idempotent (no double notification)

- `apps/mobile/src/lib/__tests__/activities.test.ts`
  - `ACTIVITY_LABELS`, `ACTIVITY_NOUNS`, `ACTIVITY_EMOJI`, `ACTIVITY_DISPLAY` have entries for all 4 MVP activities, no extras.
  - `getActivityNoun` and `getActivityLabel` return correct values.

- ~~`apps/mobile/src/__tests__/worker-mirror-parity.test.ts`~~ — **REMOVED 2026-06-02 in Task 1.4 resolution.** Original plan assumed mobile and Worker `ACTIVITY_NOUNS` were byte-mirrors; investigation surfaced they are semantically distinct concepts (sentence-context lowercase nouns vs Title Case status-line display nouns, `travel → 'journey'` vs `'Travel'`). The intentional divergence is documented in `lib/activities.ts` header comment and §5 above; no sync test exists, and CI does NOT gate on cross-map parity.

### Worker tests

- `workers/api-proxy/src/routes/__tests__/daily-note-activity.test.ts`
  - Phase A: request without `?activity=` → 200, `console.warn` fired, cache entry stored under `business_launch`.
  - Phase A: request with valid `?activity=wedding` → 200, no warn, cache entry under `wedding`.
  - Phase A: request with `?activity=not_an_activity` → 400 with `invalid_activity` error.
  - Phase B equivalents: missing `activity` → 400 `missing_activity`. (Phase B test is written but `it.skip()`-gated until Phase B cutover.)
  - Severity-hint composition: a request with `activity=wedding` on a synthetic Venus-Rx fixture day surfaces the wedding-specific Venus-Rx hint string in the `displayable` payload.
  - Severity-hint composition: a request with `activity=travel` on the same fixture day surfaces the travel-specific (tolerant) Venus-Rx hint string.

### Worker translation-layer tests (extend existing)

`workers/api-proxy/src/translations/__tests__/severity-hints.test.ts` (NEW):
- 12 confirmed entries exist (3 conditions × 4 activities for day-dominant Venus Rx, Mercury Rx, Moon VOC).
- 4 pending entries (intraday Moon VOC × 4 activities for Entry 12) exist with a `pending_astrologer_ruling: true` marker — test asserts they are flagged, not that they ship enabled by default.
- Each entry passes the existing voice-spec lint (forbidden-words check from voice spec §9).
- Each entry is ≤140 chars (matches `supporting_line` budget from voice spec §3.1).
- Snapshot tests for each entry against fixed expected output.

### Golden-file daily-note fixtures (extend existing)

Add `activity=wedding` and `activity=travel` variants to the existing golden-file fixtures for the daily-note pipeline. Verify the same upstream `/electional/search` mock produces:
- Identical headline + body for activities NOT in the 3 asymmetric conditions.
- Different severity hints for activities IN the 3 asymmetric conditions.

---

## 10. Layer 8 — `KEY_LAST_ACTIVITY` vs `KEY_DEFAULT_ACTIVITY` — drift semantics

### Decision (locked)

**Two keys with non-overlapping semantics. Both kept.**

- `KEY_DEFAULT_ACTIVITY` = `inceptio.default_activity` — explicit user preference, persistent. NEW. Set only by `setDefaultActivity()` from FirstLaunchActivityPicker or the Settings change sheet.
- `KEY_LAST_ACTIVITY` = `inceptio.last_activity` — implicit per-search mirror, persistent. EXISTING. Set by `ActivityPickerScreen.js:26` on every search confirmation. Read by 4 downstream screens as "current context fallback."

### Drift detection rules (locked)

When BOTH keys are set, four combinations are possible:

| `default_activity` | `last_activity` | Interpretation | Action |
|---|---|---|---|
| `X` | `X` | User's default matches their most recent search | None — normal state |
| `X` | `Y` (≠ X) | User has a default but ran a one-off search with a different activity | None — intentional per-search override is supported behavior |
| `undefined` | `Z` | User never set an explicit default but has prior search history | First-launch picker MAY preselect `Z` as a courtesy (see §4). NEVER silently treat `Z` as the default — silent overwrite would set an explicit preference the user never made. |
| `undefined` | `undefined` | True first install | Show first-launch picker with no preselection |

**Telemetry:**

- When `default_activity === undefined` and `last_activity` is defined, `console.warn('[activity-pref] migration candidate: last_activity=<value>')` on first read at boot. Helps measure how many users hit the migration courtesy path.
- No drift warning is logged for `default !== last` — that's a supported state, not drift.

### Migration scenario (binary, simple)

There is no schema migration to write. The key shape is identical (both are `Activity` enum strings). Migration is purely a UI courtesy: FirstLaunchActivityPicker preselects from `KEY_LAST_ACTIVITY` if available. User confirms by tapping Continue. If they pick a different option, that becomes their `KEY_DEFAULT_ACTIVITY`. Either way, an explicit write occurs.

### Downstream screen behavior — UNTOUCHED

`NoViableScreen.js`, `MomentDetailScreen.js`, `CalendarScreen.js` continue reading `getLastActivity() ?? 'wedding'`. They do NOT read `getDefaultActivity()`. Rationale: these screens render search results that came from a specific search, and `last_activity` is the right context mirror for "what activity was this search for." Promoting them to read `default_activity` would actually be wrong (the user could have searched for travel while their default is wedding — those screens should reflect what they searched, not what they prefer).

The `?? 'wedding'` silent fallback in these three screens is EC-12 territory (silent default invention) but **out of scope for this feature**. Flagged for separate cleanup.

---

## 11. Layer 9 — Edge cases (EC-1 through EC-13)

### EC-1 — Hydration race (first launch, storage not yet read)

Pre-hydration, `hydrationStatus === 'loading'`. UI MUST render `<Splash />`. Covered in §3 (Hard-decision #2) and §4 (Hard-decision #4). Test: `initActivityPreference` not yet called → `useActivityPreference()` returns `{ hydrationStatus: 'loading', activity: undefined }`.

### EC-2 — Migration from prior install (only `KEY_LAST_ACTIVITY` exists)

FirstLaunchActivityPicker preselects from `KEY_LAST_ACTIVITY`. User confirms or changes. Covered in §10 and §4 (Onboarding integration). NEVER silently overwrites.

### EC-3 — Activity subset invariant (4 MVP)

`ActivitySchema` from `@inceptio/shared-types` is the single source of truth for the 4 MVP activities. Domain-expert audit confirmed these are genuinely distinct elections in tradition (Dorotheus Bk V structures by matter), so backend behavior matches frontend expectations. Stored values are validated against `ActivitySchema.safeParse` on read; invalid values purged with a warn. Test: §9.

### EC-4 — User changes default mid-`useDailyNote`-fetch

Race: user is on Today, daily-note is mid-fetch with `activity=wedding`. User opens You, changes to `travel`, returns to Today. Because `useActivityPreference()` is reactive AND the queryKey is reactive (§6), the in-flight `wedding` query stays in-flight (TanStack Query default behavior — no abort), but the active subscription's queryKey is now `travel`, so a new query for `travel` fires. The component renders `travel` data once it arrives. The orphaned `wedding` query result is cached but never displayed in this session (it's still useful — user might switch back). No special handling required; TanStack Query semantics are sufficient.

### EC-5 — Default + per-search override

User's default is `wedding`. They open New Search and pick `business_launch` (`ActivityPickerScreen` writes `KEY_LAST_ACTIVITY = business_launch`). The Today screen continues to honor `default_activity = wedding` for the daily-note. The Calendar/MomentDetail/NoViable screens (which read `last_activity`) honor `business_launch` for that search's context. Drift table §10 row 2 — intentional, no warning. **Today does not switch to follow `last_activity`.** Default activity governs the daily-note framing; per-search activity governs results screens for that search.

### EC-6 — Corrupt or unknown stored value

`initActivityPreference` reads a raw value and routes it through `migrateOrInvalid` (try `ActivitySchema.safeParse` → try `ACTIVITY_MIGRATIONS` map → undefined). Three scenarios produce an undefined result: (a) older app version wrote an activity that has since been removed AND no migration entry covers it (none of the 4 MVP activities are deprecated — this case is theoretical until v1.4+; when the first rename ships, add the legacy name → canonical mapping to `ACTIVITY_MIGRATIONS` and existing installs migrate transparently), (b) storage corruption, (c) manual tampering during dev.

When the raw value migrates successfully (case-by-case future scenario), `initActivityPreference` persists the migrated canonical name back to storage so subsequent boots read it directly — see §3 module shape. No `console.warn` fires on a successful migration; it fires only on the unrecoverable-invalid path.

When `migrateOrInvalid` returns undefined: purge the bad value, set `hydrationStatus = 'unset'`, log `console.warn('[activity-pref] invalid stored value, resetting to unset:', raw)`. UI renders first-launch picker.

### EC-7 — Picker preselect during render race

FirstLaunchActivityPicker reads `KEY_LAST_ACTIVITY` for its preselect (§4 migration case). If `KEY_LAST_ACTIVITY` is set but `hydrationStatus` is still `'loading'`, the picker doesn't render yet (Splash does). After hydration, the picker reads `getLastActivity()` synchronously — by that point `storage` is hydrated, so the read is reliable.

### EC-8 — Deep link or external trigger sets activity

Not in scope for MVP. No deep link surface exists for setting `default_activity`. Flagged for future if deep linking is added.

### EC-9 — WCAG AA contrast — MUST, NOT SHOULD

Verified 2026-06-02 via WCAG luminance formula:

| Color combo | Ratio | Status |
|---|---|---|
| `text-subtle` (#7A7195) on `bg-deep` (#0F0A1F) | 3.49 : 1 | FAILS AA |
| `text-subtle` on `bg-surface` (#1F1838) | 3.25 : 1 | FAILS AA |
| `text-subtle` on `bg-elevated` (#2A2247) | 2.96 : 1 | FAILS AA |
| `text-muted` (#B8B0CC) on `bg-deep` | 8.13 : 1 | PASSES AA + AAA |
| `text-muted` on `bg-surface` | 7.56 : 1 | PASSES AA + AAA |

**Binding rule for this feature:** any preference-related label, value, or explanatory copy uses `text-muted` (#B8B0CC) minimum. `text-subtle` (#7A7195) is reserved for **decorative-only** text never required for comprehension or interactivity (e.g. visual rhythm fillers). The activity-row `detail` and the activity-row `hint` (if added later), the FirstLaunchActivityPicker option labels and helper text ("You can change this anytime in You → Settings."), and the change sheet helper text all use `text-muted` or `text` (#F5EFE4).

This was originally SHOULD in the brainstorm; promoted to MUST after code-archaeology verified the contrast failure is not theoretical.

### EC-10 — Worker fallback during Phase A

Phase A Worker accepts requests without `activity` and falls back to `business_launch`. The cache key embeds the fallback activity. When the same user upgrades their mobile app and starts sending `activity=wedding`, their next request misses the cache (correctly — different key) and warms a fresh entry. No corruption.

If a mobile app gets stuck on a pre-feature version forever, its responses will permanently be `business_launch`-flavored severity hints when the headline condition is asymmetric. Mitigation: Phase B (when ≥95% of clients are on the new version) hard-fails missing `activity`, forcing the stale client to fail loud — they'll see an error state, and the App Store update prompt resolves it.

### EC-11 — Drift between `default_activity` enum and `ActivitySchema`

If `ActivitySchema` is ever extended (e.g. when surgery, legal, agriculture activities ship in v1.4+), this feature's storage layer auto-accepts the new values without code change — `ActivitySchema.safeParse` is the only gate. UI components (FirstLaunchActivityPicker, ActivityChangeSheet) iterate `ACTIVITY_LABELS` (which is keyed on `Activity` type), so adding a new activity to `@inceptio/shared-types` AND `ACTIVITY_LABELS` simultaneously adds it to the picker.

If `ACTIVITY_LABELS` is extended but `ActivitySchema` is not (or vice versa), TypeScript catches it at compile time (the `Record<Activity, string>` mapped type enforces parity).

### EC-12 — Silent `'wedding'` fallback in downstream screens

Flagged for out-of-scope cleanup. See §10 last paragraph. Three screens (`NoViableScreen`, `MomentDetailScreen`, `CalendarScreen`) silently invent `'wedding'` when `getLastActivity()` returns null. Not touched by this feature. A separate cleanup should evaluate whether these screens should propagate explicit activity through props instead of falling back to storage.

### EC-13 — Telemetry baseline (no Sentry)

No error-reporting SDK is installed. All drift / fallback / invalid-value logs are `console.warn` with the `[activity-pref]` or `[daily-note]` bracketed namespace. When observability is added (future), promote these to tagged events with consistent property names already in use.

### EC-14 — Sync-cache storage write-success ordering (accepted residual risk)

> *Numbering note: an early brainstorm iteration referenced this as "EC-2 — flip to 'set' only after successful write." The spec's EC-2 ultimately captured "Migration from prior install" instead. This EC-14 carries the original brainstorm constraint forward with reconciled framing matched to the actual storage shape.*

**The original brainstorm constraint** assumed `storage.set()` was synchronously awaitable / throwing — i.e. that a failing persistent write could be detected before flipping `hydrationStatus` to `'set'`, and the in-memory state could be left at the prior value with the error surfaced.

**The actual `apps/mobile/src/lib/storage.ts` shape** is **sync-cache + async-flush, never throws sync**:

```ts
set(key: string, value: string): void {  // ← returns void, not Promise<void>
  cache.set(key, value);                                 // sync Map.set
  AsyncStorage.setItem(key, value).catch(() => {});      // async, errors swallowed
}
```

The function returns `void`, the in-memory `cache.set()` is synchronous and never throws under normal conditions, and the async AsyncStorage write swallows any I/O failure at the wrapper level. There is no synchronous failure signal available to `setDefaultActivity` callers.

**Implication for ordering.** `setDefaultActivity` (lib/activity-preference.ts:79-87) updates in-memory state (`current`, `hydrationStatus`, snapshot) FIRST, then calls `storage.set()`, then notifies listeners. This ordering is correct for the actual storage shape — write-first ordering would gain nothing (the write cannot fail synchronously, so there is no "failure" branch to gate on).

**Residual risk (accepted).** If the AsyncStorage async flush fails after `setDefaultActivity` returns (disk full, sandbox terminated mid-write, app force-quit milliseconds after setDefaultActivity), the in-memory cache is ahead of disk for the remainder of the session. The user reads the new value correctly during the session. On cold boot, the unsynced write is lost and the user reverts to either the previously-stored explicit preference or, if none, the first-launch picker.

**Why not worked around.** Three reasons:
1. **No synchronous signal.** `AsyncStorage.setItem`'s rejection is caught and discarded at the storage-wrapper level (`lib/storage.ts:45`). Capturing it would require a refactor of `setDefaultActivity` to `async` and propagating the change through every consumer (including `useActivityPreference`'s hook contract), which is out of proportion to the risk.
2. **Storage-wrapper convention.** All other consumers of `storage.set()` (draft-store, location-storage, device-id) operate under the same fire-and-forget contract. Introducing a different shape for activity-preference would diverge from the pattern.
3. **Risk magnitude is low.** AsyncStorage I/O failures on mobile are rare (the platform handles disk pressure via app suspension). The user-facing outcome is "select your activity again" on next boot — annoying but recoverable, not corrupting.

**The setDefaultActivity JSDoc** (activity-preference.ts:79-95) documents this residual risk inline so future maintainers do not interpret context-first ordering as a bug.

**Migration path if ever needed.** When the storage backend moves to `react-native-mmkv` v3+ on a dev-client build (per the comment in `lib/storage.ts:1-12`), `storage.set` becomes synchronous + throwing (MMKV's native write is sync). At that point, `setDefaultActivity` can adopt write-first ordering: `try { storage.set(...) } catch { return; } current = ...; hydrationStatus = 'set'; notify();`. A test "write failure does not flip to set" becomes meaningful then. Until then, this is accepted.

---

## 12. Out of scope (deliberately, with reasons)

1. **Migrating `NoViableScreen` / `MomentDetailScreen` / `CalendarScreen` away from `getLastActivity() ?? 'wedding'`.** Their use of `last_activity` is semantically correct (per-search context). The `?? 'wedding'` silent fallback is a real EC-12 surface but a separate cleanup. This feature does not change them.
2. **A generic `PreferencesProvider` / `PreferencesContext`.** D18 threshold (3+ preferences) is not met by this feature alone (we add 1). When the second and third preferences land (likely candidates: default location, notification time), the consolidation refactor is mechanical — `useActivityPreference()` becomes `usePreferences().activity`, consumer signatures stay constant.
3. **Deep link to set preference.** No deep link surface in MVP.
4. **Onboarding flow restructuring beyond the inserted FirstLaunchActivityPicker step.** Existing `OnboardingScreen.js` welcome content is untouched.
5. **Adding error-reporting SDK** (Sentry/Bugsnag). `console.warn` baseline only. This is a separate infrastructure decision.
6. **Reactive update of in-flight Worker response when activity changes.** TanStack Query's natural behavior (in-flight query continues, new query fires for new key) is sufficient. No imperative abort or invalidation needed.
7. **A24-month or longer search ranges for Pro tier.** Paywall is hidden in MVP (CLAUDE.md). Activity preference doesn't change range limits.
8. **Worker-side cache eviction for the pre-`activity`-keyed entries.** Phase A naturally migrates as cache TTL (7 days per CLAUDE.md) expires existing entries. No eviction script required.

---

## 13. Handoff to plan + checkpoints

### Three execution checkpoints

The planner MUST surface these as explicit `/plan-and-implement` review checkpoints:

**Checkpoint 1 — Architectural commitment (after §3 module + §5 canonical migration).**
Verify the `useSyncExternalStore` module pattern works end-to-end across at least two consumer screens (YouScreen + Today via useDailyNote) before building the rest. Confirm: hydration-status trinary renders correctly in all three states; canonical activity display data is the single source.

**Checkpoint 2 — Per-activity batch reality check (after §6 + §7 Worker route ships in Phase A).**
Real-data validation across the 4 MVP activities on a Venus-Rx fixture date (e.g. 2026-10-15). Verify the asymmetry-hint composition surfaces the 4 distinct severity hints (or absences thereof for travel-as-tolerant). This is the moment where the §12.4 split-sampling QA gate from the voice spec kicks in for the first time on real data. If the per-activity batch shows all 4 activities surfacing the same hint (i.e. asymmetry not actually wired), STOP and debug before continuing.

**Checkpoint 3 — Phase B Worker route migration cutover.**
The phased rollout has a natural pause point: Phase A is shipped, but Phase B (required `activity`) is deferred until rollout monitoring shows ≥95% of clients on the new version + < 0.5% Phase-A-fallback rate for 3 consecutive days. This checkpoint is calendar-driven, not code-driven. Planner schedules it as a follow-up PR with a target date informed by mobile rollout speed.

### Future work flagged but not scoped here

- Astrologer review of the 12 severity-hint strings (see voice spec §12.4 + §11.4 amendment). Booked alongside the existing astrologer review of the translation layer per CLAUDE.md. Timing: before launch.
- Postman re-verification on a Venus-Rx 2026 date to confirm astrology-api.io's per-activity `weight_class` actually encodes the asymmetry tradition predicts (domain-expert audit Open Question 1). If yes, severity hints auto-trigger via API weights. If no, the Worker's static hint table is authoritative.
- Consolidation of three downstream screens' `getLastActivity() ?? 'wedding'` fallback (EC-12).
- D18 threshold consolidation into a `PreferencesContext` when 3rd preference lands.

### Decision log (compressed)

| # | Decision | Resolution | Why |
|---|---|---|---|
| D1 | Add default activity as user-selectable preference | YES | Brainstorm scope. |
| D2 | Canonical `Activity` source | `@inceptio/shared-types` (existing) | Code-arch Finding A. No parallel module. |
| D3 | Activity-agnostic voice for sky state | REOPENED, rescued via Option 1 | Domain-expert audit. Base sentence agnostic + severity hint for 3 conditions × 4 activities = 12 confirmed (+ 4 pending for intraday Moon VOC). |
| D4 | Storage backend | AsyncStorage wrapper from `lib/storage.ts` | Code-arch Finding B. MMKV not installed. |
| D5 | Storage key shape | Single string per key, namespace `inceptio.<name>` | Existing convention. |
| D6 | Storage key name | `inceptio.default_activity` | New. Distinct from `KEY_LAST_ACTIVITY`. |
| D7 | State broadcasting mechanism | `useSyncExternalStore` module pattern | Code-arch Finding C + technical correctness. Not Context, not Zustand. |
| D8 | Hydration status | Trinary: `'loading' \| 'unset' \| 'set'`, NEVER boolean | UI clarity. |
| D9 | Reactive read in `useDailyNote` | Yes, hook returns reactive subscription | Code-arch Finding D. No useMemo with empty deps. |
| D10 | Telemetry SDK | None. `console.warn` baseline. | Code-arch Finding (no Sentry). |
| D11 | Drift telemetry payload | Bracketed namespace `[activity-pref]` / `[daily-note]` + structured object | `console.warn` convention. |
| D12 | Worker cache key | Includes `activity` | Cache poisoning prevention. |
| D13 | Worker route migration shape | Phase A optional + fallback, Phase B required | Backward-compat for mobile rollout. |
| D14 | Phase B cutover gate | Calendar-driven, ≥95% new-client rollout + < 0.5% fallback rate 3 days | Rollout discipline. |
| D15 | Severity-hint slot in daily-note body | Optional `severityHint?: string` prop, rendered as third line in `text-muted` | D3 rescue composition. |
| D15a | Today-tap → change activity (tappable activity-line + chevron) | YES — separate activity-line below eyebrow, `ActivityChangeSheet` shared with Settings + FirstLaunch, `ACTIVITY_EYEBROW_PHRASES` canonical | Restored from brainstorm intent per 2026-06-02 user review (Decision 1 Path B). Spec §7 was under-specified before this row; now explicit. |
| D16 | Severity-hint string source | Worker `severity-hints.ts` dictionary, mirrors voice spec §12.4 | Worker-side translation discipline. |
| D17 | Component for picker selection | Thin new `ActivityOption`, NOT extract from `ActivityPickerScreen` | Code-arch Finding (Card is inline-private). |
| D18 | When to consolidate to PreferencesContext | At 3+ preferences | Threshold rule. |
| D19 | Canonical activity display | `lib/activities.ts` consolidates scaffold + picker labels. Worker `status-lines.ts` stays separate — **intentionally divergent semantics** (sentence-context vs status-line display), NOT a verify-in-sync mirror. Original plan added a parity test; deleted in Task 1.4 resolution. | Code-arch Finding (3 sources); divergence surfaced empirically 2026-06-02. |
| D20 | Today screen mount discipline | Unchanged — unmounts on tab switch; TanStack cache survives | Code-arch Finding D. |
| D21 | `KEY_LAST_ACTIVITY` fate | KEEP — distinct semantic from `KEY_DEFAULT_ACTIVITY` | Code-arch Finding E. |
| D22 | This spec's file path | `docs/superpowers/specs/2026-06-02-activity-preference.md` | — |

---

*End of memo. Voice spec amendments at `docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md` §12.4 + §11.4 land in parallel with this memo.*
