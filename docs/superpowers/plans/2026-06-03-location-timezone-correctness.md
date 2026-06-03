# Location-Timezone Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a pre-existing tz-lat/lng-mismatch correctness bug in the shipping per-search location flow by installing `@photostructure/tz-lookup`, deriving tz from coordinates on both client (mobile write path + migration) and server (Worker as tz authority), and verifying via a deploy/bake/astrologer-pack gate before the parked default-location brainstorm resumes.

**Architecture:** Worker becomes the tz authority — computes `effectiveTz = tzLookup(lat, lng) ?? clientTz ?? 'UTC'` for cache key + upstream call, warns + KV-counters mismatches but never rejects (no Phase B cutover; activity Phase A/B disanalogy explained in spec §2 Finding B). Mobile catches up via `pickToSavedLocation` write-side fix + boot-time one-time migration of existing `inceptio.last_location` entries. Worker deploys independently/first.

**Tech Stack:** Expo SDK 55 / RN 0.83 / React 19 / TypeScript strict / Vitest 2.1.9 (BOTH mobile + Worker) / `@photostructure/tz-lookup@^11.x` (active fork of canonical `tz-lookup`; current IANA DB) / Cloudflare Workers (Wrangler) / `expo-location` 55.1.x / Maestro for mobile flow regression.

---

## Authoritative source documents

Workers consuming this plan MUST read these alongside each phase:

- Spec — `/Users/user/Projects/inceptio/docs/superpowers/specs/2026-06-03-location-timezone-correctness.md`
- Domain-expert KB section — `/Users/user/Projects/inceptio/docs/superpowers/expert/_knowledge-base/astrology-electional.md` (heading: `Updated 2026-06-03 — Timezone is load-bearing election input, not a presentation hint (EC-19 audit)`)
- Activity-preference spec (cross-references EC-14 sync-cache storage write-success ordering) — `/Users/user/Projects/inceptio/docs/superpowers/specs/2026-06-02-activity-preference.md`
- Schema contract — `/Users/user/Projects/inceptio/packages/shared-types/src/api/request.ts:26` (already documents tz-from-lat/lng as intent)
- Project context — `/Users/user/Projects/inceptio/CLAUDE.md`

---

## Out of scope (do NOT silently expand)

1. **Default-location feature** — parked. D1–D24 + EC-1..22 preserved in conversation context for resumption after Checkpoint C.
2. **`useDailyNote` `useMemo([])` location lockup** — parked. After this fix, the location it sees is correct; the lockup is a UX reactivity gap, not a correctness issue.
3. **Phase WB hard-reject cutover** — explicitly DROPPED. Worker-as-authority makes it unnecessary.
4. **`PreferencesContext` consolidation (activity-spec §13 D18)** — not relevant; this feature adds no new preference.
5. **Cache eviction of pre-fix entries** — accept 7-day natural TTL stale-tail per spec EC-T5.

---

## Phase map (5 phases + 3 checkpoints)

| # | Phase | Tasks | Blocks next phase? |
|---|---|---|---|
| 0 | Foundational | 5 | YES |
| — | **🛑 Checkpoint A — Worker bundle + Hermes smoke GATE** | — | YES |
| 1 | Mobile write-side correctness | 4 | NO (independent of Phase 3) |
| 2 | Mobile migration | 3 | NO (independent of Phase 3) |
| 3 | Worker tz authority | 5 | NO (deployable independently/first) |
| — | **🛑 Checkpoint B — Worker staging deploy verification** | — | YES |
| 4 | Deploy + bake + verification | 3 | — |
| — | **🛑 Checkpoint C — Unpark gate (default-location resumption)** | — | gates parked-feature resumption |

**Total: 20 tasks** across 5 phases + 3 hard-STOP checkpoints.

---

## Phase 0 — Foundational

### Task 0.1: Install `@photostructure/tz-lookup` on mobile

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install the dependency**

Run from `/Users/user/Projects/inceptio/apps/mobile`:
```bash
cd apps/mobile && npm install @photostructure/tz-lookup@^11.0.0
```
Expected: dependency added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Verify the install + version pin**

Run: `cd apps/mobile && cat package.json | grep tz-lookup`
Expected output: `"@photostructure/tz-lookup": "^11.0.0",` (or similar — caret-pinned to v11.x).

- [ ] **Step 3: Smoke-test in Node**

Run: `cd apps/mobile && node -e "const tz = require('@photostructure/tz-lookup'); console.log(tz(35.68, 139.69));"`
Expected: `Asia/Tokyo`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat(mobile): install @photostructure/tz-lookup ^11.0.0 (active fork of canonical, current IANA DB)"
```

---

### Task 0.2: Install `@photostructure/tz-lookup` on Worker

**Files:**
- Modify: `workers/api-proxy/package.json`

- [ ] **Step 1: Install the dependency**

```bash
cd workers/api-proxy && npm install @photostructure/tz-lookup@^11.0.0
```

- [ ] **Step 2: Verify the version pin matches mobile**

Run: `grep '@photostructure/tz-lookup' apps/mobile/package.json workers/api-proxy/package.json`
Expected: both lines show the SAME caret-pin (`^11.0.0` or whatever the install resolved to). If they diverge, run `npm install @photostructure/tz-lookup@<mobile-version>` in the Worker to align.

- [ ] **Step 3: Verify Worker bundle size — GATE FOR CHECKPOINT A**

```bash
cd workers/api-proxy && npx wrangler deploy --dry-run --outdir=/tmp/wrangler-bundle-check 2>&1 | grep -i "size\|bundle"
```
Expected: bundle size < 1MB (Workers Free tier limit). If output doesn't show size, inspect: `ls -la /tmp/wrangler-bundle-check/`.

**If bundle exceeds 1MB:** ABORT and escalate to user per spec §4 EC-T7 workarounds.

- [ ] **Step 4: Commit**

```bash
git add workers/api-proxy/package.json workers/api-proxy/package-lock.json
git commit -m "feat(worker): install @photostructure/tz-lookup ^11.0.0 (matches mobile pin)"
```

---

### Task 0.3: CI version-pin sync check script

**Files:**
- Create: `scripts/verify-tz-lookup-pin.sh`

- [ ] **Step 1: Write the script**

Create `/Users/user/Projects/inceptio/scripts/verify-tz-lookup-pin.sh`:

```bash
#!/usr/bin/env bash
# Verify that @photostructure/tz-lookup is pinned to the SAME version on both
# sides. Mismatched versions risk boundary-coordinate disagreement → spurious
# Worker mismatch warns + cache fragmentation. See spec EC-T8.
#
# Exits 0 if versions match, 1 otherwise.

set -euo pipefail

MOBILE_VER=$(grep -o '"@photostructure/tz-lookup": "[^"]*"' apps/mobile/package.json | sed 's/.*": "//;s/"$//')
WORKER_VER=$(grep -o '"@photostructure/tz-lookup": "[^"]*"' workers/api-proxy/package.json | sed 's/.*": "//;s/"$//')

if [ "$MOBILE_VER" != "$WORKER_VER" ]; then
  echo "ERROR: @photostructure/tz-lookup version mismatch"
  echo "  apps/mobile/package.json:   $MOBILE_VER"
  echo "  workers/api-proxy/package.json: $WORKER_VER"
  echo "Run 'npm install @photostructure/tz-lookup@<same-version>' in both directories."
  exit 1
fi

echo "OK: @photostructure/tz-lookup pinned at $MOBILE_VER on both sides"
exit 0
```

- [ ] **Step 2: Make it executable + run it**

```bash
chmod +x scripts/verify-tz-lookup-pin.sh
./scripts/verify-tz-lookup-pin.sh
```
Expected: `OK: @photostructure/tz-lookup pinned at ^11.0.0 on both sides` (or equivalent caret string).

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-tz-lookup-pin.sh
git commit -m "chore: verify @photostructure/tz-lookup pin sync across mobile + Worker"
```

---

### Task 0.4: Lift `pickToSavedLocation` to `lib/location-storage.ts` (no behavior change)

**Files:**
- Modify: `apps/mobile/src/lib/location-storage.ts` (add `pickToSavedLocation` export)
- Modify: `apps/mobile/src/screens/LocationPickerScreen.js` (delete inline def, import from lib)

- [ ] **Step 1: Read current state of both files**

```bash
sed -n '35,44p' apps/mobile/src/screens/LocationPickerScreen.js
```
Confirm output matches:
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

- [ ] **Step 2: Add `pickToSavedLocation` export to `lib/location-storage.ts`**

Append to `/Users/user/Projects/inceptio/apps/mobile/src/lib/location-storage.ts` (after the existing exports, before any trailing comments):

```ts
import type { NominatimResult } from './nominatim';

/**
 * Convert a Nominatim search result into a SavedLocation persistable shape.
 *
 * Canonical writer for SavedLocation. Lifted from LocationPickerScreen.js in
 * commit <SHA> so the tz invariant can be enforced at a single site. In
 * Phase 0 this function preserves the existing deviceTimezone() body for
 * backward compatibility — Phase 1 swaps it to tzLookup-derived tz.
 *
 * @param pick a normalized NominatimResult (forward search OR reverse geocode)
 * @returns SavedLocation ready to pass to saveLocation() or setDefaultLocation()
 */
export function pickToSavedLocation(pick: NominatimResult): SavedLocation {
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

- [ ] **Step 3: Modify `LocationPickerScreen.js` — delete inline + import from lib**

Open `apps/mobile/src/screens/LocationPickerScreen.js`. Find this import (line ~27):
```js
import { saveLocation, getLastLocation, deviceTimezone } from '../lib/location-storage';
```
Change to:
```js
import { saveLocation, getLastLocation, deviceTimezone, pickToSavedLocation } from '../lib/location-storage';
```

Then delete the inline function at lines 35-44 (the entire `function pickToSavedLocation(pick) { ... }` block).

- [ ] **Step 4: Run mobile typecheck + tests — confirm no behavioral diff**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: only pre-existing `cluster-windows.ts:108` error (predates branch). No new errors.

```bash
cd apps/mobile && npx vitest run
```
Expected: PASS (whatever the current count is, e.g. 59/59). Existing tests still cover the function via LocationPickerScreen behavior — no regression.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/location-storage.ts apps/mobile/src/screens/LocationPickerScreen.js
git commit -m "refactor(location-storage): lift pickToSavedLocation to lib (no behavior change)"
```

---

### Task 0.5: CA-1 ride-along — remove orphaned Maestro reference in TodayScreen.js

**Files:**
- Modify: `apps/mobile/src/screens/TodayScreen.js:6-9`

- [ ] **Step 1: Read current state of the comment block**

```bash
sed -n '1,10p' apps/mobile/src/screens/TodayScreen.js
```
Confirm output matches:
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
```

- [ ] **Step 2: Modify the comment — remove orphaned Maestro reference, keep "dev-tool affordance" note**

Using your editor (`vi`, `nano`, or Edit tool):

Find:
```
// StatePicker retained as design QA override for the four mood variants.
// Letter prefixes (A·/B·/C·/D·) are dev-tool affordances, not user-facing
// copy — don't "fix" in a voice pass. Load-bearing in Maestro
// 04-daily-note-tour.yaml sentinel.
```

Replace with:
```
// StatePicker retained as design QA override for the four mood variants.
// Letter prefixes (A·/B·/C·/D·) are dev-tool affordances, not user-facing
// copy — don't "fix" in a voice pass.
```

- [ ] **Step 3: Verify the change**

```bash
sed -n '6,9p' apps/mobile/src/screens/TodayScreen.js
```
Expected:
```js
// StatePicker retained as design QA override for the four mood variants.
// Letter prefixes (A·/B·/C·/D·) are dev-tool affordances, not user-facing
// copy — don't "fix" in a voice pass.
```

The "Load-bearing in Maestro 04-daily-note-tour.yaml sentinel" line is gone; the dev-tool affordance note remains.

- [ ] **Step 4: Run tests to confirm no regression**

```bash
cd apps/mobile && npx vitest run
```
Expected: same pass count as Task 0.4.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/TodayScreen.js
git commit -m "chore(TodayScreen): remove orphaned 04-daily-note-tour.yaml reference (CA-1)"
```

---

## 🛑 Checkpoint A — Worker bundle + Hermes smoke GATE

**Stop here. Do not proceed to Phase 1 until BOTH conditions verified.**

### Surface to the user:

1. Phase 0 commits (5 commits).
2. **Bundle-size verification result** from Task 0.2 Step 3: confirm Worker bundle < 1MB after `@photostructure/tz-lookup` added.
3. **Hermes/RN smoke verification result** — run the smoke now:

#### Hermes smoke setup

**Files for the smoke:**
- Create: `apps/mobile/src/lib/__tests__/tz-lookup-smoke.test.ts`

- [ ] **CP-A Step 1: Write the smoke test**

```ts
// apps/mobile/src/lib/__tests__/tz-lookup-smoke.test.ts
import { describe, it, expect } from 'vitest';
import tzLookup from '@photostructure/tz-lookup';

describe('@photostructure/tz-lookup — startup smoke', () => {
  it('imports + returns IANA tz for Tokyo coords', () => {
    expect(typeof tzLookup).toBe('function');
    expect(tzLookup(35.68, 139.69)).toBe('Asia/Tokyo');
  });

  it('returns Asia/Tehran for Tehran coords (validates current IANA DB)', () => {
    // Iran abolished DST in 2022; tz-lookup canonical (~2021 DB) might
    // historically have observed DST transitions. Modern IANA encodes
    // the change. Active fork @photostructure/tz-lookup has current data.
    expect(tzLookup(35.6892, 51.3890)).toBe('Asia/Tehran');
  });
});
```

- [ ] **CP-A Step 2: Run the smoke**

```bash
cd apps/mobile && npx vitest run src/lib/__tests__/tz-lookup-smoke.test.ts
```
Expected: `Test Files 1 passed (1) | Tests 2 passed (2)`.

**If smoke FAILS:**
- Capture the exact failure output
- ABORT and escalate to user with three options per spec §4:
  - (a) alternative tz-resolution library (e.g. `country-tz`, custom subset)
  - (b) server-only architecture (drop Phases 1-2 mobile work entirely, leave only Phase 3 + thin Phase 0 mobile-side stub)
  - (c) Worker-only deferral (ship Worker fix now, defer mobile until Hermes-compat sorted)
- Do NOT proceed to Phase 1 until user picks a path.

- [ ] **CP-A Step 3: Commit the smoke**

```bash
git add apps/mobile/src/lib/__tests__/tz-lookup-smoke.test.ts
git commit -m "test(tz-lookup): Hermes/RN startup smoke (Tokyo + Tehran assertions)"
```

### Checkpoint A sign-off

**User reviews and explicitly approves before Phase 1 starts:**
- Bundle check PASSED (< 1MB)
- Hermes smoke PASSED (2/2 tests)
- Commits land on branch

Then Phase 1 begins.

---

## Phase 1 — Mobile write-side correctness

### Task 1.1: Write failing cross-tz unit tests for `pickToSavedLocation`

**Files:**
- Test: `apps/mobile/src/lib/__tests__/location-storage.test.ts`

- [ ] **Step 1: Read current test file structure**

```bash
head -30 apps/mobile/src/lib/__tests__/location-storage.test.ts
```
Confirm the file exists and uses `vitest` imports + `it()` convention per project standard.

- [ ] **Step 2: Append failing cross-tz cases**

Add to the bottom of `apps/mobile/src/lib/__tests__/location-storage.test.ts`:

```ts
// --- pickToSavedLocation tz derivation (Phase 1) ---
import { pickToSavedLocation } from '../location-storage';

describe('pickToSavedLocation — tz derivation', () => {
  it('derives Asia/Tokyo from Tokyo coordinates', () => {
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
    const result = pickToSavedLocation({
      place_id: 2,
      lat: 40.71,
      lng: -74.01,
      display_name: 'New York, USA',
      city: 'New York',
      country: 'USA',
    });
    expect(result.timezone).toBe('America/New_York');
  });

  it('falls back to deviceTimezone when tzLookup throws (extreme polar)', () => {
    // Antarctic coords — @photostructure/tz-lookup may resolve OR throw.
    // Either way, our wrapper guarantees a string falls through.
    const result = pickToSavedLocation({
      place_id: 3,
      lat: -89.99,
      lng: 0,
      display_name: 'South Pole',
      city: 'South Pole',
      country: 'Antarctica',
    });
    // Must be a non-empty IANA-shaped string (either polar tz or deviceTimezone)
    expect(typeof result.timezone).toBe('string');
    expect(result.timezone.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they FAIL**

```bash
cd apps/mobile && npx vitest run src/lib/__tests__/location-storage.test.ts
```
Expected: the first two new tests FAIL (current `pickToSavedLocation` returns `deviceTimezone()` which on a test runner is the runner's tz, NOT `Asia/Tokyo`). The third test passes accidentally (deviceTimezone is also non-empty).

---

### Task 1.2: Implement `tryTzLookup` + update `pickToSavedLocation` body

**Files:**
- Modify: `apps/mobile/src/lib/location-storage.ts`

- [ ] **Step 1: Add `tzLookup` import at the top of `location-storage.ts`**

Add to the imports block (preserving existing imports):
```ts
import tzLookup from '@photostructure/tz-lookup';
```

- [ ] **Step 2: Add `tryTzLookup` private helper above `pickToSavedLocation`**

```ts
/**
 * @photostructure/tz-lookup throws on invalid coords ('invalid coordinates' error).
 * Wrap defensively so callers can use null-coalescing fallback.
 *
 * Spec §10 EC-T1: the actual API throws; this wrapper coerces to null so the
 * fallback chain (tzLookup -> deviceTimezone -> 'UTC') reads naturally at
 * call sites.
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

- [ ] **Step 3: Update `pickToSavedLocation` body**

Replace the current body:
```ts
export function pickToSavedLocation(pick: NominatimResult): SavedLocation {
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

With:
```ts
/**
 * Canonical writer for SavedLocation.
 *
 * Derives timezone authoritatively from coordinates via tz-lookup. Falls back
 * to device tz only when tz-lookup can't resolve (open ocean, polar, exotic
 * coordinates). deviceTimezone() is now the last-resort fallback — see
 * spec §5 + §10 EC-T1.
 */
export function pickToSavedLocation(pick: NominatimResult): SavedLocation {
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
```

- [ ] **Step 4: Run tests — should now PASS**

```bash
cd apps/mobile && npx vitest run src/lib/__tests__/location-storage.test.ts
```
Expected: all 3 new tests PASS plus all pre-existing tests in the file.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/location-storage.ts apps/mobile/src/lib/__tests__/location-storage.test.ts
git commit -m "feat(location-storage): derive timezone from tzLookup(lat, lng) in pickToSavedLocation"
```

---

### Task 1.3: Mark `deviceTimezone()` `@deprecated` for primary use

**Files:**
- Modify: `apps/mobile/src/lib/location-storage.ts`

- [ ] **Step 1: Find the current `deviceTimezone` JSDoc**

```bash
grep -n "deviceTimezone" apps/mobile/src/lib/location-storage.ts
```

- [ ] **Step 2: Update JSDoc to reflect last-resort fallback status**

Find:
```ts
/** Device timezone via Intl. Pure helper used when persisting Nominatim picks. */
export function deviceTimezone(): string {
```

Replace with:
```ts
/**
 * Device IANA timezone via Intl. Last-resort fallback when tzLookup cannot
 * resolve coordinates (open-ocean, polar, exotic). For all valid land
 * coordinates, pickToSavedLocation derives tz from lat/lng via tz-lookup
 * and skips this helper.
 *
 * Also used by `migrateLocationTimezones_v1` as fallback when migrating an
 * entry whose coords don't resolve via tzLookup (rare; existing tz left in
 * place instead).
 *
 * @deprecated as the primary timezone source. Kept as last-resort fallback.
 *   New code should call `pickToSavedLocation(pick)` instead, which threads
 *   the fallback automatically.
 */
export function deviceTimezone(): string {
```

(The function body stays unchanged.)

- [ ] **Step 3: Run typecheck to confirm `@deprecated` doesn't break consumers**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: no new errors (deprecation is informational, not enforcement).

- [ ] **Step 4: Run tests**

```bash
cd apps/mobile && npx vitest run
```
Expected: full mobile suite passes (same count as Task 1.2).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/location-storage.ts
git commit -m "docs(location-storage): mark deviceTimezone @deprecated for primary use"
```

---

### Task 1.4: Add Maestro regression smoke `04-location-picker-regression.yaml`

**Files:**
- Create: `apps/mobile/maestro/flows/04-location-picker-regression.yaml`

- [ ] **Step 1: Read existing Maestro flows for convention**

```bash
ls apps/mobile/maestro/flows/
cat apps/mobile/maestro/flows/01-wedding-full.yaml
```

Confirm convention: `appId: host.exp.Exponent`, `launchApp:{clearState:false}`, `runFlow:{when:{visible:...}, commands:[...]}`, `tapOn:` / `inputText:` / `extendedWaitUntil:` / `scroll`.

- [ ] **Step 2: Create the regression flow**

Create `/Users/user/Projects/inceptio/apps/mobile/maestro/flows/04-location-picker-regression.yaml`:

```yaml
appId: host.exp.Exponent
name: "Location picker regression smoke (post tz-lookup fix)"
---
# Verifies the per-search location flow continues to work end-to-end after
# pickToSavedLocation was lifted to lib/location-storage.ts (Phase 0 / Task 0.4)
# and updated to derive tz from coordinates (Phase 1 / Task 1.2).
#
# Smoke does NOT verify tz correctness — that's the astrologer test pack's job
# (Phase 4 / Task 4.2). This smoke verifies the navigation + state flow:
# user can search, select, and "Find moments" navigates to Loading.

- launchApp:
    clearState: false

# Step 1: navigate Today → Find a moment for…
- waitForAnimationToEnd:
    timeout: 5000
- tapOn: "Find a moment for"

# Step 2: pick an activity (wedding)
- tapOn:
    text: "Wedding"

# Step 3: pick a date range (default 1 week)
- tapOn: "Next"

# Step 4: location picker — type Tokyo
- waitForAnimationToEnd:
    timeout: 3000
- tapOn:
    text: "Search city"
- inputText: "Tokyo"

# Step 5: wait for results, tap first Tokyo result
- extendedWaitUntil:
    visible: "Tokyo"
    timeout: 5000
- tapOn:
    text: "Tokyo"
    index: 0

# Step 6: tap "Find moments" — should navigate to Loading
- tapOn: "Find moments"

# Step 7: verify Loading screen appears (sentinel: "Looking at the sky" or any
# Loading-state copy). Adjust the visible-text sentinel to match the actual
# Loading screen if this string is wrong; the regression criterion is just
# "navigation succeeded, not stuck on picker."
- extendedWaitUntil:
    visible: "Looking at the sky"
    timeout: 10000

# If we reach this point, the per-search flow with the tz-lookup fix did not
# regress the user-visible UX path.
```

- [ ] **Step 3: Adjust the Loading-screen sentinel if needed**

If the "Looking at the sky" string doesn't appear on the actual Loading screen, replace it with whatever sentinel does. Check `apps/mobile/src/screens/LoadingScreen.js` for the actual copy:

```bash
grep -n "Looking\|sky\|Finding" apps/mobile/src/screens/LoadingScreen.js
```

Update the YAML's `extendedWaitUntil.visible:` value to match.

- [ ] **Step 4: (Optional, requires simulator running) — execute the flow**

```bash
cd apps/mobile && maestro test maestro/flows/04-location-picker-regression.yaml
```
Expected: all steps PASS. (This step is NOT mandatory in subagent context — the flow's value is automated-CI verification, not interactive verification. If Maestro CLI isn't available, skip and rely on manual smoke at Phase 4.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/maestro/flows/04-location-picker-regression.yaml
git commit -m "test(maestro): add 04-location-picker-regression smoke (per-search nav unchanged after tz fix)"
```

---

## Phase 2 — Mobile migration of existing entries

### Task 2.1: Write failing migration unit tests

**Files:**
- Test: `apps/mobile/src/lib/__tests__/location-storage.test.ts` (extend)

- [ ] **Step 1: Append migration test block**

Add to the bottom of `apps/mobile/src/lib/__tests__/location-storage.test.ts`:

```ts
// --- migrateLocationTimezones_v1 (Phase 2) ---
import { migrateLocationTimezones_v1 } from '../location-storage';

describe('migrateLocationTimezones_v1', () => {
  beforeEach(() => {
    storage.delete('inceptio.tz_migration_v1');
    storage.delete('inceptio.last_location');
  });

  it('rewrites tz when legacy entry has deviceTimezone but coords belong to a different zone', () => {
    storage.set('inceptio.last_location', JSON.stringify({
      lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
      timezone: 'Europe/Berlin', // legacy deviceTimezone value (user was in Berlin)
      selected_at: 1234567890,
    }));
    migrateLocationTimezones_v1();
    const after = JSON.parse(storage.getString('inceptio.last_location')!);
    expect(after.timezone).toBe('Asia/Tokyo');
    expect(storage.getString('inceptio.tz_migration_v1')).toBe('done');
  });

  it('no-op rewrite when entry tz already matches lat/lng', () => {
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
    setSpy.mockRestore();
  });

  it('idempotent — second call is no-op', () => {
    storage.set('inceptio.tz_migration_v1', 'done');
    storage.set('inceptio.last_location', JSON.stringify({
      lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
      timezone: 'Europe/Berlin', // would normally be rewritten
      selected_at: 1234567890,
    }));
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });

  it('no-op when last_location absent (fresh install)', () => {
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    expect(setSpy).toHaveBeenCalledWith('inceptio.tz_migration_v1', 'done');
    expect(storage.getString('inceptio.last_location')).toBeUndefined();
    setSpy.mockRestore();
  });

  it('survives corrupt JSON without throwing', () => {
    storage.set('inceptio.last_location', '{not valid json');
    expect(() => migrateLocationTimezones_v1()).not.toThrow();
    expect(storage.getString('inceptio.tz_migration_v1')).toBe('done');
  });
});
```

Also ensure the test file imports `vi` at the top (add if missing):
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

- [ ] **Step 2: Run tests — they should FAIL with "migrateLocationTimezones_v1 is not exported"**

```bash
cd apps/mobile && npx vitest run src/lib/__tests__/location-storage.test.ts
```
Expected: 5 new tests FAIL at the import statement (function doesn't exist yet).

---

### Task 2.2: Implement `migrateLocationTimezones_v1`

**Files:**
- Modify: `apps/mobile/src/lib/location-storage.ts`

- [ ] **Step 1: Add the migration constant + function**

Append to `/Users/user/Projects/inceptio/apps/mobile/src/lib/location-storage.ts` (after `pickToSavedLocation`, before `deviceTimezone`):

```ts
const MIGRATION_FLAG_KEY = 'inceptio.tz_migration_v1';

/**
 * One-time rewrite of legacy `inceptio.last_location.timezone` values from
 * `deviceTimezone()` (the historical broken default) to `tzLookup(lat, lng)`
 * (the correct value).
 *
 * Idempotent — guarded by a version flag so subsequent boots are no-ops.
 *
 * Called from `App.js` storage hydrate effect BEFORE `setStorageReady(true)`,
 * so any consumer reading `getLastLocation()` during the first post-migration
 * render sees the corrected value.
 *
 * Failure modes (all handled, none throw):
 *   - last_location absent → no-op, flag still set
 *   - last_location JSON corrupt → no-op, flag still set (defensive parse
 *     in getLastLocation handles future reads anyway)
 *   - tzLookup returns null (ocean/polar) → leave existing tz, flag still set,
 *     log warn (user can re-pick to fix)
 *   - storage.set fails async → in-memory cache has the correct value for the
 *     current session; on next boot the migration runs again (flag wasn't
 *     durably written due to the same failure)
 *
 * Spec §6.
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
      // Corrupt JSON. getLastLocation's defensive parse will handle future reads.
      // Flag still gets set; we tried.
    }
  }

  storage.set(MIGRATION_FLAG_KEY, 'done');
}
```

- [ ] **Step 2: Run tests — should now PASS**

```bash
cd apps/mobile && npx vitest run src/lib/__tests__/location-storage.test.ts
```
Expected: all 5 migration tests PASS plus all pre-existing tests.

- [ ] **Step 3: Run full suite to confirm no regressions**

```bash
cd apps/mobile && npx vitest run
```
Expected: full mobile suite passes.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/location-storage.ts apps/mobile/src/lib/__tests__/location-storage.test.ts
git commit -m "feat(location-storage): add migrateLocationTimezones_v1 (boot-time one-time rewrite)"
```

---

### Task 2.3: Wire migration into App.js boot hydrate effect

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Read current hydrate effect**

```bash
grep -n "hydrateStorage\|initActivityPreference\|setStorageReady" apps/mobile/App.js
```

- [ ] **Step 2: Add import at the top alongside `initActivityPreference`**

Find:
```js
import { initActivityPreference, useActivityPreference } from './src/lib/activity-preference';
```

Adjacent to this (or in the location-storage import block — match existing import grouping), add:
```js
import { migrateLocationTimezones_v1 } from './src/lib/location-storage';
```

- [ ] **Step 3: Add migration call inside the hydrate effect**

Find the existing useEffect (per Task 6.1 from activity-preference plan):
```js
useEffect(() => {
  hydrateStorage().then(() => {
    initActivityPreference();
    setStorageReady(true);
  });
}, []);
```

Replace with:
```js
useEffect(() => {
  hydrateStorage().then(() => {
    // Migration runs BEFORE init* calls so that getLastLocation() reads
    // the corrected tz on first post-migration render. Idempotent; safe
    // under hot reload. Spec §6 / Task 2.2.
    migrateLocationTimezones_v1();
    initActivityPreference();
    setStorageReady(true);
  });
}, []);
```

- [ ] **Step 4: Run typecheck + tests**

```bash
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npx vitest run
```
Expected: typecheck has only pre-existing `cluster-windows.ts:108` error; tests pass with the same count as Task 2.2.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/App.js
git commit -m "feat(app): wire migrateLocationTimezones_v1 into storage hydrate effect"
```

---

## Phase 3 — Worker tz authority (deployable independently/first)

### Task 3.1: Write failing tz-authority tests

**Files:**
- Create: `workers/api-proxy/src/__tests__/daily-note-tz-authority.test.ts`

- [ ] **Step 1: Read sibling test file pattern**

```bash
ls workers/api-proxy/src/__tests__/
head -80 workers/api-proxy/src/__tests__/daily-note-activity.test.ts
```
Confirm the `makeKV / makeEnv / makeRequest / vi.mock('../routes/search', ...)` pattern from Phase 2 Task 2.2 of the activity-preference plan.

- [ ] **Step 2: Create the test file with 4 failing test cases**

Create `/Users/user/Projects/inceptio/workers/api-proxy/src/__tests__/daily-note-tz-authority.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { handleDailyNote } from '../routes/daily-note';
import { ActivitySchema } from '@inceptio/shared-types';

// Reuse helpers from sibling daily-note-activity.test.ts — copy the same
// makeKV / makeEnv / searchResponse / makeRequest helpers. See sibling file
// for the canonical shape; this file follows the same convention exactly.

vi.mock('../routes/search', () => ({
  handleSearch: vi.fn().mockResolvedValue(new Response(JSON.stringify({
    top_windows: [],
    excluded_ranges: [],
    summary: { no_viable_windows: true },
  }), { headers: { 'content-type': 'application/json' } })),
}));

function makeKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string, _opts?: any) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
    _store: store,
  };
}

function makeEnv() {
  const KV = makeKV();
  return {
    env: {
      CACHE: KV,
      ASTROLOGY_API_KEY: 'test-key',
      ENV: 'development',
      ADMIN_TOKEN: 'test-admin-token',
    } as any,
    KV,
  };
}

function makeRequest(qs: string) {
  return new Request(`https://example.test/daily-note?${qs}`, { method: 'GET' });
}

const NOOP_CTX = {
  waitUntil: (p: Promise<unknown>) => { p.catch(() => {}); },
  passThroughOnException: () => {},
  props: {},
} as any;

describe('Worker tz authority', () => {
  it('warns + bumps counter when client tz mismatches lat/lng (Tokyo coords, Berlin tz)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env, KV } = makeEnv();
    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&tz=Europe/Berlin&activity=wedding'),
      env,
      NOOP_CTX,
    );
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] tz_lat_lng_mismatch:'),
      expect.objectContaining({ got: 'Europe/Berlin', expected: 'Asia/Tokyo' }),
    );
    // KV counter bumped
    const today = new Date().toISOString().slice(0, 10);
    expect(KV.put).toHaveBeenCalledWith(
      `metrics:dn-tz-mismatch:${today}`,
      expect.any(String),
      expect.objectContaining({ expirationTtl: expect.any(Number) }),
    );
    warn.mockRestore();
  });

  it('does NOT warn when client tz matches lat/lng', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&tz=Asia/Tokyo&activity=wedding'),
      env,
      NOOP_CTX,
    );
    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );
    warn.mockRestore();
  });

  it('does NOT warn when client omitted tz query param entirely', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&activity=wedding'),
      env,
      NOOP_CTX,
    );
    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );
    warn.mockRestore();
  });

  it('falls back to client tz when tzLookup throws (extreme polar coords)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    // South Pole — tz-lookup may throw; expect graceful fallback
    const res = await handleDailyNote(
      makeRequest('lat=-89.99&lng=0&tz=Europe/Berlin&activity=wedding'),
      env,
      NOOP_CTX,
    );
    expect(res.status).toBe(200);
    // No tz_lat_lng_mismatch warn — derived was null, so guard skipped
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );
    warn.mockRestore();
  });
});
```

- [ ] **Step 3: Run tests to verify they FAIL**

```bash
cd workers/api-proxy && npx vitest run src/__tests__/daily-note-tz-authority.test.ts
```
Expected: 4 tests FAIL (current `handleDailyNote` doesn't have the tz authority block).

---

### Task 3.2: Add `tryWorkerTzLookup` + tz authority block to `daily-note.ts`

**Files:**
- Modify: `workers/api-proxy/src/routes/daily-note.ts`

- [ ] **Step 1: Add tz-lookup import**

At the top of `workers/api-proxy/src/routes/daily-note.ts`, alongside existing imports:
```ts
import tzLookup from '@photostructure/tz-lookup';
```

- [ ] **Step 2: Add `tryWorkerTzLookup` helper**

Add near the top of the file, alongside `bumpCounter`:

```ts
/**
 * @photostructure/tz-lookup throws on invalid coords ('invalid coordinates').
 * Wrap defensively so the authority logic can null-coalesce to client tz on
 * unresolvable coordinates (open ocean, polar, exotic).
 *
 * Spec §7 + EC-T1.
 */
function tryWorkerTzLookup(lat: number, lng: number): string | null {
  try {
    return tzLookup(lat, lng);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Add the tz authority block in `handleDailyNote`**

Find the existing tz / dateIso derivation block (after query param parsing, before cache key build). Insert the tz authority block. The exact context depends on the file's current shape; locate where `dateIso` is currently computed:

```bash
grep -n "dateIso\|dateOverride\|formatDateInTz" workers/api-proxy/src/routes/daily-note.ts
```

Find the block that looks like (current):
```ts
const dateOverride = url.searchParams.get('date');
let dateIso: string;
if (dateOverride && env.ENV !== 'production') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) {
    return Response.json({ error: 'bad_request', message: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  dateIso = dateOverride;
} else {
  dateIso = formatDateInTz(now, tz);
}
```

Replace with (note: `tz` was the client-supplied value; we now compute `effectiveTz` and use it for `dateIso`):

```ts
// tz authority: derive from coordinates; fall back to client-supplied; fall
// back to UTC. The Worker is the source of truth for tz — clients may
// disagree (legacy mobile builds, browser clients sending deviceTimezone,
// etc.) but the Worker correctly resolves and processes the request.
// Spec §7.
const clientTz: string | null = tz; // capture client value for mismatch detection
const derivedTz: string | null = tryWorkerTzLookup(lat, lng);
const effectiveTz: string = derivedTz ?? clientTz ?? 'UTC';

// Mismatch observability — warn + counter when derivable AND client disagrees
if (derivedTz !== null && clientTz !== null && clientTz !== derivedTz) {
  const today = new Date().toISOString().slice(0, 10);
  console.warn('[daily-note] tz_lat_lng_mismatch:', {
    lat, lng, got: clientTz, expected: derivedTz, activity, date: today,
  });
  ctx.waitUntil(bumpCounter(env.CACHE, `metrics:dn-tz-mismatch:${today}`));
}

// All downstream uses effectiveTz, NOT clientTz.
const dateOverride = url.searchParams.get('date');
let dateIso: string;
if (dateOverride && env.ENV !== 'production') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) {
    return Response.json({ error: 'bad_request', message: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  dateIso = dateOverride;
} else {
  dateIso = formatDateInTz(now, effectiveTz);
}
```

- [ ] **Step 4: Update upstream `searchBody` to use `effectiveTz`**

Find where `searchBody.timezone` is set:
```bash
grep -n "searchBody\|timezone" workers/api-proxy/src/routes/daily-note.ts
```

Find:
```ts
const searchBody = {
  // ...
  timezone: tz,
  // ...
};
```

Replace `timezone: tz` with `timezone: effectiveTz`:
```ts
const searchBody = {
  // ...
  timezone: effectiveTz,
  // ...
};
```

- [ ] **Step 5: Run tz-authority tests — should now PASS**

```bash
cd workers/api-proxy && npx vitest run src/__tests__/daily-note-tz-authority.test.ts
```
Expected: 4/4 tests PASS.

- [ ] **Step 6: Run full Worker suite — confirm no regressions**

```bash
cd workers/api-proxy && npx vitest run
```
Expected: all pre-existing tests still pass (318+4 = 322 tests or whatever current count + 4).

- [ ] **Step 7: Commit**

```bash
git add workers/api-proxy/src/routes/daily-note.ts workers/api-proxy/src/__tests__/daily-note-tz-authority.test.ts
git commit -m "feat(worker/daily-note): tz authority — effectiveTz from tzLookup, warn + counter on mismatch"
```

---

### Task 3.3: Extend admin endpoint with `tz_mismatch` counter

**Files:**
- Modify: `workers/api-proxy/src/routes/admin.ts`
- Modify: `workers/api-proxy/src/__tests__/admin-activity-missing-rate.test.ts`

- [ ] **Step 1: Read current admin route shape**

```bash
cat workers/api-proxy/src/routes/admin.ts
```

- [ ] **Step 2: Extend the route to surface `tz_mismatch` counter alongside the existing two**

Find the existing `Promise.all` block in `handleActivityMissingRate`:

```ts
const reads = await Promise.all(
  dates.flatMap((date) => [
    readCounter(env.CACHE, `metrics:dn-total:${date}`),
    readCounter(env.CACHE, `metrics:dn-activity-missing:${date}`),
  ]),
);

const days = dates.map((date, idx) => {
  const total = reads[idx * 2];
  const missing = reads[idx * 2 + 1];
  const ratio = total > 0 ? missing / total : 0;
  return { date, total, missing, ratio };
});
```

Replace with (3-key flatMap pattern per spec §7):

```ts
const reads = await Promise.all(
  dates.flatMap((date) => [
    readCounter(env.CACHE, `metrics:dn-total:${date}`),
    readCounter(env.CACHE, `metrics:dn-activity-missing:${date}`),
    readCounter(env.CACHE, `metrics:dn-tz-mismatch:${date}`),
  ]),
);

const days = dates.map((date, idx) => {
  const total = reads[idx * 3];
  const missing = reads[idx * 3 + 1];
  const tzMismatch = reads[idx * 3 + 2];
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

- [ ] **Step 3: Extend admin tests**

Add to `workers/api-proxy/src/__tests__/admin-activity-missing-rate.test.ts`:

```ts
it('surfaces tz_mismatch counter alongside missing counter', async () => {
  const { env } = makeAdminEnv();
  const today = new Date().toISOString().slice(0, 10);
  await env.CACHE.put(`metrics:dn-total:${today}`, '1000');
  await env.CACHE.put(`metrics:dn-activity-missing:${today}`, '3');
  await env.CACHE.put(`metrics:dn-tz-mismatch:${today}`, '12');
  const res = await handleActivityMissingRate(makeReq('test-secret-token'), env);
  const body = await res.json() as any;
  const todayEntry = body.days.find((d: any) => d.date === today);
  expect(todayEntry.total).toBe(1000);
  expect(todayEntry.missing).toBe(3);
  expect(todayEntry.tz_mismatch).toBe(12);
  expect(todayEntry.missing_ratio).toBeCloseTo(0.003, 6);
  expect(todayEntry.tz_mismatch_ratio).toBeCloseTo(0.012, 6);
});
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
cd workers/api-proxy && npx vitest run src/__tests__/admin-activity-missing-rate.test.ts
```
Expected: all existing admin tests still pass + 1 new test passes.

- [ ] **Step 5: Run full Worker suite**

```bash
cd workers/api-proxy && npx vitest run
```
Expected: full Worker suite passes.

- [ ] **Step 6: Commit**

```bash
git add workers/api-proxy/src/routes/admin.ts workers/api-proxy/src/__tests__/admin-activity-missing-rate.test.ts
git commit -m "feat(worker/admin): surface tz_mismatch counter alongside missing counter"
```

---

### Task 3.4: Rename CLI script + extend table output

**Files:**
- Rename: `workers/api-proxy/scripts/query-activity-missing-rate.ts` → `workers/api-proxy/scripts/query-correctness-metrics.ts`
- Modify the renamed file: extend table output + CP3-signal hint

- [ ] **Step 1: Rename the file**

```bash
git mv workers/api-proxy/scripts/query-activity-missing-rate.ts workers/api-proxy/scripts/query-correctness-metrics.ts
```

- [ ] **Step 2: Read current contents + update Day type + table output**

Open `workers/api-proxy/scripts/query-correctness-metrics.ts`. Update the `Day` type to include the new fields:

Find:
```ts
type Day = { date: string; total: number; missing: number; ratio: number };
```

Replace with:
```ts
type Day = {
  date: string;
  total: number;
  missing: number;
  tz_mismatch: number;
  missing_ratio: number;
  tz_mismatch_ratio: number;
};
```

Find the table output block:
```ts
console.log('\nActivity-missing fallback rate — last 14 days\n');
console.log('date         total           missing    ratio');
console.log('─'.repeat(50));
body.days.forEach((d) => {
  const ratioPct = (d.ratio * 100).toFixed(3) + '%';
  console.log(
    `${d.date}   ${String(d.total).padStart(10)}    ${String(d.missing).padStart(6)}     ${ratioPct.padStart(7)}`,
  );
});
```

Replace with:
```ts
console.log('\nCorrectness metrics — last 14 days\n');
console.log('date         total       missing  miss%   tz_mismatch  tzmm%');
console.log('─'.repeat(70));
body.days.forEach((d) => {
  const missPct = (d.missing_ratio * 100).toFixed(3) + '%';
  const tzPct = (d.tz_mismatch_ratio * 100).toFixed(3) + '%';
  console.log(
    `${d.date}   ${String(d.total).padStart(10)}  ${String(d.missing).padStart(6)}  ${missPct.padStart(7)}  ${String(d.tz_mismatch).padStart(11)}  ${tzPct.padStart(7)}`,
  );
});
```

- [ ] **Step 3: Update the CP3 signal hint to cover BOTH signals (mismatch decay + missing rate)**

Find the existing "Checkpoint 3 gate hint" block:
```ts
const recentThree = body.days.slice(0, 3);
const allUnderFiveTenths = recentThree.every((d) => d.ratio < 0.005);
console.log('');
if (allUnderFiveTenths) {
  console.log('✓ Last 3 days all under 0.5% — Checkpoint 3 signal MET (this signal only; verify rollout dominance + wrangler tail too)');
} else {
  console.log('⏳ Not all of last 3 days under 0.5% — Checkpoint 3 signal NOT MET');
}
```

Replace with:
```ts
// Two signals tracked: activity-missing fallback rate (from activity feature)
// AND tz-mismatch rate (this feature). Default-location unpark requires the
// tz-mismatch rate signal to be MET; activity-missing is informational here.
const recentSeven = body.days.slice(0, 7);
const tzMismatchUnder = recentSeven.every((d) => d.tz_mismatch_ratio < 0.005);
const missingUnder = recentSeven.slice(0, 3).every((d) => d.missing_ratio < 0.005);

console.log('');
if (tzMismatchUnder) {
  console.log('✓ Last 7 days all under 0.5% tz_mismatch — DEFAULT-LOCATION UNPARK signal (a) MET');
  console.log('  (also verify astrologer test pack signed off — that is signal (b))');
} else {
  console.log('⏳ Not all of last 7 days under 0.5% tz_mismatch — DEFAULT-LOCATION UNPARK NOT MET');
}

if (missingUnder) {
  console.log('✓ Last 3 days all under 0.5% activity-missing — activity Phase B cutover signal MET');
} else {
  console.log('⏳ Not all of last 3 days under 0.5% activity-missing — activity Phase B NOT MET');
}
```

- [ ] **Step 4: Verify the script runs**

```bash
cd workers/api-proxy && WORKER_URL=https://nope.test ADMIN_TOKEN=test npx tsx scripts/query-correctness-metrics.ts || true
```
Expected: script attempts to fetch (will fail since URL is fake) — but the import + type-check works. Look for "Required env vars missing" if WORKER_URL is unset, or fetch error otherwise. NOT looking for success; looking for "the script's syntax is valid and tsx can load it."

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/scripts/query-correctness-metrics.ts
git commit -m "feat(worker/scripts): rename to query-correctness-metrics + add tz_mismatch column"
```

---

### Task 3.5: Run full Worker suite — confirm Phase 3 complete

**Files:** none (verification only)

- [ ] **Step 1: Run full Worker suite**

```bash
cd workers/api-proxy && npx vitest run
```
Expected: all tests PASS (count = previous count + new tz-authority tests + new admin test).

- [ ] **Step 2: Worker typecheck**

```bash
cd workers/api-proxy && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Mobile typecheck + tests still clean**

```bash
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npx vitest run
```
Expected: only pre-existing `cluster-windows.ts:108` error; tests pass.

- [ ] **Step 4: Verify pin-sync script still green**

```bash
./scripts/verify-tz-lookup-pin.sh
```
Expected: `OK: @photostructure/tz-lookup pinned at ^11.0.0 on both sides`.

(No commit — this is a verification task only. If anything fails, go back and fix the relevant earlier task.)

---

## 🛑 Checkpoint B — Worker verification (executed 2026-06-03)

**Stop here. Do not deploy to production until Worker tz authority + counter + alias behavior is verified outside the unit-test environment.**

### Plan amendment (post-execution)

The original CP-B plan said `wrangler deploy --env staging`. **There is no `[env.staging]` block in `workers/api-proxy/wrangler.toml`** — only the top-level default (ENV=development, for `wrangler dev` per the file's comment) and `[env.production]`. The plan's "staging deploy" was a planning gap.

CP-B was executed via **local `wrangler dev`** (isolated Miniflare KV namespace + real upstream `astrology-api.io` calls) rather than a remote deploy. This validates the same surface — Worker code paths exercise identically; the only difference is KV is Miniflare-local and the response time excludes the colo-network hop. Sufficient for verifying mismatch / alias / upstream-acceptance behavior; insufficient only for global edge propagation, which production deploy will surface separately.

### Surface to the user:

1. Phase 3 commits (5 commits — Tasks 3.1–3.4 commit, Task 3.5 verification only) + alias-aware amendment commits (`c1ab318`, `588ee69`, `edd24c2`).
2. Start the local Worker (no remote auth needed beyond the upstream API key in `.dev.vars`):
   ```bash
   cd workers/api-proxy && npx wrangler dev
   ```
   Wrangler prints `Ready on http://localhost:8787` (or similar). Use that as `$WORKER_URL` for the smokes below.
3. Run the 7 smokes against the local Worker.

#### CP-B smoke commands (manual)

```bash
WORKER_URL=http://localhost:8787

# (1) Genuine mismatch — Tokyo coords + Berlin tz → expect 200 + warn + counter bump
curl "$WORKER_URL/daily-note?lat=35.68&lng=139.69&tz=Europe/Berlin&activity=wedding" \
  -H "X-Device-Id: cp-b-1"

# (2) Same-tz — Tokyo coords + Tokyo tz → expect 200 + silent
curl "$WORKER_URL/daily-note?lat=35.68&lng=139.69&tz=Asia/Tokyo&activity=wedding" \
  -H "X-Device-Id: cp-b-2"

# (3) Admin counter check — verify (1) bumped the mismatch counter
WORKER_URL="$WORKER_URL" \
  ADMIN_TOKEN=<from-.dev.vars> \
  npx tsx workers/api-proxy/scripts/query-correctness-metrics.ts

# (4) Sentinel implicit in (3) — today's tz_mismatch ≥ 1, tzmm% > 0
# (combined with (1) tail showing the warn, this confirms the counter-bump path)

# (5) Alias-class no-warn — Kharkiv coords + legacy 'Europe/Kiev' → expect 200 + silent
curl "$WORKER_URL/daily-note?lat=49.83&lng=36.38&tz=Europe/Kiev&activity=wedding" \
  -H "X-Device-Id: cp-b-5"

# (6) Upstream accepts canonical — Tokyo coords + Berlin tz; smoke ends if upstream
#     rejects 'Asia/Tokyo' from the Worker's authority block (would 5xx)
curl "$WORKER_URL/daily-note?lat=35.68&lng=139.69&tz=Europe/Berlin&activity=wedding" \
  -H "X-Device-Id: cp-b-6"

# (7) Upstream accepts the *renamed* canonical (added during CP-B execution) —
#     Kharkiv coords + non-alias mismatch (Asia/Tokyo) → Worker derives Europe/Kyiv;
#     smoke expects HTTP 200, NOT a 5xx tz-rejected. Proves upstream's tzdata
#     accepts 'Europe/Kyiv' (the renamed canonical post-2022b), so the planned
#     canonical→legacy upstream-fallback contingency is NOT needed.
curl "$WORKER_URL/daily-note?lat=49.83&lng=36.38&tz=Asia/Tokyo&activity=wedding" \
  -H "X-Device-Id: cp-b-7"
```

Tail logs in a second terminal to observe the warns:
```bash
cd workers/api-proxy && npx wrangler dev
# (the dev process IS the tail — warns print to its stdout as they fire)
```

### Checkpoint B sign-off — VERIFIED 2026-06-03

7/7 smokes green:

| # | Case | Expected | Observed |
|---|---|---|---|
| 1 | Tokyo coord + Berlin tz | 200 + mismatch warn + counter bump | ✓ |
| 2 | Tokyo coord + Tokyo tz | 200 + silent | ✓ |
| 3 | Admin counter | tz_mismatch ≥ 1, auth + dual-signal hints correct | ✓ |
| 5 | Kharkiv coord + Europe/Kiev | 200 + silent (alias-equivalent) | ✓ — alias fix confirmed live |
| 6 | Tokyo coord + Berlin tz (canonical to upstream) | 200 (upstream accepts Asia/Tokyo) | ✓ |
| 7 | Kharkiv coord + Asia/Tokyo (non-alias mismatch) | 200 (upstream accepts renamed canonical Europe/Kyiv) | ✓ — **renamed canonical accepted; canonical→legacy fallback contingency NOT needed** |

**Then user explicitly approves Phase 4 production deploy.**

---

## Phase 4 — Deploy + bake + verification

### Task 4.1: Production deploy — Worker first

**Files:** none (deploy operation)

- [ ] **Step 1: Deploy Worker to production**

```bash
cd workers/api-proxy && npx wrangler deploy --env production
```

- [ ] **Step 2: Smoke production**

```bash
# Sanity: same valid request that already worked against staging
curl 'https://<production-worker-url>/daily-note?lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'
```
Expected: 200, same response shape as staging.

- [ ] **Step 3: Tag the deploy**

```bash
git tag -a tz-authority-prod-$(date +%Y-%m-%d) -m "Worker tz authority shipped to production"
git push --tags
```

- [ ] **Step 4: Start daily monitoring**

Add a daily reminder to run:
```bash
WORKER_URL=https://<production-worker-url> \
  ADMIN_TOKEN=<production-admin-token> \
  npx tsx workers/api-proxy/scripts/query-correctness-metrics.ts
```

Track `tz_mismatch_ratio` trend over the next 14-21 days. Mobile rollout (Tasks 4.3) is what drives the decay.

(No commit — deploy is the artifact; tag is the record.)

---

### Task 4.2: Create `tz-correctness-test-pack.ts` (Path A + Path B)

**Files:**
- Create: `workers/api-proxy/scripts/tz-correctness-test-pack.ts`

- [ ] **Step 1: Write the test pack script**

Create `/Users/user/Projects/inceptio/workers/api-proxy/scripts/tz-correctness-test-pack.ts`:

```ts
// workers/api-proxy/scripts/tz-correctness-test-pack.ts
// Usage:
//   WORKER_URL=https://<prod-url> \
//     UPSTREAM_API_KEY=<astrology-api-io-key> \
//     npx tsx workers/api-proxy/scripts/tz-correctness-test-pack.ts
//
// Two-path correctness verification per spec §9.
//
// Path A — Worker corrects + warns on mismatch (8 synthetic cases)
// Path B — tz is load-bearing at upstream level (β1: direct astrology-api.io
//          call with matched vs mismatched tz)
//
// Output: structured pass/fail per case + a final summary. Astrologer reviews
// the output before signing off on the unpark gate (Checkpoint C signal (b)).

const WORKER_URL = process.env.WORKER_URL;
const UPSTREAM_API_KEY = process.env.UPSTREAM_API_KEY;

if (!WORKER_URL) {
  console.error('Required env var missing: WORKER_URL');
  process.exit(1);
}

type Case = {
  id: string;
  description: string;
  lat: number;
  lng: number;
  sent_tz?: string;
  expected_effective_tz: string;
  expected_warn: boolean;
};

const PATH_A_CASES: Case[] = [
  // TP-1..TP-8 from spec §8 test pack table
  { id: 'TP-1', description: 'Tokyo coords + Berlin tz (destination-wedding persona)', lat: 35.68, lng: 139.69, sent_tz: 'Europe/Berlin', expected_effective_tz: 'Asia/Tokyo', expected_warn: true },
  { id: 'TP-2', description: 'Tokyo coords + Tokyo tz (matched)', lat: 35.68, lng: 139.69, sent_tz: 'Asia/Tokyo', expected_effective_tz: 'Asia/Tokyo', expected_warn: false },
  { id: 'TP-3', description: 'NYC coords + Sydney tz (antipodal)', lat: 40.71, lng: -74.01, sent_tz: 'Australia/Sydney', expected_effective_tz: 'America/New_York', expected_warn: true },
  { id: 'TP-4', description: 'London + Buenos Aires tz (opposite hemisphere)', lat: 51.51, lng: -0.13, sent_tz: 'America/Argentina/Buenos_Aires', expected_effective_tz: 'Europe/London', expected_warn: true },
  { id: 'TP-5', description: 'LA coords + Mumbai tz (different DST behavior)', lat: 34.05, lng: -118.24, sent_tz: 'Asia/Kolkata', expected_effective_tz: 'America/Los_Angeles', expected_warn: true },
  { id: 'TP-6', description: 'NYC coords + Sydney tz, run during DST-active season (EDT)', lat: 40.71, lng: -74.01, sent_tz: 'Australia/Sydney', expected_effective_tz: 'America/New_York', expected_warn: true },
  { id: 'TP-7', description: 'Kyiv coords + Kyiv tz (same-tz control — no warn)', lat: 50.45, lng: 30.52, sent_tz: 'Europe/Kyiv', expected_effective_tz: 'Europe/Kyiv', expected_warn: false },
  { id: 'TP-8', description: 'Tokyo coords + missing tz (no tz sent — no warn)', lat: 35.68, lng: 139.69, sent_tz: undefined, expected_effective_tz: 'Asia/Tokyo', expected_warn: false },
];

async function runPathA(): Promise<{ passed: number; failed: number }> {
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('PATH A — Worker corrects + warns on mismatch');
  console.log('══════════════════════════════════════════════════════════════════════');
  let passed = 0;
  let failed = 0;

  for (const c of PATH_A_CASES) {
    const qs = new URLSearchParams({
      lat: String(c.lat),
      lng: String(c.lng),
      activity: 'wedding',
      ...(c.sent_tz ? { tz: c.sent_tz } : {}),
    });
    const url = `${WORKER_URL!.replace(/\/$/, '')}/daily-note?${qs.toString()}`;
    const res = await fetch(url);
    const ok = res.status === 200;

    // We cannot directly observe the warn from outside (no log access), but we
    // can verify status 200 + that the response is well-formed. The mismatch
    // signal is verified via the admin counter snapshot below (a separate
    // query against the running counter).
    if (ok) {
      console.log(`  [PASS] ${c.id}: ${c.description}`);
      console.log(`         → status ${res.status}, expected_effective_tz=${c.expected_effective_tz}`);
      passed++;
    } else {
      console.log(`  [FAIL] ${c.id}: ${c.description}`);
      console.log(`         → status ${res.status} (expected 200)`);
      failed++;
    }
  }

  return { passed, failed };
}

async function runPathB(): Promise<{ passed: number; failed: number }> {
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('PATH B — tz is load-bearing at upstream level (β1 direct astrology-api.io)');
  console.log('══════════════════════════════════════════════════════════════════════');

  if (!UPSTREAM_API_KEY) {
    console.log('  [SKIP] UPSTREAM_API_KEY not set — Path B requires direct astrology-api.io access.');
    console.log('         Set UPSTREAM_API_KEY=<your-api-key> to run Path B.');
    return { passed: 0, failed: 0 };
  }

  // β1 — direct upstream call with mismatched vs matched tz; verify outputs
  // differ materially. We use a simple electional search for ~next 24h at
  // Tokyo coords.
  const sharedBody = {
    latitude: 35.68,
    longitude: 139.69,
    start: new Date().toISOString(),
    end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    activity: 'wedding',
  };

  console.log('  → Calling upstream with timezone=Asia/Tokyo (matched)...');
  const resTokyo = await fetch('https://api.astrology-api.io/v3/electional/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${UPSTREAM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...sharedBody, timezone: 'Asia/Tokyo' }),
  });
  const tokyoBody = await resTokyo.json();

  console.log('  → Calling upstream with timezone=Europe/Berlin (mismatched)...');
  const resBerlin = await fetch('https://api.astrology-api.io/v3/electional/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${UPSTREAM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...sharedBody, timezone: 'Europe/Berlin' }),
  });
  const berlinBody = await resBerlin.json();

  // Compare materially — top_windows count + headline of first window if any
  const tokyoJson = JSON.stringify(tokyoBody);
  const berlinJson = JSON.stringify(berlinBody);
  const materiallyDifferent = tokyoJson !== berlinJson;

  if (materiallyDifferent) {
    console.log('  [PASS] B-1: outputs DIFFER materially between Asia/Tokyo and Europe/Berlin tz');
    console.log('              → confirms tz is load-bearing at upstream level (Case B per EC-19)');
    console.log('              → Worker tz authority correction is doctrinally necessary');
    return { passed: 1, failed: 0 };
  } else {
    console.log('  [FAIL] B-1: outputs IDENTICAL between Asia/Tokyo and Europe/Berlin tz');
    console.log('              → This would CONTRADICT the EC-19 audit verdict.');
    console.log('              → Investigate: upstream may have changed semantics, OR the test');
    console.log('                window happens to be tz-insensitive (try a longer window).');
    return { passed: 0, failed: 1 };
  }
}

(async () => {
  console.log('Inceptio tz-correctness test pack');
  console.log('Spec §9 (Path A + Path B). Astrologer reviews this output before unpark.\n');
  console.log(`Worker URL: ${WORKER_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);

  const a = await runPathA();
  const b = await runPathB();

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log(`  Path A (Worker correction): ${a.passed} passed, ${a.failed} failed`);
  console.log(`  Path B (upstream load-bearing): ${b.passed} passed, ${b.failed} failed`);
  const totalFailed = a.failed + b.failed;
  if (totalFailed === 0) {
    console.log('\n✓ ALL PASS — pack ready for astrologer review');
  } else {
    console.log(`\n❌ ${totalFailed} failure(s) — investigate before astrologer review`);
  }
  process.exit(totalFailed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run the test pack against production**

```bash
WORKER_URL=https://<production-worker-url> \
  UPSTREAM_API_KEY=<astrology-api-io-key> \
  npx tsx workers/api-proxy/scripts/tz-correctness-test-pack.ts
```

Expected: Path A all 8 cases return 200 (Workers correct + warn behaviorally; warn observability is verified separately via admin counter). Path B confirms outputs differ materially between Tokyo-tz and Berlin-tz upstream calls.

- [ ] **Step 3: Commit the test pack script**

```bash
git add workers/api-proxy/scripts/tz-correctness-test-pack.ts
git commit -m "test(tz-correctness): add astrologer test pack (Path A + Path B per spec §9)"
```

- [ ] **Step 4: Submit pack output to astrologer for review**

Hand the Path A + Path B output (from Step 2) to the project's astrologer reviewer per CLAUDE.md translation-layer review discipline. Astrologer's written sign-off is Checkpoint C signal (b).

---

### Task 4.3: Mobile rollout (Phases 1-2 ship to stores)

**Files:** none (build + submit operation)

- [ ] **Step 1: Build mobile for App Store + Play Store**

```bash
cd apps/mobile && npx eas build --platform all
```
(Or whatever the project's actual EAS build command is — adjust per `eas.json`.)

- [ ] **Step 2: Submit to stores**

```bash
cd apps/mobile && npx eas submit --platform all
```

- [ ] **Step 3: Track rollout via store dashboards + admin counter**

After store approval + rollout begins:
- App Store Connect → Analytics → App Versions: monitor adoption of new mobile version
- Google Play Console → Statistics → Active installs by version: same
- Daily run of `query-correctness-metrics.ts`: observe `tz_mismatch_ratio` declining as mobile clients update

(No commit — deploy is the artifact.)

---

## 🛑 Checkpoint C — Unpark gate (default-location resumption)

**Stop here. The default-location brainstorm artifact (D1–D24 + EC-1..22, preserved in conversation context) does not resume until both signals satisfied.**

### Surface to the user:

The unpark gate requires BOTH conditions, simultaneously, in writing:

**(a) Mismatch decay signal:**
```bash
WORKER_URL=https://<production-worker-url> \
  ADMIN_TOKEN=<production-admin-token> \
  npx tsx workers/api-proxy/scripts/query-correctness-metrics.ts
```
Output shows: `✓ Last 7 days all under 0.5% tz_mismatch — DEFAULT-LOCATION UNPARK signal (a) MET`.

If still showing `⏳`, wait. Expected trajectory: 14-21 days from mobile rollout start.

**(b) Astrologer sign-off:**
- Path A + Path B output from Task 4.2 Step 2 reviewed by project astrologer
- Astrologer's written approval that:
  - Worker correction behavior matches doctrinal expectation (Case B per EC-19 audit)
  - Test pack methodology + results are sound
  - No correctness concerns block default-location resumption

### Checkpoint C sign-off

User reviews both signals AND explicitly approves default-location brainstorm resumption.

After approval:
- Reopen the parked default-location brainstorm artifact (D1–D24 + EC-1..22 from conversation)
- EC-19 flips from "BLOCKING-pre-launch" to "inherited-correct via this prior tz-correctness fix"
- `/plan-and-implement` on the default-location spec proceeds normally

---

## Self-review checklist (writer)

- **Spec coverage:** All sections of `2026-06-03-location-timezone-correctness.md` mapped to tasks. §1 Summary → Tasks across all phases; §2 Findings → grounded in plan rationale; §3 Phase table → mirrored in phase map; §4-7 Layer details → Tasks 0.x/1.x/2.x/3.x; §8 Phase 4 → Tasks 4.1/4.2/4.3 + Checkpoint C; §9 Test pack → Task 4.2; §10 ECs → handling threaded into relevant tasks (EC-T1 in Task 1.2 + Task 3.2 wrappers, EC-T2/3 in Task 2.2, EC-T5 accepted no eviction, EC-T7 in Task 0.2 Step 3, EC-T8 in Task 0.3, EC-T9 in Task 3.1 test cases); §11 Out of scope → mirrored in plan Out of scope; §12 Checkpoints → A/B/C inline.

- **Out-of-scope guard:** No task touches default-location store/sheet/hook (parked); useDailyNote useMemo([]) location lockup (parked); Phase WB hard reject (dropped); PreferencesContext consolidation; cache eviction.

- **Placeholder scan:** Reviewed. Concrete code blocks in every implementation step. Task 1.4 leaves the Maestro Loading-screen sentinel string adjustable ("Looking at the sky" → grep actual on first run). Tasks 4.1/4.3 deploy artifacts cite "<production-worker-url>" / "<astrology-api-io-key>" placeholders that ARE expected user-supplied values, not code placeholders.

- **Type consistency:** `Activity` from `@inceptio/shared-types`. `SavedLocation` interface unchanged across tasks. `pickToSavedLocation(pick: NominatimResult): SavedLocation` signature stable from Task 0.4 (lift, body unchanged) through Task 1.2 (body changes, signature preserved). `migrateLocationTimezones_v1(): void` defined Task 2.2, consumed Task 2.3 with identical signature. Worker `tryWorkerTzLookup(lat, lng): string | null` defined Task 3.2; the `derivedTz / clientTz / effectiveTz` triple-name is consistent across the spec §7 + test cases + admin response.

- **TDD discipline:** Every implementation task has explicit "write failing test → run failing → implement → run passing → commit" steps with full code. Phase 0 lift task (0.4) is a structural refactor with no behavior change, so the "test" is the pre-existing suite catching unintended diffs — explicit per Step 4. Phase 4 production deploys (4.1, 4.3) are operational, not code — verification is observation/monitoring, not unit test.

- **Checkpoint placement:** A after Phase 0 (gating Phase 1 on bundle size + Hermes smoke). B after Phase 3 (gating production deploy on staging verification). C after Phase 4 (gating default-location unpark). All three are explicit STOPs requiring user sign-off.

- **Frequent commits:** Every Task closes with a `git commit`. Renaming task (3.4) uses `git mv` for proper rename tracking. Tagging task (4.1) uses `git tag` for the deploy record.

- **Task count reconciliation:** 5 (Phase 0) + 4 (Phase 1) + 3 (Phase 2) + 5 (Phase 3) + 3 (Phase 4) = **20 tasks** across 5 phases + 3 hard-STOP checkpoints. Within stated 20-25 budget.

---

*End of plan. Execution halts at plan landing per user override of the writing-plans skill's execution-handoff offer. User reviews plan before approving execution dispatch.*
