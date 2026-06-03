# Location-timezone correctness — design memo

**Status:** Brainstorm output. Feeds into a subsequent `/plan-and-implement`.
**Date:** 2026-06-03
**Authoritative artifacts upstream of this memo:**
- Domain-expert KB section — `docs/superpowers/expert/_knowledge-base/astrology-electional.md` (heading: `"Updated 2026-06-03 — Timezone is load-bearing election input, not a presentation hint (EC-19 audit)"`)
- Pre-existing schema contract comment — `packages/shared-types/src/api/request.ts:26` (`"timezone is derived client-side from lat/lng via tz-lookup"` — schema already documents this as the intent; mobile-side gap is the defect)
- Inline TODO at `apps/mobile/src/lib/location-storage.ts:10` (`TODO: add 'tz-lookup' for per-location TZ`)
- Parked default-location brainstorm artifact (D1–D24 + EC-1..22) — to resume after this feature ships and bakes
- Project context — `CLAUDE.md`

---

## 1. Summary

Fix a **pre-existing correctness bug** in the shipping per-search location flow: `pickToSavedLocation` writes `timezone = deviceTimezone()` (the device's current IANA timezone), but the upstream electional API treats `timezone` as load-bearing input to the actual sky calculation via Swiss Ephemeris. A user in Berlin who picks Tokyo as their search location gets sky readings computed for **(lat=Tokyo, lng=Tokyo, tz=Berlin)** — an arbitrary mid-Pacific moment with no correspondence to either location's actual sky. Cross-tz users have been receiving **astronomically wrong content** since the per-search picker shipped.

The fix has two halves operating on different timescales:

1. **Worker-side authority (immediate, all users)** — Worker derives the effective tz from `(lat, lng)` and uses it for both the cache key and the upstream call, regardless of what the client sends. Correctness is independent of mobile rollout.
2. **Mobile-side hygiene (rolling, per device)** — `pickToSavedLocation` derives tz at write time; existing `last_location` entries are migrated at boot. Closes the client-state defect so `YouScreen` displays the correct tz and (when default-location resumes) the seed is clean.

**Scope decisions (signed off across the brainstorm):**

1. **Worker as tz authority.** `effectiveTz = tzLookup(lat, lng) ?? clientTz ?? 'UTC'`. Warn + bump KV counter on `(tzLookup non-null && clientTz !== tzLookup)`. **No Phase B hard-reject cutover** — the Worker's derive-authoritative model makes the activity Phase A/B reject pattern unnecessary. Simpler than activity, not heavier.
2. **Mobile write-side fix.** `pickToSavedLocation` (lifted from `LocationPickerScreen` to `lib/location-storage.ts` as canonical writer — also pre-stages D9 from the parked default-location brainstorm) derives `timezone = tzLookup(lat, lng) ?? deviceTimezone() ?? 'UTC'`.
3. **Migration of existing `inceptio.last_location` entries** — boot-time one-time rewrite at storage hydrate, gated by `inceptio.tz_migration_v1 = 'done'` flag. No rewrite-on-read belt-and-suspenders.
4. **Same `@photostructure/tz-lookup` library + version on both sides** (npm `@photostructure/tz-lookup`, ~72KB). `geo-tz` is explicitly forbidden (multi-MB shapefiles blow the Workers 1MB bundle limit). Phase 0 verifies Worker bundle size pre-deploy.
5. **Test pack reframed to prove correctness:** (a) Worker corrects + warns on mismatch input, (b) tz is load-bearing at upstream/unit level (direct astrology-api call OR unit test of calc), NOT through the corrected Worker path.
6. **Parked default-location brainstorm artifact preserved.** When this fix is deployed + baked, EC-19 from that brainstorm flips from "BLOCKING-pre-launch" to "inherited-correct via the prior tz fix" and the parked work resumes.
7. **CA-1 cleanup rides along:** `TodayScreen.js:9` references `04-daily-note-tour.yaml` which doesn't exist. Remove the orphaned reference but preserve the "dev-tool affordance, don't voice-fix" note for the letter prefixes.

---

## 2. Foundational findings (call out for the plan)

### Finding A — Case B confirmed: timezone is load-bearing electional input

Domain-expert audit (2026-06-03) verdict: **Case B applies.** astrology-api.io v3 uses Swiss Ephemeris + JPL. The upstream contract treats `{ hour, minute, latitude, longitude, timezone }` as a unit; `timezone` is interpreted as the tz of the chart reference moment. The Swiss Ephemeris dependency chain:

> tz → Julian Day in UT → Local Sidereal Time → Ascendant/house cusps → planetary positions → planetary-hour boundaries → void-of-course windows

A cross-tz `(lat, lng, tz)` tuple yields a sky for an arbitrary mid-Pacific moment with no correspondence to either the device's location or the picked location's actual sky. Cross-tz user experience: planetary hours shift by 7–8 hours, planet signs/houses/aspects can shift entirely, void-of-course windows fall on the wrong calendar times.

**Doctrinal corroboration:** Lilly, Bonatti, Dorotheus, Frawley all cast for the moment-and-place of the matter; pre-modern equivalent of IANA tz is the local-apparent-time meridian of the place. Doctrinally unambiguous.

**Highest-risk persona:** destination-wedding planners — the exact target audience CLAUDE.md positions Inceptio for.

KB section captures the full citation chain and serves as the authoritative reference for the test pack design.

### Finding B — Worker as tz authority is the elegant fix (not activity Phase A/B)

The activity feature used Phase A (optional + fallback + warn) → Phase B (required + 400) because the Worker had **no server-side source of truth** for the user's activity — only the client could know. The activity rolled out in phases to give mobile time to start sending the param.

**For tz, this disanalogy is the point.** `tz` is **server-derivable** from `(lat, lng)`. The Worker can ignore what the client sends and compute the right answer itself. Correctness is achievable for ALL users immediately on Worker deploy — no mobile rollout dependency, no cutover, no coordination window.

Phase WB (hard reject) is therefore **dropped entirely**. The Worker permanently uses `effectiveTz = tzLookup(lat, lng) ?? clientTz ?? 'UTC'`, warns + counters mismatches as observability, but never fails the request. Defense-in-depth: when the mobile fix lands too, the warns drop to ~0 and the system is fully consistent end-to-end.

### Finding C — Pre-existing per-search defect is broader than the picker

`saveLocation()` is called from `LocationPickerScreen.handleSelect:83-90` AND `handleContinue:153-161`, both with `timezone: deviceTimezone()`. Every search a cross-tz user has run since the per-search flow shipped has produced wrong-sky content. This is not a regression introduced by the parked default-location work — it's an inherited correctness bug that the default-location brainstorm SURFACED.

Closing it as a standalone correctness fix is the right discipline. The default-location work resumes on a clean foundation.

### Finding D — `@photostructure/tz-lookup` is not currently installed

Code-archaeology audit (2026-06-03) confirms no `tz-lookup`-family package is in `apps/mobile/package.json:12-39`. CLAUDE.md "Stack (locked)" lists `tz-lookup` (without the scope prefix) but the dependency was never installed. The `TODO: add 'tz-lookup'` at `location-storage.ts:10` has been outstanding since the file's first commit.

**Package choice — active fork over canonical**: the canonical `tz-lookup` on npm is API-correct but its IANA tz database has been frozen since ~2021. Multiple populated regions have had tz-DB changes since (Iran DST abolition 2022, Mexico DST abolition 2022, Pacific micronation reshuffles) — exactly the international/boundary places the destination-wedding persona visits. Shipping a tz-correctness fix on stale tz data is a contradiction. `@photostructure/tz-lookup` is a drop-in fork (literal same `tzlookup(lat, lng)` signature, same ~72KB bundle) with current data + active maintenance (v11.x as of 2026-06). Same call sites, same fallback behavior, no API rewrite.

`@photostructure/tz-lookup` npm package: pure JS, ~72KB, static dataset, recently-updated IANA DB, active maintenance. Works in both Node (Worker) and React Native (mobile). No native modules. Phase 0 installs it on both sides AND verifies Hermes/RN compatibility via a startup smoke (see Phase 0 details below).

### Finding E — Schema contract already documents the intent

`packages/shared-types/src/api/request.ts:26` already documents in a comment: *"timezone is derived client-side from lat/lng via tz-lookup."* The schema contract ASSUMES the fix; the implementation gap is the defect. This spec closes the gap; no schema changes needed.

---

## 3. Phase outline (5 phases, no Phase WB)

| Phase | Title | Scope | Gate |
|---|---|---|---|
| **0** | Foundational | Install `@photostructure/tz-lookup` on both sides. Lift `pickToSavedLocation` from `LocationPickerScreen` to `lib/location-storage.ts`. Verify Worker bundle size still < 1MB after dependency added. **Run Hermes/RN startup smoke** — import + call `tzLookup(35.68, 139.69)`, assert returns `'Asia/Tokyo'` on the actual RN runtime. No behavior change in production code (import-path swap only). | Tests green; bundle size check passes; **Hermes smoke passes**; no behavioral diff. |
| **1** | Mobile write-side correctness | `pickToSavedLocation` now computes `timezone = tzLookup(lat, lng) ?? deviceTimezone() ?? 'UTC'`. All new `saveLocation` calls write correct tz. Per-search regression smoke proves no UX regression. | Per-search smoke + unit test of helper. |
| **2** | Mobile migration of existing entries | Boot-time one-time rewrite at storage hydrate, gated by `inceptio.tz_migration_v1 = 'done'`. Idempotent. Skips entries where `tzLookup` returns null. | Migration unit test (pre-populate corrupt entry, boot, observe rewrite + flag). |
| **3** | Worker tz authority (deployable independently/first) | Worker derives `effectiveTz`, uses for cache key + upstream call. Warns + bumps `metrics:dn-tz-mismatch:{date}` KV counter. Admin endpoint extended to query mismatch rate (extends existing `/admin/activity-missing-rate` scaffolding from commit `868f9a8`). | Worker tests; staging deploy + synthetic-mismatch smoke proves warn fires + correction takes effect. |
| **4** | Deploy + bake + verification | Production deploy in suggested order: Worker (Phase 3) first for user-facing correctness; mobile (Phases 1-2) follows. Astrologer-review test pack runs against deployed Worker. | Mismatch counter trends to ~0 over rolling 7 days; astrologer test pack passes. THEN default-location brainstorm resumes. |

**Order rationale:** Phase 3 (Worker) deploys FIRST and INDEPENDENTLY because it grants immediate correctness to all users regardless of mobile rollout. Phases 1-2 are client-state hygiene (correct YouScreen display, clean future default_location seed) — they catch up at mobile rollout cadence.

---

## 4. Layer 1 — Phase 0: Foundational

### Files to modify
- `apps/mobile/package.json` — add `"tz-lookup": "^11.x"` (latest stable) to `dependencies`
- `workers/api-proxy/package.json` — add `"tz-lookup": "^11.x"` (SAME version pin as mobile per D8) to `dependencies`
- `apps/mobile/src/lib/location-storage.ts` — add `pickToSavedLocation` export (lifted from picker screen, unchanged behavior in this phase)
- `apps/mobile/src/screens/LocationPickerScreen.js` — delete inline `pickToSavedLocation`, import from `lib/location-storage`

### Hard-decision #1 (same library + version on both sides) — RESOLVED

`@photostructure/tz-lookup` (npm) is the only acceptable choice. Rationale: the canonical `tz-lookup` package shares the same API but its IANA DB is frozen ~2021 (Iran/Mexico DST abolitions 2022 + Pacific reshuffles all post-date the freeze); shipping a tz-correctness fix on stale data is a contradiction. `@photostructure/tz-lookup@^11.x` is API-compatible drop-in. `geo-tz` is **forbidden** — it bundles full Natural Earth shapefiles (multi-MB) which blow the Workers 1MB bundle limit. Other alternatives (`moment-timezone` for tz validation, `luxon` for tz conversions) are not coord-to-tz lookups and don't solve this problem.

**Version pinning:** the same major+minor version must be installed on both sides. tz-lookup's internal dataset changes between versions can shift boundary decisions for coordinates near tz lines (~10km strip). If Worker uses v6.1 and mobile uses v6.0, a coordinate near a boundary could resolve to different IANA names on each side, causing spurious mismatch warns + cache fragmentation (Worker caches under Worker's answer; mobile sends client's answer; future cache hit attempts miss).

Use `^11.x` pinning (caret-pin to minor) — npm + Wrangler will install the latest patch but won't auto-upgrade across minor boundaries. Periodic manual sync if either side bumps minor.

### Worker bundle size check

Run `cd workers/api-proxy && npx wrangler deploy --dry-run` (or equivalent) AFTER adding the dependency. Current bundle is ~few hundred KB; tz-lookup adds ~72KB. Total should be well under 1MB.

If size exceeds the limit (unlikely but defensive), abort Phase 0 and reopen brainstorm with smaller-library options or strategies (e.g., subset the tz-lookup dataset to only the timezones we care about, or use a Worker subrequest to a tz-resolution service).

### Hermes/RN smoke (GATE before Phase 1)

Neither the canonical `tz-lookup` nor `@photostructure/tz-lookup` officially certifies React Native / Hermes. Both are pure JS with no native modules, so they SHOULD work, but the ~72KB static dataset is a potential Hermes quirk point (large frozen data structures, lazy initialization patterns, etc.). Phase 0 includes a startup smoke that proves the package imports + functions correctly on the actual RN runtime BEFORE Phases 1-2 build anything on top of it.

Concrete smoke (add to `apps/mobile/src/lib/__tests__/`):

```ts
// apps/mobile/src/lib/__tests__/tz-lookup-smoke.test.ts
import { describe, it, expect } from 'vitest';
import tzLookup from '@photostructure/tz-lookup';

describe('@photostructure/tz-lookup — startup smoke', () => {
  it('imports + returns IANA tz for Tokyo coords', () => {
    expect(typeof tzLookup).toBe('function');
    expect(tzLookup(35.68, 139.69)).toBe('Asia/Tokyo');
  });

  it('returns Iran tz post-DST-abolition for Tehran coords', () => {
    // Validates the active fork's tz-DB is fresh (post-2022 Iran DST change).
    // Pre-2022 Iran observed DST → 'Asia/Tehran' might have been
    // 'Asia/Tehran' with DST transitions. Modern IANA encodes the change.
    expect(tzLookup(35.6892, 51.3890)).toBe('Asia/Tehran');
  });
});
```

If either assertion fails in the Vitest run (which uses the project's mobile testing infrastructure), Phase 0 fails the gate and the spec pivots to either (a) an alternative tz-resolution library, (b) a server-only architecture where mobile never calls tzLookup and Worker is the sole authority (drops Phases 1-2 mobile work entirely, leaves only Phase 3 + a thin Phase 0 mobile-side stub), or (c) ship the bug fix as Worker-only and defer mobile-side until tz-lookup-Hermes is sorted. Decision deferred to plan-stage IF the smoke fails. If it passes (expected outcome), proceed to Phase 1.

**Why this is a GATE, not a soft check:** the entire mobile half of this feature (Phases 1-2) depends on `tzLookup` working in production mobile builds. If it doesn't, building the migration + write-side fix is wasted work. Gating Phase 0 on the smoke prevents that waste.

### Lift `pickToSavedLocation` — exact change

**Currently (LocationPickerScreen.js:35-44):**
```js
function pickToSavedLocation(pick) {
  return {
    lat: pick.lat,
    lng: pick.lng,
    city: pick.city || pick.display_name.split(',')[0].trim(),
    country: pick.country ?? '',
    timezone: deviceTimezone(),
    selected_at: Math.floor(Date.now() / 1000),
  };
}
```

**Phase 0 result (lib/location-storage.ts new export, unchanged behavior):**
```ts
import type { NominatimResult } from './nominatim';

export function pickToSavedLocation(pick: NominatimResult): SavedLocation {
  return {
    lat: pick.lat,
    lng: pick.lng,
    city: pick.city || pick.display_name.split(',')[0].trim(),
    country: pick.country ?? '',
    timezone: deviceTimezone(), // ← STILL deviceTimezone in Phase 0. Phase 1 fixes.
    selected_at: Math.floor(Date.now() / 1000),
  };
}
```

LocationPickerScreen imports it. Phase 0 is import-path-swap only — zero behavioral change, fully testable as a no-op refactor.

---

## 5. Layer 2 — Phase 1: Mobile write-side correctness

### Files to modify
- `apps/mobile/src/lib/location-storage.ts` — fix `pickToSavedLocation` body
- `apps/mobile/src/lib/__tests__/location-storage.test.ts` — extend with cross-tz unit cases
- `apps/mobile/maestro/04-location-picker-regression.yaml` (NEW) — per-search regression smoke (sourced from parked default-location brainstorm §2.3, adapted)

### `pickToSavedLocation` fix

```ts
import tzLookup from '@photostructure/tz-lookup';

export function pickToSavedLocation(pick: NominatimResult): SavedLocation {
  // Derive timezone authoritatively from coordinates. Falls back to device tz
  // only when tz-lookup can't resolve (open ocean, polar, exotic coordinates).
  // deviceTimezone() is the historical fallback; we keep it as last-resort
  // because returning '' or null would break upstream calls.
  const derivedTz = tryTzLookup(pick.lat, pick.lng);
  return {
    lat: pick.lat,
    lng: pick.lng,
    city: pick.city || pick.display_name.split(',')[0].trim(),
    country: pick.country ?? '',
    timezone: derivedTz ?? deviceTimezone(),
    selected_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * tz-lookup throws on invalid coords. Wrap defensively.
 */
function tryTzLookup(lat: number, lng: number): string | null {
  try {
    return tzLookup(lat, lng);
  } catch (e) {
    console.warn('[location-storage] tzLookup failed for', lat, lng, e);
    return null;
  }
}
```

### `deviceTimezone()` status

KEEP. JSDoc updated:

```ts
/**
 * Device IANA timezone via Intl. Last-resort fallback when tzLookup cannot
 * resolve coordinates (open-ocean, polar). For all valid land coordinates,
 * pickToSavedLocation derives tz from lat/lng via tz-lookup and skips this.
 *
 * @deprecated as the primary timezone source. Kept as fallback only.
 */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}
```

### Per-search regression smoke

`apps/mobile/maestro/04-location-picker-regression.yaml` — exercises the per-search location flow + verifies the tz fix doesn't break navigation/UX. Smoke steps:

1. Launch app, navigate to LocationPicker
2. Type "Tokyo" in search → verify results
3. Tap "Tokyo, Japan" row → verify selected
4. Tap "Find moments" → verify navigation to Loading
5. After Loading completes, navigate back to LocationPicker → verify "Tokyo" prefilled in query

The smoke doesn't verify tz correctness (that's the unit test + astrologer pack); it verifies the lift + fix didn't regress navigation.

### Unit test additions

`apps/mobile/src/lib/__tests__/location-storage.test.ts` extensions:

```ts
describe('pickToSavedLocation — tz derivation', () => {
  it('derives Tokyo tz from Tokyo coordinates', () => {
    const result = pickToSavedLocation({
      place_id: 1,
      lat: 35.68,
      lng: 139.69,
      display_name: 'Tokyo, Japan',
      city: 'Tokyo',
      country: 'Japan',
    });
    expect(result.timezone).toBe('Asia/Tokyo');
  });

  it('derives America/New_York from NYC coordinates', () => {
    const result = pickToSavedLocation({/* NYC */});
    expect(result.timezone).toBe('America/New_York');
  });

  it('falls back to deviceTimezone when tzLookup throws', () => {
    // Use a coordinate that tz-lookup rejects (e.g. extreme south pole)
    const result = pickToSavedLocation({/* polar */});
    expect(result.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});
```

---

## 6. Layer 3 — Phase 2: Mobile migration of existing entries

### Files to modify
- `apps/mobile/src/lib/location-storage.ts` — add `migrateLocationTimezones_v1()` migration function
- `apps/mobile/App.js` — call `migrateLocationTimezones_v1()` inside the existing `hydrateStorage().then(...)` effect, alongside `initActivityPreference()`
- `apps/mobile/src/lib/__tests__/location-storage.test.ts` — extend with migration test cases

### Migration function

```ts
const MIGRATION_FLAG_KEY = 'inceptio.tz_migration_v1';

/**
 * One-time rewrite of legacy last_location.timezone values from deviceTimezone()
 * (the historical broken default) to tzLookup(lat, lng) (the correct value).
 *
 * Idempotent — guarded by a version flag so subsequent boots are no-ops.
 *
 * Run during App.js storage hydrate effect, BEFORE setStorageReady(true), so
 * that any consumer reading getLastLocation() during the first post-migration
 * render sees the corrected value.
 *
 * Failure modes (all handled, none throw):
 *   - last_location absent → no-op, flag still set
 *   - last_location JSON corrupt → no-op, flag still set (defensive parse handles future reads)
 *   - tzLookup returns null (ocean coords) → leave existing tz, flag still set,
 *     log warn (user can re-pick to fix)
 *   - storage.set fails async → in-memory cache has the correct value for the
 *     current session; on next boot the migration runs again (flag wasn't durably
 *     written due to the same failure)
 */
export function migrateLocationTimezones_v1(): void {
  if (storage.getString(MIGRATION_FLAG_KEY) === 'done') return;

  const raw = storage.getString(KEY); // KEY = 'inceptio.last_location'
  if (raw) {
    try {
      const loc = JSON.parse(raw) as Partial<SavedLocation>;
      if (
        typeof loc.lat === 'number' &&
        typeof loc.lng === 'number' &&
        typeof loc.city === 'string'
      ) {
        const correct = tryTzLookup(loc.lat, loc.lng);
        if (correct && correct !== loc.timezone) {
          storage.set(KEY, JSON.stringify({ ...loc, timezone: correct }));
          console.warn('[tz-migration] rewrote last_location.timezone:', {
            from: loc.timezone,
            to: correct,
          });
        }
        // If correct === null (tzLookup failed) OR correct === loc.timezone
        // (already right), no rewrite. Flag still gets set so we don't retry.
      }
    } catch {
      // Corrupt JSON. getLastLocation's defensive parse will handle on next read.
      // Flag still gets set; we tried.
    }
  }

  storage.set(MIGRATION_FLAG_KEY, 'done');
}
```

### App.js boot wiring

```js
useEffect(() => {
  hydrateStorage().then(() => {
    migrateLocationTimezones_v1();   // ← NEW: BEFORE init* calls
    initActivityPreference();
    setStorageReady(true);
  });
}, []);
```

**Order rationale:** migration runs before `initActivityPreference` (and before the parked future `initDefaultLocation`) because no in-memory caches read location yet at this point — storage hydration just finished, in-memory state is empty. Migration is a pure read-modify-write on a single storage key. After migration, `init*` callers start reading their respective keys with corrected data on disk.

### Migration unit tests

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../storage';
import { migrateLocationTimezones_v1 } from '../location-storage';

describe('migrateLocationTimezones_v1', () => {
  beforeEach(() => {
    storage.delete('inceptio.tz_migration_v1');
    storage.delete('inceptio.last_location');
  });

  it('rewrites tz when legacy entry has deviceTimezone but coords are different tz', () => {
    storage.set('inceptio.last_location', JSON.stringify({
      lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
      timezone: 'Europe/Berlin', // legacy deviceTimezone value
      selected_at: 1234567890,
    }));
    migrateLocationTimezones_v1();
    const after = JSON.parse(storage.getString('inceptio.last_location')!);
    expect(after.timezone).toBe('Asia/Tokyo');
    expect(storage.getString('inceptio.tz_migration_v1')).toBe('done');
  });

  it('no-op when entry tz is already correct', () => {
    storage.set('inceptio.last_location', JSON.stringify({
      lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
      timezone: 'Asia/Tokyo', // already correct
      selected_at: 1234567890,
    }));
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    // Only the migration flag should have been set, not last_location
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith('inceptio.tz_migration_v1', 'done');
  });

  it('idempotent — second call is no-op', () => {
    storage.set('inceptio.tz_migration_v1', 'done');
    storage.set('inceptio.last_location', JSON.stringify({/* corrupt-tz entry */}));
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('no-op when last_location absent (fresh install)', () => {
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    expect(setSpy).toHaveBeenCalledWith('inceptio.tz_migration_v1', 'done');
    expect(storage.getString('inceptio.last_location')).toBeUndefined();
  });

  it('survives corrupt JSON without throwing', () => {
    storage.set('inceptio.last_location', '{not valid json');
    expect(() => migrateLocationTimezones_v1()).not.toThrow();
    expect(storage.getString('inceptio.tz_migration_v1')).toBe('done');
  });
});
```

---

## 7. Layer 4 — Phase 3: Worker tz authority (deployable independently/first)

### Files to modify
- `workers/api-proxy/src/routes/daily-note.ts` — add tz authority block before the cache key build + upstream call
- `workers/api-proxy/src/__tests__/daily-note-route.test.ts` (and/or `daily-note-route-e2e.test.ts`) — add mismatch + corrected-cache cases
- `workers/api-proxy/src/routes/admin.ts` (commit `868f9a8`) — extend response to include `tz_mismatch` per-day counter
- `workers/api-proxy/scripts/query-activity-missing-rate.ts` — rename or extend to also show tz-mismatch column

### Worker tz authority logic

In `handleDailyNote`, after parsing query params + before building the cache key:

```ts
import tzLookup from '@photostructure/tz-lookup';

// ... existing param parsing produces: lat, lng, clientTz, activity, dateOverride ...

// tz authority: derive from coordinates; fall back to client-supplied; fall back to UTC.
function tryWorkerTzLookup(lat: number, lng: number): string | null {
  try { return tzLookup(lat, lng); }
  catch { return null; }
}

const derivedTz = tryWorkerTzLookup(lat, lng);
const effectiveTz: string = derivedTz ?? clientTz ?? 'UTC';

// Mismatch observability — warn + counter when derivable AND client disagrees
if (derivedTz !== null && clientTz !== null && clientTz !== derivedTz) {
  console.warn('[daily-note] tz_lat_lng_mismatch:', {
    lat, lng, got: clientTz, expected: derivedTz, activity, date: today,
  });
  ctx.waitUntil(bumpCounter(env.CACHE, `metrics:dn-tz-mismatch:${today}`));
}

// All downstream uses effectiveTz, NOT clientTz
const dateIso = dateOverride ?? formatDateInTz(now, effectiveTz);
const cacheKey = keyOf({ lat, lng, dateIso, activity, /* ... */ });
// (note: cache-key tz dimension implicitly carried via dateIso since dateIso is tz-derived;
//  if cache key needs explicit tz, use effectiveTz there too)
const searchBody = { /* ... */, timezone: effectiveTz, /* ... */ };
```

### Cache key implication

Cache currently keys on `(LIBRARY_VERSION, lat, lng, dateIso, activity)`. `dateIso` is already derived from tz (via `formatDateInTz(now, tz)`). With effectiveTz used for `dateIso`, the cache key is naturally keyed under the corrected tz. Two clients sending the same coords but different `tz` values now share a cache entry (both resolve to the same `dateIso`) — correct behavior. Pre-fix cached entries (keyed under wrong-tz `dateIso`) naturally expire via the 7-day TTL; no eviction script needed.

### Admin endpoint extension

`workers/api-proxy/src/routes/admin.ts` — extend the per-day response shape to include a third metric:

```ts
const days = dates.map((date, idx) => {
  const total = reads[idx * 3];
  const missing = reads[idx * 3 + 1];
  const tzMismatch = reads[idx * 3 + 2]; // ← NEW
  return {
    date,
    total,
    missing,
    tz_mismatch: tzMismatch,
    missing_ratio: total > 0 ? missing / total : 0,
    tz_mismatch_ratio: total > 0 ? tzMismatch / total : 0,
  };
});
```

Reads-flat-map expanded to fetch all three keys per day:

```ts
const reads = await Promise.all(
  dates.flatMap((date) => [
    readCounter(env.CACHE, `metrics:dn-total:${date}`),
    readCounter(env.CACHE, `metrics:dn-activity-missing:${date}`),
    readCounter(env.CACHE, `metrics:dn-tz-mismatch:${date}`),
  ]),
);
```

CLI script (`workers/api-proxy/scripts/query-activity-missing-rate.ts`) extends its table output:

```
date         total       missing    miss%   tz_mismatch  tzmm%
2026-06-15   125,901     38         0.030%  412          0.327%
...
```

**Disambiguation for the planner:** Two CLI scripts are touched in this spec:
- `workers/api-proxy/scripts/query-activity-missing-rate.ts` — EXTENDED or RENAMED. This is the existing script from commit `868f9a8`. Decision deferred (rename to `query-correctness-metrics.ts` or extend in place); resolve during plan-stage. My lean: rename, single PR.
- `workers/api-proxy/scripts/tz-correctness-test-pack.ts` — NEW, unambiguously a new file. Runs the §8 astrologer test pack (Path A + Path B). Distinct from the admin-metrics CLI; never conflated with it.

### Worker tests

```ts
describe('tz authority', () => {
  it('uses Worker-derived tz when client tz mismatches lat/lng', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    // Tokyo coords with Berlin tz
    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&tz=Europe/Berlin&activity=wedding'),
      env,
    );
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] tz_lat_lng_mismatch:'),
      expect.objectContaining({ got: 'Europe/Berlin', expected: 'Asia/Tokyo' }),
    );
    // Cache entry keyed under Tokyo tz (via dateIso derived from Tokyo tz)
    // — verify by checking cache key contents
    warn.mockRestore();
  });

  it('no warn when client tz matches lat/lng', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&tz=Asia/Tokyo&activity=wedding'),
      env,
    );
    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );
    warn.mockRestore();
  });

  it('bumps tz-mismatch counter on mismatch', async () => {
    const { env } = makeEnv();
    await handleDailyNote(/* mismatch */, env);
    await drainCtxWaitUntil();
    const today = new Date().toISOString().slice(0, 10);
    const counter = await env.CACHE.get(`metrics:dn-tz-mismatch:${today}`);
    expect(counter).toBe('1');
  });

  it('falls back to client tz when tzLookup returns null (defensive)', async () => {
    // Use a coord that tz-lookup rejects
    // ... assert effective tz === client-supplied (defensive fallback)
  });
});
```

---

## 8. Layer 5 — Phase 4: Deploy + bake + verification

### Deploy order (RECOMMENDED but technically independent)

1. **Worker Phase 3 first** — Production deploy of `tz authority + warn + counter`. Immediate correctness for ALL users (mobile rollout-independent).
2. **Mobile Phases 1-2** — Build + submit to App Store + Google Play. Rolls out at store cadence.

The phases are technically independent — Worker grants correctness on its own; mobile is client-state hygiene that catches up. Recommended order is "Worker first" because the user-facing correctness benefit is immediate.

### Bake gate — monitoring criteria

Run the admin endpoint daily:

```bash
WORKER_URL=https://<prod> ADMIN_TOKEN=<secret> \
  npx tsx workers/api-proxy/scripts/query-activity-missing-rate.ts
```

Watch `tz_mismatch_ratio` over rolling 7 days:

- Initial rate immediately after Worker deploy: expected to be **non-zero and stable** — cross-tz users with un-migrated mobile clients are sending wrong tz. This is the bug being measured.
- After mobile rollout reaches each user: their next request sends correct tz → mismatch counter stops incrementing for that user.
- Expected trajectory: `tz_mismatch_ratio` declines as mobile rollout progresses, asymptoting to ~0 over ~14-21 days (typical store rollout cadence).
- **Mismatch-decay criterion:** ratio < 0.5% for ≥ 7 consecutive days.

If ratio plateaus above 0.5% for > 21 days, investigate: likely indicates a long-tail of stale mobile builds. Doesn't block production (Worker is correcting); **does block the default-location unpark** (see below for why).

### Unpark gate — what defaults-location resumption actually requires

Worker-deploying Phase 3 does NOT, by itself, satisfy the unpark gate. The default-location feature's correctness depends on `default_location` being seeded from a CLEAN `last_location`. If un-migrated mobile clients are still writing wrong-tz `last_location` entries when the default-location feature resumes, the seed chain is poisoned — `useDefaultLocation` would inherit wrong-tz values via D2 from the parked brainstorm (`default → last → fallback`).

**The unpark gate therefore requires BOTH conditions** (not just one):

1. **Mismatch-decay signal:** `tz_mismatch_ratio` < 0.5% for ≥ 7 consecutive days (mobile rollout dominant; the long tail of un-migrated clients writing wrong tz has shrunk to negligible).
2. **Astrologer test pack passes** (per §9 below) — Path A (Worker corrects + warns) + Path B (tz load-bearing at upstream level) both green; reviewer signs off in writing.

Both signals are necessary; neither alone is sufficient. Mismatch-decay alone doesn't prove the Worker's tz authority is doctrinally correct (the astrologer pack does). Astrologer pack alone doesn't prove client-state has caught up (the decay does). Together they certify the foundation is clean for default-location resumption.

### Astrologer-review test pack

Test pack runs against the deployed Worker. Reframed assertions (per Decision 2 redirect): cannot prove "wrong tz → wrong sky" through the Worker (it corrects). Two assertion paths instead:

#### Path A: Worker corrects + warns on mismatch

Synthetic test cases against the deployed `/daily-note`:

| # | lat | lng | sent_tz | expected_effective_tz | expected_warn | expected_counter_bump |
|---|---|---|---|---|---|---|
| TP-1 | 35.68 (Tokyo) | 139.69 | Europe/Berlin | Asia/Tokyo | YES | YES |
| TP-2 | 35.68 | 139.69 | Asia/Tokyo | Asia/Tokyo | NO | NO |
| TP-3 | 40.71 (NYC) | -74.01 | Australia/Sydney | America/New_York | YES | YES |
| TP-4 | 51.51 (London) | -0.13 | America/Argentina/Buenos_Aires | Europe/London | YES | YES |
| TP-5 | 34.05 (LA) | -118.24 | Asia/Kolkata | America/Los_Angeles | YES | YES |
| TP-6 (DST-active) | 40.71 | -74.01 | Australia/Sydney | America/New_York | YES | YES (run on a date when NYC observes EDT) |
| TP-7 (control, same-tz) | 50.45 (Kyiv) | 30.52 | Europe/Kyiv | Europe/Kyiv | NO | NO |
| TP-8 (control, no tz sent) | 35.68 (Tokyo) | 139.69 | — | Asia/Tokyo | NO | NO (counter only bumps on mismatch, not on missing) |

**Pass criterion:** all 8 cases behave as expected.

#### Path B: tz is load-bearing at upstream/unit level

Two sub-paths (pick one — sign-off question β):

**β1 — Direct astrology-api.io call** (bypasses Worker entirely):

```bash
# Call upstream directly with mismatched (lat, lng, tz) to confirm output differs from matched
curl -X POST https://api.astrology-api.io/v3/electional/search \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"latitude":35.68,"longitude":139.69,"timezone":"Asia/Tokyo","start":"...",...}'
# Capture output A

curl -X POST https://api.astrology-api.io/v3/electional/search \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"latitude":35.68,"longitude":139.69,"timezone":"Europe/Berlin","start":"...",...}'
# Capture output B
```

Verify `output A != output B` materially (compare top_windows, headlines, planetary hours).

**β2 — Unit test of calculation primitive** — bypass HTTP entirely with a vendored Swiss Ephemeris call OR mock the upstream to expose the calc layer directly.

My lean: **β1**. Cheaper to implement (curl loop in test pack script). Burns ~10 upstream credits but proves correctness end-to-end. β2 requires plumbing we don't currently have.

### Astrologer review

Hand the Path A + Path B outputs to the project's astrologer reviewer (per CLAUDE.md's translation-layer review discipline). Pass criteria:

- Path A outputs match expected behavior matrix (8/8)
- Path B output A ≠ B materially (astrologer confirms sky/window content is correctly Tokyo-shaped vs Berlin-shaped)
- Reviewer signs off on the test pack

This astrologer sign-off is the gate that unparks the default-location brainstorm. Without it, default-location waits.

---

## 9. Layer 6 — Tests + verify-in-sync contracts

### Unit tests to write

- `apps/mobile/src/lib/__tests__/location-storage.test.ts` — extend per Phase 1 + Phase 2 sections above
- `workers/api-proxy/src/__tests__/daily-note-tz-authority.test.ts` (NEW) — per Phase 3 section above (mismatch warns, counter bumps, no-warn on match, defensive fallback)
- `workers/api-proxy/src/__tests__/admin-correctness-metrics.test.ts` (extend or rename existing `admin-activity-missing-rate.test.ts`) — verify tz-mismatch counter surfaces in admin response

### Maestro

- `apps/mobile/maestro/04-location-picker-regression.yaml` (NEW) — per Phase 1 section above

### Astrologer test-pack script

- `workers/api-proxy/scripts/tz-correctness-test-pack.ts` (NEW) — runs Path A (8 synthetic Worker calls) + optional Path B (2 direct upstream calls), produces structured output for astrologer review

---

## 10. Edge cases (EC-T1..EC-T10)

### EC-T1 — `tzLookup(lat, lng)` THROWS for edge coords (open ocean, polar) — wrapped to null

`@photostructure/tz-lookup`'s actual API **throws** on invalid coords (extreme polar, mid-ocean grid cells, NaN inputs) — error message `"invalid coordinates"`. It does NOT return null directly. Both `pickToSavedLocation` and Worker's `tryWorkerTzLookup` wrap in try/catch and **coerce the throw to a null return value**, then fall back to:
- **Mobile:** `deviceTimezone()` (last-resort)
- **Worker:** client-supplied `clientTz` (last-resort, since Worker has no concept of "device tz")

Log warn in both cases. New writes use the fallback chain. Counter does NOT bump on Worker side (mismatch detection requires `derivedTz !== null`).

### EC-T2 — Existing `last_location` already has correct tz

User picked the location while physically in its timezone. Migration sees `correct === stored.tz` → no rewrite, just sets migration flag. Common case for stationary users.

### EC-T3 — Migration version flag corrupted or missing

Migration re-runs. Idempotent — rewriting an already-correct entry is a no-op (no actual change to storage). If the migration completes successfully a second time and sets the flag, subsequent boots skip again. If the failure recurs, migration runs on every boot until succeeds — annoying but not corrupting (warn fires every time, observable).

### EC-T4 — Worker warns but doesn't reject during mobile rollout window

User on un-migrated mobile build sends `(Tokyo coords, Berlin tz)`. Worker derives `Asia/Tokyo`, processes the request with `Asia/Tokyo`, returns correct sky. Mobile UI still shows `Europe/Berlin` in YouScreen Row until mobile migration runs. **Acceptable** during rollout: server-side correctness is guaranteed; UI lag is cosmetic.

Once mobile migration runs (boot after store update), YouScreen Row also shows correct tz. UI/server consistency restored per-device at mobile rollout cadence.

### EC-T5 — Cache hit on entry warmed pre-fix under wrong-tz dateIso

Worker's cache TTL is 7 days. Pre-fix cached entries (keyed under wrong-tz `dateIso`) naturally expire within a week. The first post-deploy cache miss for any (lat, lng, activity) warms a new entry under correct-tz `dateIso`. No eviction script needed.

For users hitting the wrong-tz cached entry during that 7-day window: cache returns the OLD (wrong-tz) response. Worker's cache layer doesn't currently invoke the tz authority block on cache hits (cache is checked before route processing). **Sign-off question γ:** Should we invalidate the cache layer-wide on Worker deploy as a clean cut-over, or accept the 7-day stale-tail? My lean: **accept the stale-tail**. KV cache flush is operational overhead; 7-day natural expiry is fine for a correctness-degraded-vs-correct transition (users are no worse off than they were pre-fix).

### EC-T6 — Astrologer test pack fails for one pair

Phase 4 verification gate blocks the default-location unpark until investigated. Possible causes:
- `@photostructure/tz-lookup` version mismatch between mobile + Worker (D8 mandate violated) → version-pin audit
- Test pack assertion is wrong (rare, but possible)
- Upstream API changed semantics (rare; would affect activity feature's astrologer review too)

### EC-T7 — Worker `@photostructure/tz-lookup` bundle exceeds 1MB limit

Phase 0 size-check happens BEFORE production deploy. If `wrangler deploy --dry-run` shows bundle > 1MB, abort. Workarounds (in priority order):
1. Use `@photostructure/tz-lookup`'s smaller variant (it ships a `tz-lookup-rust` subset; verify)
2. Subset the tz dataset to only timezones we care about (build-step filter)
3. Use a separate Worker microservice for tz resolution (subrequest) — adds latency, complicates auth, **avoid**

Highly unlikely to be needed — current bundle is "few hundred KB" per implementer report.

### EC-T8 — Mobile and Worker use different `@photostructure/tz-lookup` versions

D8 mandates same major+minor. Risk: minor version bumps the internal dataset and boundary coordinates resolve to different IANA names on each side. Example: a coordinate exactly on the Mongolia/China border resolves to `Asia/Ulaanbaatar` on v6.1 but `Asia/Shanghai` on v6.2. Mobile (v6.1) sends `tz=Asia/Ulaanbaatar`, Worker (v6.2) derives `tz=Asia/Shanghai` → mismatch warn + counter bump even though both sides are "right" given their dataset.

**Mitigation:** version-pin to caret-minor (`^11.0.0`) so npm + Wrangler install the latest patch but NOT the next minor. Periodic manual sync (~yearly) when one side bumps. CI check: parse both `package.json` files, assert `@photostructure/tz-lookup` major+minor match. Sign-off question δ: add this CI check as a one-line script in Phase 0, OR defer to manual review at deploy time? My lean: **add the CI check** (cheap, catches the footgun before deploy).

### EC-T9 — Same-tz control test must not false-positive

Worker logic: `if (derivedTz !== null && clientTz !== null && clientTz !== derivedTz)` warns. When `clientTz === derivedTz` (user is in Kyiv, picks Kyiv, sends Kyiv), no warn fires, no counter bump. Test pack TP-7 verifies. Critical that the guard condition does NOT trip on the common case.

### EC-T10 — DST round-trip

`@photostructure/tz-lookup` returns IANA tz names like `America/New_York`. DST is downstream of the name — the IANA database encodes when EST→EDT transitions happen for each named zone. The Worker passes the IANA name to upstream; upstream's Swiss Ephemeris layer handles the UTC conversion correctly for any date including DST boundaries.

Test pack TP-6 specifically exercises a DST-active date (e.g., July 15 for NYC's EDT). Mismatch detection logic works the same — `tzLookup` returns `America/New_York` regardless of season; the DST adjustment is upstream's responsibility, not ours.

---

## 11. Out of scope (deliberately, with reasons)

1. **Default-location feature** — parked. Brainstorm artifact (D1-D24 + EC-1..22) preserved. Resumes after Phase 4 verification gate passes (astrologer test pack signs off).
2. **`setDefaultLocation` / `useDefaultLocation` store** — part of default-location parking; not touched here.
3. **`useDailyNote` `useMemo([])` location lockup** — part of default-location parking; not touched here. (Note: this defect is INDEPENDENT of the tz correctness bug. After this fix lands, `useDailyNote` still re-reads `last_location` only on mount — but the tz it sees is now correct. So the lockup is no longer a correctness issue, just a UX reactivity gap that default-location addresses.)
4. **Hard-reject Phase WB** — explicitly DROPPED. Worker-as-authority makes it unnecessary.
5. **Eviction of pre-fix cached entries** — accept 7-day TTL stale-tail per EC-T5.
6. **`PreferencesContext` consolidation (activity-spec §13 D18)** — not relevant; this feature doesn't add a new preference. Activity remains the only preference until default-location resumes. *(Note: this spec's local D18 is the CA-1 cleanup row; the activity-spec D18 referenced here is a different decision in a different spec. Cross-spec D-number references in this memo are prefixed `activity-spec D<n>` for clarity.)*
7. **CLI script rename from `query-activity-missing-rate.ts`** — deferred to plan-stage choice; not a brainstorm decision.

---

## 12. Handoff to plan + checkpoints

### Two execution checkpoints

The planner should surface these as explicit `/plan-and-implement` review checkpoints:

**Checkpoint A — Worker bundle size verification (Phase 0).**
Before any production deploy, run `wrangler deploy --dry-run` and confirm bundle < 1MB after `@photostructure/tz-lookup` added. If bundle exceeds the limit, ABORT and surface options per EC-T7.

**Checkpoint B — Unpark gate (Phase 4).**
After Worker deploys (Phase 3) and mobile rolls out (Phases 1-2), monitor `tz_mismatch_ratio` via the admin endpoint AND run the astrologer test pack against the deployed Worker. The unpark gate requires BOTH (a) mismatch ratio < 0.5% for ≥ 7 consecutive days (mobile rollout dominant; client-state caught up) AND (b) astrologer test pack signs off (Worker authority is doctrinally correct). Worker-deploying Phase 3 alone is insufficient — the decay signal is what guarantees the `last_location` seed is clean before default-location resumes consuming it via D2 of the parked brainstorm.

### Future work flagged but not scoped here

- Default-location feature resumption after Checkpoint B.
- `PreferencesContext` consolidation if a third preference lands (D18 from activity spec).
- Periodic `@photostructure/tz-lookup` version sync between mobile + Worker (annual or as needed).

### Decision log (compressed)

| # | Decision | Resolution | Why |
|---|---|---|---|
| D1 | Scope | Per-search write defect fix + migration + Worker authority. Parked default-location stays parked. | Surfaced bug needs standalone fix. |
| D2 | Case B confirmed | tz is load-bearing electional input via Swiss Ephemeris dependency chain | Domain-expert audit + repeated repo evidence + doctrine. |
| D3 | Worker as tz authority | `effectiveTz = tzLookup(lat,lng) ?? clientTz ?? 'UTC'` permanently | tz is server-derivable; activity-style A/B cutover unnecessary. |
| D4 | Migration policy | α — boot-time one-time rewrite at storage hydrate, version-flagged | Clean, deterministic, observable. User lean. |
| D5 | No β rewrite-on-read | α alone is sufficient | Read-impurity footgun for negligible benefit. |
| D6 | Worker derives effectiveTz | Cache key + upstream call both use Worker's derived value | Independence from mobile rollout. |
| D7 | Worker warn + KV counter on mismatch | Never reject | Defense-in-depth observability without UX disruption. |
| D8 | Drop Phase WB hard-reject | Worker as authority makes reject unnecessary | Simpler than activity, not heavier. |
| D9 | Test pack reframed | (a) Worker corrects + warns, (b) tz load-bearing at upstream/unit | Worker now corrects, so can't prove "wrong tz → wrong sky" through Worker. |
| D10 | Mobile Phases 1-2 reframed | Client-state correctness (UI display, seed hygiene), NOT sky correctness | Worker guarantees sky. |
| D11 | Deploy order | Worker first (Phase 3), mobile follows (Phases 1-2) | Worker grants immediate user-facing correctness. |
| D12 | Library + version pin | `@photostructure/tz-lookup` npm package, same major+minor on both sides (`^11.x`) | Active fork over canonical (canonical `tz-lookup` IANA DB frozen ~2021; misses Iran/Mexico DST abolitions 2022 + Pacific reshuffles — exactly destination-wedding persona's regions). Boundary agreement; `geo-tz` forbidden (blows Worker 1MB limit). |
| D11a | Unpark gate requires BOTH mismatch decay AND astrologer pack | Worker deploy alone is NOT sufficient | Decay signal certifies `last_location` seed is clean before default-location resumes consuming it. |
| D13a | Phase 0 includes Hermes/RN startup smoke as GATE before Phase 1 | Two-assertion vitest test on the actual RN runtime | Neither package certifies Hermes; ~72KB static dataset is a potential quirk point. Gate prevents wasted Phases 1-2 work if Hermes rejects the package. |
| D13 | Phase 0 size check | `wrangler deploy --dry-run` verifies bundle < 1MB | Defensive. |
| D14 | Lift `pickToSavedLocation` to `lib/location-storage.ts` | Canonical writer with tz invariant | Pre-stages D9 from parked default-location brainstorm. |
| D15 | `deviceTimezone()` kept as last-resort fallback | When `tzLookup` returns null | Ocean/polar coords need a fallback. |
| D16 | Migration version flag | `inceptio.tz_migration_v1 = 'done'` | Idempotent, observable. |
| D17 | Cache keyed under Worker-derived effective tz | Via `dateIso = formatDateInTz(now, effectiveTz)` | Natural — `dateIso` already encodes tz. |
| D18 | CA-1 cleanup | Remove orphaned `04-daily-note-tour.yaml` ref in `TodayScreen.js:9`; keep "dev-tool affordance" note | Code-archaeology audit. |
| D19 | Test pack | 5 cross-tz pairs + 1 same-tz control + DST-active date | Cover boundary cases and false-positive prevention. |
| D20 | Astrologer review gate | Phase 4 verification before default-location unpark | Per CLAUDE.md translation-layer review discipline. |
| D21 | No Worker-side migration | Cache TTL handles legacy entries | 7-day natural expiry. |
| D22 | Spec filename | `docs/superpowers/specs/2026-06-03-location-timezone-correctness.md` | Clear, dated, descriptive. |

---

*End of memo. Doc-validator audit lands next, then `/plan-and-implement`.*
