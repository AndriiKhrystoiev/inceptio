# Remove Cloudflare / Direct api-public — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Cloudflare Worker and have the Expo mobile app call `api-public.astrology-api.io/api/v3` directly, with the translation layer + daily-note synthesis ported into a new `@inceptio/translations` package.

**Architecture:** The Worker's pure logic (factor/reason translation, headline synthesis, daily-note picker/composer, moon-phase) is **copied** into `packages/translations` (Hermes-safe, zero Worker runtime deps) and linked into mobile the same `file:`-symlink way `@inceptio/shared-types` is. `apps/mobile/src/lib/api.ts` absorbs request-building (`toUpstreamBody`), envelope unwrap + Zod validation, local `translate()`, the rewritten error mapping, and daily-note synthesis. The Worker is **deleted last** (Phase 4) so every prior phase keeps a working rollback target; verification of the public API contract happens **first** (Phase 0).

**Tech Stack:** TypeScript (strict), Zod **v3** (4.x forbidden — breaks shared-types), Vitest (mobile + packages both run `vitest run`), `@photostructure/tz-lookup@^11.5.0` (scoped, already a mobile dep), `@react-native-async-storage/async-storage@2.2.0` (on-device cache; MMKV is NOT installed), native `Date` + `Intl` (date-fns NOT installed).

## Global Constraints

Every task implicitly includes these. Exact values copied from the spec.

- **Zod stays v3.** Never bump to 4.x. `@inceptio/shared-types` depends on `zod@^3.23.8`.
- **tz lib is `@photostructure/tz-lookup`** — never bare `tz-lookup`/`geo-tz`.
- **`toUpstreamBody` must be byte-for-byte** the Worker's: `{ activity, date_range:{start_date,end_date} (each {year,month,day}), location:{year,month,day,hour:12,minute:0,latitude,longitude,timezone,city}, top_n_windows:10 }`, dates via `s.slice(0,10)`.
- **Upstream wraps responses in `{ success, data, metadata }`** — `ApiEnvelopeSchema` already models this (`packages/shared-types/src/api/response.ts:136-140`). Parse the raw envelope, then translate.
- **`translate()` MUST run before `searchElectional` returns** — `displayable?` is read by 6+ files; a miss is silent tone degradation, not an error.
- **Locale type** is `'en' | 'de' | 'fr' | 'es-419' | 'pt-BR'` (`translations/types.ts:14`). Mobile's active locale = `activeBundle()` from `apps/mobile/src/i18n/locale.ts`.
- **Forbidden words** (must never appear in any phrase, incl. fallbacks/composer output): magic, destiny, fortune, "stars align", manifest, energy (noun), vibes, alignment (new-age), blessed.
- **Grade calibration:** score 60–74 = win-state; both `fair` and `good` are positives; warm headline fires at score 65.
- **tz semantic invariant:** the upstream `location.timezone` must be `tzLookup(lat,lng)` for the searched location — never the device tz for a cross-tz location.
- **No new `any` without an inline justifying comment.** Components < 200 lines.

---

## File Structure

**New package `packages/translations/`** (copied from `workers/api-proxy/src/translations/`):
- `package.json`, `tsconfig.json` — mirror `packages/shared-types`.
- `src/**` — the entire translations tree (translate, types, dictionary/, activity-overrides/, headlines/, daily-notes/, __tests__/) plus a new `__tests__/known-enum-coverage.test.ts`.

**Mobile (`apps/mobile/src/`):**
- `config/api.ts` — base URL + timeout (MODIFY).
- `lib/api.ts` — request build, direct call, unwrap, translate, error mapping, daily-note synthesis (HEAVY MODIFY).
- `lib/upstream-body.ts` — `toUpstreamBody` + `parseDateParts` (CREATE).
- `lib/telemetry.ts` — `emit()` seam (CREATE).
- `lib/local-date.ts` — `formatDateInTz` (CREATE, ported).
- `lib/tz-aliases.ts` — `tzEquivalent` (CREATE, ported).
- `lib/daily-note-cache.ts` — AsyncStorage cache for daily notes (CREATE).
- `lib/card/moon-phase.ts` — re-point to `@inceptio/translations` (MODIFY/shrink).

**Deleted (Phase 4):** `workers/` entirely; root `package.json` worker scripts; `apps/mobile/src/lib/__tests__/post-alert-ack.test.ts` (replaced).

---

## Phase 0 — Verify the public API contract (no production deletion yet)

### Task 0.1: Capture real api-public request/response/error fixtures

**Files:**
- Create: `apps/mobile/src/lib/__tests__/fixtures/api-public/` (`search-200.json`, `search-422.json`, `search-429.json` if reproducible, `notes.md`)

**Interfaces:**
- Produces: golden fixtures consumed by Task 2.x error-mapping tests; documented envelope + error shapes.

- [ ] **Step 1: Smoke the happy path and save the envelope**

Run (captures a real 200 envelope shape — note nested `data`):
```bash
mkdir -p apps/mobile/src/lib/__tests__/fixtures/api-public
curl -s -X POST "https://api-public.astrology-api.io/api/v3/electional/search" \
  -H "Content-Type: application/json" \
  -d '{"activity":"wedding","date_range":{"start_date":{"year":2026,"month":7,"day":1},"end_date":{"year":2026,"month":7,"day":7}},"location":{"year":2026,"month":7,"day":1,"hour":12,"minute":0,"latitude":50.45,"longitude":30.52,"timezone":"Europe/Kyiv","city":"Kyiv"},"top_n_windows":10}' \
  -o apps/mobile/src/lib/__tests__/fixtures/api-public/search-200.json -w "HTTP %{http_code}\n"
```
Expected: `HTTP 200`; file top-level keys are `success`, `data`, `metadata`.

- [ ] **Step 2: Capture the 422 (bad shape) body**

```bash
curl -s -X POST "https://api-public.astrology-api.io/api/v3/electional/search" \
  -H "Content-Type: application/json" -d '{"activity":"wedding"}' \
  -o apps/mobile/src/lib/__tests__/fixtures/api-public/search-422.json -w "HTTP %{http_code}\n"
```
Expected: `HTTP 422`; record the exact JSON (FastAPI `{"detail":[...]}`).

- [ ] **Step 3: Attempt to trigger and capture a 429**

Loop a handful of rapid keyless calls; if a 429 is observed, save its body + headers to `search-429.json`. If none observed, write `notes.md` stating "429 not reproducible as of 2026-06-23; soft-block must tolerate unknown shape (see Task 2.6)."

- [ ] **Step 4: Document findings**

Write `apps/mobile/src/lib/__tests__/fixtures/api-public/notes.md`: confirmed envelope shape, the 422 `detail` shape, whether 429 was seen + its body, and an action item: "Confirm with astrology-api.io that the keyless public tier is a supported permanent mode (OpenAPI still declares BearerAuth)." This confirmation is an **external blocker for Phase 4**, not for Phases 1–3.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/__tests__/fixtures/api-public/
git commit -m "test(api): capture real api-public 200/422/429 fixtures for migration"
```

---

## Phase 1 — Create and wire `@inceptio/translations`

### Task 1.1: Scaffold the package

**Files:**
- Create: `packages/translations/package.json`, `packages/translations/tsconfig.json`

**Interfaces:**
- Produces: an npm package `@inceptio/translations` resolvable via `file:` link.

- [ ] **Step 1: Create `packages/translations/package.json`**

```json
{
  "name": "@inceptio/translations",
  "version": "0.0.1",
  "private": true,
  "description": "Tone/translation layer + daily-note synthesis shared by mobile (ported off the Cloudflare Worker).",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"],
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@inceptio/shared-types": "file:../shared-types",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/translations/tsconfig.json`** (copy shared-types' config)

Run:
```bash
cp packages/shared-types/tsconfig.json packages/translations/tsconfig.json
```
Expected: file exists; no edits needed (same compiler options).

- [ ] **Step 3: Commit**

```bash
git add packages/translations/package.json packages/translations/tsconfig.json
git commit -m "feat(translations): scaffold @inceptio/translations package"
```

### Task 1.2: Copy the translations tree and prove golden tests stay green

**Files:**
- Create: `packages/translations/src/**` (copied from `workers/api-proxy/src/translations/**`)

**Interfaces:**
- Produces: `translate`, `translateFactor`, `translateExcludedReason`, `TranslatedResponse`, `TRANSLATIONS_VERSION` (from `src/index.ts`); `synthesizeDailyNote`, `composeDisplayable`, `computeMoonPhase`, `LIBRARY_VERSION`, `PART_OF_DAY_CUTOFFS`, `Locale`, `DailyNoteOutput`, `DailyNoteResponseShape` (from their existing modules).

- [ ] **Step 1: Copy the tree verbatim** (relative imports + `@inceptio/shared-types` only — confirmed self-contained)

```bash
mkdir -p packages/translations/src
cp -R workers/api-proxy/src/translations/. packages/translations/src/
```
Expected: `packages/translations/src/index.ts`, `translate.ts`, `types.ts`, `dictionary/`, `activity-overrides/`, `headlines/`, `daily-notes/`, `__tests__/` all present.

- [ ] **Step 2: Install so the `file:` deps link**

```bash
npm install
```
Expected: `packages/translations/node_modules/@inceptio/shared-types` symlink exists.

- [ ] **Step 3: Run the moved golden tests — they must pass unchanged**

```bash
npm -w @inceptio/translations test
```
Expected: PASS — all golden/snapshot suites (`translate`, `daily-notes`, `synthesizer`, `horizon`, `moon-phase`, `part-of-day`, `quality-bucket`, `severity-hints`, `voice-leaf-coverage`, `lint-library`, `boundary-tests`, headlines/*). Outputs identical to the Worker copy (regression guarantee of tone).

- [ ] **Step 4: Commit**

```bash
git add packages/translations/src package-lock.json
git commit -m "feat(translations): copy translation + daily-note tree from worker, golden tests green"
```

### Task 1.3: Add the KNOWN_* dictionary-coverage CI test

**Files:**
- Create: `packages/translations/src/__tests__/known-enum-coverage.test.ts`

**Interfaces:**
- Consumes: `KNOWN_FACTOR_IDS`, `KNOWN_REASON_IDS`, `KNOWN_GRADES` from `@inceptio/shared-types`; `FACTORS` (`../dictionary/factors`), `EXCLUDED_REASONS` (`../dictionary/excluded-reasons`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { KNOWN_FACTOR_IDS, KNOWN_REASON_IDS } from '@inceptio/shared-types';
import { FACTORS } from '../dictionary/factors';
import { EXCLUDED_REASONS } from '../dictionary/excluded-reasons';

describe('dictionary completeness vs KNOWN_* lists', () => {
  it('every KNOWN_FACTOR_ID has a dictionary entry', () => {
    const missing = KNOWN_FACTOR_IDS.filter((id) => !(id in FACTORS));
    expect(missing, `factors missing translations: ${missing.join(', ')}`).toEqual([]);
  });

  it('every KNOWN_REASON_ID has a dictionary entry', () => {
    const missing = KNOWN_REASON_IDS.filter((id) => !(id in EXCLUDED_REASONS));
    expect(missing, `reasons missing translations: ${missing.join(', ')}`).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it**

```bash
npm -w @inceptio/translations test -- known-enum-coverage
```
Expected: PASS (every known id already has an entry). If it FAILS, that is a real pre-existing gap — add the missing dictionary entry before continuing.

- [ ] **Step 3: Commit**

```bash
git add packages/translations/src/__tests__/known-enum-coverage.test.ts
git commit -m "test(translations): CI guard that every KNOWN_* enum has a dictionary entry"
```

### Task 1.4: Add an `onUnknown` telemetry hook to `translate`

**Files:**
- Modify: `packages/translations/src/translate.ts` (signature of `translate`, `translateFactor`, `translateExcludedReason` fallback sites)

**Interfaces:**
- Produces: `translate(envelope, activity, locale, opts?: { onUnknown?: (field: 'factor_id' | 'reason_id', value: string) => void })`. `opts` optional — golden tests call without it, unchanged.

- [ ] **Step 1: Write the failing test**

Create `packages/translations/src/__tests__/on-unknown-hook.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { translateExcludedReason } from '../translate';

describe('translate onUnknown hook', () => {
  it('invokes onUnknown for an unknown reason_id', () => {
    const onUnknown = vi.fn();
    translateExcludedReason('totally_made_up_reason', 'en', { onUnknown });
    expect(onUnknown).toHaveBeenCalledWith('reason_id', 'totally_made_up_reason');
  });
});
```

- [ ] **Step 2: Run it — fails (signature has no opts)**

```bash
npm -w @inceptio/translations test -- on-unknown-hook
```
Expected: FAIL (type error / `onUnknown` never called).

- [ ] **Step 3: Thread the optional hook**

In `translate.ts`, define `export interface TranslateOpts { onUnknown?: (field: 'factor_id' | 'reason_id', value: string) => void }`. Add `opts?: TranslateOpts` as the last param of `translate`, `translateFactor`, `translateExcludedReason`. At each fallback site that currently does `console.warn('[translate] unknown ...')`, also call `opts?.onUnknown?.('factor_id', factorId)` / `('reason_id', reasonId)`. Thread `opts` from `translate` down into the per-window/per-range calls.

- [ ] **Step 4: Run the new test AND the full suite**

```bash
npm -w @inceptio/translations test
```
Expected: PASS — new hook test green; all golden tests still green (opts is optional, console.warn unchanged).

- [ ] **Step 5: Commit**

```bash
git add packages/translations/src/translate.ts packages/translations/src/__tests__/on-unknown-hook.test.ts
git commit -m "feat(translations): optional onUnknown hook on translate for enum-drift telemetry"
```

### Task 1.5: Link `@inceptio/translations` into mobile

**Files:**
- Modify: `apps/mobile/package.json` (dependencies)

**Interfaces:**
- Produces: `@inceptio/translations` importable from `apps/mobile/src/**`.

- [ ] **Step 1: Add the `file:` dependency**

In `apps/mobile/package.json` dependencies, after the shared-types line, add:
```json
"@inceptio/translations": "file:../../packages/translations",
```

- [ ] **Step 2: Install + verify the symlink**

```bash
cd apps/mobile && npm install && ls -la node_modules/@inceptio/translations && cd ../..
```
Expected: symlink `node_modules/@inceptio/translations → ../../../../packages/translations`.

- [ ] **Step 3: Smoke-import test**

Create `apps/mobile/src/lib/__tests__/translations-link.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TRANSLATIONS_VERSION, translate } from '@inceptio/translations';

describe('@inceptio/translations link', () => {
  it('resolves the package from mobile', () => {
    expect(typeof translate).toBe('function');
    expect(TRANSLATIONS_VERSION).toBeGreaterThanOrEqual(3);
  });
});
```
Add a barrel re-export if needed: ensure `packages/translations/src/index.ts` also re-exports `synthesizeDailyNote`, `composeDisplayable`, `computeMoonPhase`, `LIBRARY_VERSION`, `PART_OF_DAY_CUTOFFS`, and types `Locale`, `DailyNoteOutput`, `DailyNoteResponseShape`, `TranslatedResponse`, `TranslateOpts` (add the export lines to `index.ts`).

- [ ] **Step 4: Run**

```bash
npm -w inceptio test -- translations-link
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json package-lock.json packages/translations/src/index.ts apps/mobile/src/lib/__tests__/translations-link.test.ts
git commit -m "feat(mobile): link @inceptio/translations and export synthesis surface"
```

---

## Phase 2 — Direct search via api-public

### Task 2.1: Port `toUpstreamBody` into mobile

**Files:**
- Create: `apps/mobile/src/lib/upstream-body.ts`
- Test: `apps/mobile/src/lib/__tests__/upstream-body.test.ts`

**Interfaces:**
- Consumes: `ElectionalSearchRequest` from `@inceptio/shared-types`.
- Produces: `toUpstreamBody(req: ElectionalSearchRequest): Record<string, unknown>`.

- [ ] **Step 1: Write the failing test (exact JSON, byte-for-byte)**

```ts
import { describe, it, expect } from 'vitest';
import { toUpstreamBody } from '../upstream-body';

describe('toUpstreamBody', () => {
  it('produces the exact nested upstream shape', () => {
    const body = toUpstreamBody({
      activity: 'wedding',
      lat: 50.45, lng: 30.52,
      start: '2026-07-01', end: '2026-07-07',
      timezone: 'Europe/Kyiv', city: 'Kyiv',
    });
    expect(body).toEqual({
      activity: 'wedding',
      date_range: {
        start_date: { year: 2026, month: 7, day: 1 },
        end_date: { year: 2026, month: 7, day: 7 },
      },
      location: {
        year: 2026, month: 7, day: 1, hour: 12, minute: 0,
        latitude: 50.45, longitude: 30.52,
        timezone: 'Europe/Kyiv', city: 'Kyiv',
      },
      top_n_windows: 10,
    });
  });

  it('takes only the date portion of an ISO datetime', () => {
    const body = toUpstreamBody({
      activity: 'travel', lat: 0, lng: 0,
      start: '2026-07-01T08:30:00Z', end: '2026-07-02T00:00:00Z',
      timezone: 'UTC', city: 'x',
    });
    expect((body as any).date_range.start_date).toEqual({ year: 2026, month: 7, day: 1 });
  });
});
```

- [ ] **Step 2: Run it**

```bash
npm -w inceptio test -- upstream-body
```
Expected: FAIL ("toUpstreamBody is not a function").

- [ ] **Step 3: Implement (verbatim port of `workers/api-proxy/src/upstream.ts:29-62`)**

```ts
import type { ElectionalSearchRequest } from '@inceptio/shared-types';

function parseDateParts(s: string): { year: number; month: number; day: number } {
  const datePart = s.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) {
    throw new Error(`Invalid date string: ${s}`);
  }
  return { year: parseInt(y, 10), month: parseInt(m, 10), day: parseInt(d, 10) };
}

/** Flat mobile request → nested upstream request shape. Must stay byte-for-byte
 *  identical to the upstream's expected body (see plan Global Constraints). */
export function toUpstreamBody(req: ElectionalSearchRequest): Record<string, unknown> {
  const start = parseDateParts(req.start);
  const end = parseDateParts(req.end);
  return {
    activity: req.activity,
    date_range: { start_date: start, end_date: end },
    location: {
      year: start.year, month: start.month, day: start.day,
      hour: 12, minute: 0,
      latitude: req.lat, longitude: req.lng,
      timezone: req.timezone, city: req.city,
    },
    top_n_windows: 10,
  };
}
```

- [ ] **Step 4: Run**

```bash
npm -w inceptio test -- upstream-body
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/upstream-body.ts apps/mobile/src/lib/__tests__/upstream-body.test.ts
git commit -m "feat(mobile): port toUpstreamBody for direct upstream calls"
```

### Task 2.2: Add the telemetry seam

**Files:**
- Create: `apps/mobile/src/lib/telemetry.ts`
- Test: `apps/mobile/src/lib/__tests__/telemetry.test.ts`

**Interfaces:**
- Produces: `emit(event: string, props?: Record<string, string | number>): void`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { emit } from '../telemetry';

describe('telemetry.emit', () => {
  it('does not throw and is fire-and-forget', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => emit('translate_unknown_enum', { field: 'reason_id', value: 'x' })).not.toThrow();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run** — `npm -w inceptio test -- telemetry` → FAIL (no module).

- [ ] **Step 3: Implement (thin seam; real sink deferred per spec §9)**

```ts
/**
 * Fire-and-forget telemetry seam. No analytics SDK is installed yet (spec §6a),
 * so this currently only dev-logs. A future task wires a real sink here without
 * touching call sites. NEVER let a telemetry call affect control flow.
 */
export function emit(event: string, props: Record<string, string | number> = {}): void {
  try {
    if (__DEV__) console.log(`[telemetry] ${event}`, props);
  } catch {
    /* swallow — telemetry must never throw into the caller */
  }
}
```

- [ ] **Step 4: Run** — `npm -w inceptio test -- telemetry` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/telemetry.ts apps/mobile/src/lib/__tests__/telemetry.test.ts
git commit -m "feat(mobile): add fire-and-forget telemetry seam"
```

### Task 2.3: Point config at api-public

**Files:**
- Modify: `apps/mobile/src/config/api.ts`

**Interfaces:**
- Produces: `API_CONFIG.baseUrl` = `https://api-public.astrology-api.io/api/v3`; `API_CONFIG.timeout` = `20_000`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/config/__tests__/api.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { API_CONFIG } from '../api';

describe('API_CONFIG', () => {
  it('points at the public upstream directly', () => {
    expect(API_CONFIG.baseUrl).toBe('https://api-public.astrology-api.io/api/v3');
  });
  it('uses a ~20s timeout (upstream is now 50-500ms, no worker cold start)', () => {
    expect(API_CONFIG.timeout).toBe(20_000);
  });
});
```

- [ ] **Step 2: Run** — `npm -w inceptio test -- config/__tests__/api` → FAIL.

- [ ] **Step 3: Replace `apps/mobile/src/config/api.ts`**

```ts
// The mobile app now calls the public astrology API directly (no Cloudflare
// Worker). The public endpoint requires no API key and serves cached responses
// in ~50-500ms, so the old 60s worker-cold-start timeout is no longer needed.
const TIMEOUT_MS = 20_000;

export const API_CONFIG = {
  baseUrl: 'https://api-public.astrology-api.io/api/v3',
  timeout: TIMEOUT_MS,
} as const;
```
(Removes the `Platform`/`__DEV__` worker-URL branch — there is no local worker to target anymore.)

- [ ] **Step 4: Run** — `npm -w inceptio test -- config/__tests__/api` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/config/api.ts apps/mobile/src/config/__tests__/api.test.ts
git commit -m "feat(mobile): point API_CONFIG at api-public, drop worker URL + 60s timeout"
```

### Task 2.4: Rewrite `searchElectional` — direct call + local translate

**Files:**
- Modify: `apps/mobile/src/lib/api.ts` (`searchElectional`, `SearchResult`, imports)
- Test: `apps/mobile/src/lib/__tests__/search-electional.test.ts`

**Interfaces:**
- Consumes: `toUpstreamBody` (Task 2.1), `emit` (Task 2.2), `translate`/`TranslatedResponse` (`@inceptio/translations`), `ApiEnvelopeSchema` (`@inceptio/shared-types`), `activeBundle` → `Locale`.
- Produces: `searchElectional(request): Promise<SearchResult>` where `SearchResult.envelope: TranslatedResponse`, plus unchanged error classes.

- [ ] **Step 1: Write the failing test (happy path translates locally; uses the Phase 0 fixture)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import searchFixture from './fixtures/api-public/search-200.json';
import { searchElectional } from '../api';

const REQ = {
  activity: 'wedding', lat: 50.45, lng: 30.52,
  start: '2026-07-01', end: '2026-07-07', timezone: 'Europe/Kyiv', city: 'Kyiv',
} as const;

beforeEach(() => { vi.restoreAllMocks(); });

describe('searchElectional (direct api-public)', () => {
  it('posts the nested upstream body and returns a translated envelope', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(searchFixture), { status: 200 }),
    );
    const result = await searchElectional(REQ);
    // request body was the nested upstream shape
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody.top_n_windows).toBe(10);
    expect(sentBody.date_range.start_date).toEqual({ year: 2026, month: 7, day: 1 });
    // response was translated → first window carries a displayable field
    expect(result.envelope.data.top_windows[0]).toHaveProperty('displayable');
  });

  it('maps a 422 to ServerError without crashing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: [{ msg: 'x' }] }), { status: 422 }),
    );
    await expect(searchElectional(REQ)).rejects.toMatchObject({ name: 'ServerError' });
  });
});
```

- [ ] **Step 2: Run** — `npm -w inceptio test -- search-electional` → FAIL.

- [ ] **Step 3: Rewrite `searchElectional` in `apps/mobile/src/lib/api.ts`**

Update the imports at the top of the file:
```ts
import { ApiEnvelopeSchema, ElectionalSearchRequestSchema } from '@inceptio/shared-types';
import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import { translate } from '@inceptio/translations';
import type { TranslatedResponse, Locale } from '@inceptio/translations';
import { API_CONFIG } from '../config/api';
import { activeBundle } from '../i18n/locale';
import { toUpstreamBody } from './upstream-body';
import { emit } from './telemetry';
```
Change `SearchResult.envelope` type to the translated shape:
```ts
export interface SearchResult {
  envelope: TranslatedResponse;
  cacheHit: boolean;            // always false now (upstream sets no X-Cache); kept for API stability
  rateLimitRemaining: number | null; // always null now; kept for API stability
}
```
Replace the body of `searchElectional` (keep `fetchWithTimeout` and the error classes as-is):
```ts
export async function searchElectional(
  request: ElectionalSearchRequest,
): Promise<SearchResult> {
  const parsedRequest = ElectionalSearchRequestSchema.parse(request);
  const locale = activeBundle() as Locale;

  const url = `${API_CONFIG.baseUrl}/electional/search`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toUpstreamBody(parsedRequest)),
    },
    API_CONFIG.timeout,
  );

  if (res.status === 429) {
    // Upstream per-IP quota. The 429 body shape is unverified (Phase 0); be
    // tolerant — surface UpstreamQuotaError regardless of body contents so the
    // soft-block UX fires. (No per-device counter exists anymore.)
    const body = (await res.json().catch(() => ({}))) as { detail?: unknown; message?: string };
    throw new UpstreamQuotaError(
      typeof body.message === 'string' ? body.message : 'Upstream quota reached',
    );
  }

  if (!res.ok) {
    // 422 (bad request shape) and other 4xx/5xx. Upstream returns FastAPI
    // `{ detail: ... }` — surface as ServerError; the request builder is tested
    // to produce a valid shape, so a 422 here means a genuine input problem.
    throw new ServerError(res.status, `HTTP ${res.status}`);
  }

  const json = await res.json();
  const parseResult = ApiEnvelopeSchema.safeParse(json);
  if (!parseResult.success) {
    console.error(
      '[searchElectional] schema mismatch — zod issues:',
      JSON.stringify(parseResult.error.issues, null, 2),
    );
    throw new SchemaMismatchError(parseResult.error.issues);
  }

  // Translate locally — MUST happen before returning (displayable consumers).
  const envelope = translate(parseResult.data, parsedRequest.activity, locale, {
    onUnknown: (field, value) => emit('translate_unknown_enum', { field, value }),
  });

  return { envelope, cacheHit: false, rateLimitRemaining: null };
}
```

- [ ] **Step 4: Run the search tests + typecheck**

```bash
npm -w inceptio test -- search-electional && npm -w inceptio run typecheck
```
Expected: PASS. (If `translate`'s return type isn't assignable to `TranslatedResponse`, import the exact return type it declares and use that for `SearchResult.envelope`.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/api.ts apps/mobile/src/lib/__tests__/search-electional.test.ts
git commit -m "feat(mobile): searchElectional calls api-public directly and translates locally"
```

### Task 2.5: Remove dead Worker-shape error branches + stale header test

**Files:**
- Modify: `apps/mobile/src/lib/__tests__/` (delete/replace `api-headers.test.ts` if it asserts `X-Timezone`/worker headers)
- Verify: `apps/mobile/src/lib/error-messages.ts`, `apps/mobile/src/lib/query-client.ts`

**Interfaces:**
- Consumes: the 6 error classes (`RateLimitError`, `UpstreamQuotaError`, `SchemaMismatchError`, `DateRangeError`, `ServerError`, `NetworkError`/`TimeoutError`) — all still exported, none deleted.

- [ ] **Step 1: Confirm the error-class consumers still compile**

```bash
grep -n "RateLimitError\|UpstreamQuotaError\|SchemaMismatchError\|DateRangeError" apps/mobile/src/lib/error-messages.ts apps/mobile/src/lib/query-client.ts
```
Expected: all four still referenced. They remain exported from `api.ts` even though `searchElectional` no longer throws `RateLimitError`/`DateRangeError` (daily-note/future paths may; `error-messages.ts` keeps their copy). Do NOT delete any error class.

- [ ] **Step 2: Update the header test**

Open `apps/mobile/src/lib/__tests__/api-headers.test.ts`. Delete any assertion that `searchElectional` sends `X-Timezone`, `X-Device-Id`, or `X-Locale` (it no longer does — upstream ignores them). If the file's only purpose was asserting those headers, delete the file. Keep any assertion still valid (e.g. `Content-Type`).

- [ ] **Step 3: Run the full mobile suite**

```bash
npm -w inceptio test
```
Expected: PASS (no references to removed branches; daily-note tests may still target the old `getDailyNote` — those are rewritten in Phase 3; if they fail now, mark them `.skip` with a `// rewritten in Phase 3 Task 3.3` comment and unskip there).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/__tests__/
git commit -m "test(mobile): drop worker-header assertions; keep all 6 error classes"
```

---

## Phase 3 — Daily-note synthesis on-device + alert-ack + moon-phase reconcile

### Task 3.1: Port `formatDateInTz` and `tzEquivalent` into mobile

**Files:**
- Create: `apps/mobile/src/lib/local-date.ts`, `apps/mobile/src/lib/tz-aliases.ts`
- Test: `apps/mobile/src/lib/__tests__/local-date.test.ts`

**Interfaces:**
- Produces: `formatDateInTz(d: Date, tz: string): string`; `tzEquivalent(a: string, b: string): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { formatDateInTz } from '../local-date';
import { tzEquivalent } from '../tz-aliases';

describe('formatDateInTz', () => {
  it('renders the wall-clock date in the given tz', () => {
    // 2026-07-01T23:30Z is already 2026-07-02 in Kyiv (UTC+3)
    expect(formatDateInTz(new Date('2026-07-01T23:30:00Z'), 'Europe/Kyiv')).toBe('2026-07-02');
  });
});

describe('tzEquivalent', () => {
  it('treats Kyiv and its alias as equivalent', () => {
    expect(tzEquivalent('Europe/Kyiv', 'Europe/Kiev')).toBe(true);
  });
  it('treats distinct zones as not equivalent', () => {
    expect(tzEquivalent('Europe/Kyiv', 'America/New_York')).toBe(false);
  });
});
```

- [ ] **Step 2: Run** — `npm -w inceptio test -- local-date` → FAIL.

- [ ] **Step 3: Port the two helpers**

Copy `formatDateInTz` (only that function) from `workers/api-proxy/src/lib/local-date.ts` into the new mobile `local-date.ts`:
```ts
// Intl-only date math (no date library installed). ALWAYS pass an explicit
// timeZone. Ported from the former Worker lib/local-date.ts.
export function formatDateInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}
```
Copy the whole `workers/api-proxy/src/lib/tz-aliases.ts` to `apps/mobile/src/lib/tz-aliases.ts` verbatim:
```bash
cp workers/api-proxy/src/lib/tz-aliases.ts apps/mobile/src/lib/tz-aliases.ts
```

- [ ] **Step 4: Run** — `npm -w inceptio test -- local-date` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/local-date.ts apps/mobile/src/lib/tz-aliases.ts apps/mobile/src/lib/__tests__/local-date.test.ts
git commit -m "feat(mobile): port formatDateInTz + tzEquivalent for daily-note synthesis"
```

### Task 3.2: On-device daily-note cache

**Files:**
- Create: `apps/mobile/src/lib/daily-note-cache.ts`
- Test: `apps/mobile/src/lib/__tests__/daily-note-cache.test.ts`

**Interfaces:**
- Consumes: existing AsyncStorage wrapper (use the same import the rest of `apps/mobile/src/lib` uses — confirm with `grep -rn "async-storage" apps/mobile/src/lib | head`).
- Produces: `dailyNoteCacheKey(p: {lat:number;lng:number;dateIso:string;activity:string;locale:string}): string`; `readDailyNote(key): Promise<DailyNoteOutput | null>`; `writeDailyNote(key, value: DailyNoteOutput): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { dailyNoteCacheKey } from '../daily-note-cache';

describe('dailyNoteCacheKey', () => {
  it('is stable and namespaces by all dimensions', () => {
    const k = dailyNoteCacheKey({ lat: 50.45, lng: 30.52, dateIso: '2026-07-01', activity: 'wedding', locale: 'en' });
    expect(k).toBe('daily-note:v1:50.45:30.52:2026-07-01:wedding:en');
  });
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement** (AsyncStorage-backed; key embeds `LIBRARY_VERSION` so a library bump invalidates entries)

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIBRARY_VERSION } from '@inceptio/translations';
import type { DailyNoteOutput } from '@inceptio/translations';

export function dailyNoteCacheKey(p: {
  lat: number; lng: number; dateIso: string; activity: string; locale: string;
}): string {
  return `daily-note:v1:${p.lat}:${p.lng}:${p.dateIso}:${p.activity}:${p.locale}`;
}

function libKey(key: string): string {
  return `${key}:${LIBRARY_VERSION}`;
}

export async function readDailyNote(key: string): Promise<DailyNoteOutput | null> {
  const raw = await AsyncStorage.getItem(libKey(key));
  if (!raw) return null;
  try { return JSON.parse(raw) as DailyNoteOutput; } catch { return null; }
}

export async function writeDailyNote(key: string, value: DailyNoteOutput): Promise<void> {
  await AsyncStorage.setItem(libKey(key), JSON.stringify(value));
}
```

- [ ] **Step 4: Run** — `npm -w inceptio test -- daily-note-cache` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/daily-note-cache.ts apps/mobile/src/lib/__tests__/daily-note-cache.test.ts
git commit -m "feat(mobile): on-device daily-note cache keyed by LIBRARY_VERSION"
```

### Task 3.3: Rewrite `getDailyNote` as local synthesis

**Files:**
- Modify: `apps/mobile/src/lib/api.ts` (`getDailyNote`, `GetDailyNoteInput`, `DailyNoteResult`)
- Test: `apps/mobile/src/lib/__tests__/get-daily-note.test.ts`

**Interfaces:**
- Consumes: `searchElectional` (Task 2.4), `formatDateInTz`/`tzEquivalent` (3.1), daily-note cache (3.2), `synthesizeDailyNote`, `composeDisplayable`, `computeMoonPhase`, `LIBRARY_VERSION`, `PART_OF_DAY_CUTOFFS` (`@inceptio/translations`), `tzLookup` (`@photostructure/tz-lookup`), `DailyNoteResponseSchema` (`@inceptio/shared-types`).
- Produces: `getDailyNote(input: GetDailyNoteInput): Promise<DailyNoteResult>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiMod from '../api';
import { getDailyNote } from '../api';

beforeEach(() => vi.restoreAllMocks());

describe('getDailyNote (local synthesis)', () => {
  it('synthesizes a daily note from a search result', async () => {
    vi.spyOn(apiMod, 'searchElectional').mockResolvedValue({
      // minimal translated envelope: one viable window, no exclusions
      envelope: { success: true, data: {
        top_windows: [{ score: 65, factors: [] }],
        excluded_ranges: [],
        summary: { no_viable_windows: false },
      }, metadata: {} } as any,
      cacheHit: false, rateLimitRemaining: null,
    });
    const res = await getDailyNote({ lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv', activity: 'wedding' });
    expect(res.response.daily_note).toBeTruthy();
    expect(res.response.library_version).toBeDefined();
    expect(res.response.saved_searches).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** — `npm -w inceptio test -- get-daily-note` → FAIL.

- [ ] **Step 3: Rewrite `getDailyNote`** (port the route orchestration from `daily-note.ts`, dropping all KV/metering/device-id/admin counters)

Add imports to `api.ts`:
```ts
import tzLookup from '@photostructure/tz-lookup';
import { tzEquivalent } from './tz-aliases';
import { formatDateInTz } from './local-date';
import { dailyNoteCacheKey, readDailyNote, writeDailyNote } from './daily-note-cache';
import {
  synthesizeDailyNote, composeDisplayable, computeMoonPhase,
  LIBRARY_VERSION, PART_OF_DAY_CUTOFFS,
} from '@inceptio/translations';
import { DailyNoteResponseSchema } from '@inceptio/shared-types';
import type { DailyNoteResponse } from '@inceptio/shared-types';
```
Replace `getDailyNote` body:
```ts
function tryTzLookup(lat: number, lng: number): string | null {
  try { return tzLookup(lat, lng); } catch { return null; }
}

export async function getDailyNote(input: GetDailyNoteInput): Promise<DailyNoteResult> {
  const { lat, lng, activity } = input;
  const locale = activeBundle() as Locale;

  // Tz authority: coordinates first, client tz, then UTC (mirrors the worker).
  const derivedTz = tryTzLookup(lat, lng);
  const effectiveTz = derivedTz ?? input.tz ?? 'UTC';
  const dateIso = formatDateInTz(new Date(), effectiveTz);

  const key = dailyNoteCacheKey({ lat, lng, dateIso, activity, locale });
  let dailyNote = await readDailyNote(key);
  const cacheHit = dailyNote !== null;

  if (!dailyNote) {
    // Prefer client tz upstream when alias-equivalent (older upstream tzdata).
    const upstreamTz =
      input.tz && derivedTz && tzEquivalent(input.tz, derivedTz) ? input.tz : effectiveTz;

    const { envelope } = await searchElectional({
      activity, lat, lng, start: dateIso, end: dateIso, timezone: upstreamTz, city: 'unknown',
    });
    const data = envelope.data as {
      top_windows?: Array<{ score: number; factors: unknown[] }>;
      excluded_ranges?: Array<{ reason_id: string; severity: 'hard_stop' | 'medium' }>;
      summary?: { no_viable_windows?: boolean };
    };
    const topWindow = data.top_windows?.[0] ?? null;
    const excludedRanges = data.excluded_ranges ?? [];
    const noViableWindows = data.summary?.no_viable_windows ?? false;

    if (!topWindow && excludedRanges.length === 0) {
      throw new ServerError(502, 'No top window and no exclusions for today');
    }
    const effectiveTopWindow = topWindow ?? { score: 0, factors: [] };

    const picked = synthesizeDailyNote({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime guarded by searchElectional's Zod parse
      topWindow: effectiveTopWindow as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ditto
      excludedRangesActiveToday: excludedRanges as any,
      today_iso_date: dateIso,
      noViableWindows,
      locale,
    });
    dailyNote = composeDisplayable({
      picked, moonPhase: computeMoonPhase(dateIso), activity, locale, wasActivityFallback: false,
    });
    await writeDailyNote(key, dailyNote);
  }

  const response = DailyNoteResponseSchema.parse({
    daily_note: dailyNote,
    saved_searches: [],
    total_saved_count: 0,
    library_version: LIBRARY_VERSION,
    part_of_day_cutoffs: PART_OF_DAY_CUTOFFS,
    cache_hit: cacheHit,
  });

  return { response: response as DailyNoteResponse, cacheHit };
}
```
Delete `postAlertAck` here (it moves to Task 3.5). Remove `requestMetaHeaders` if no longer used by any function (search dropped it; daily-note dropped it) — confirm with grep and delete if dead.

- [ ] **Step 4: Run + typecheck**

```bash
npm -w inceptio test -- get-daily-note && npm -w inceptio run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/api.ts apps/mobile/src/lib/__tests__/get-daily-note.test.ts
git commit -m "feat(mobile): synthesize daily-note on-device from a direct search"
```

### Task 3.4: Reconcile the moon-phase duplicate

**Files:**
- Modify: `apps/mobile/src/lib/card/moon-phase.ts`
- Verify: callers of `card/moon-phase.ts`

**Interfaces:**
- Consumes: `computeMoonPhase` from `@inceptio/translations`.
- Produces: the existing `card/moon-phase.ts` public API (unchanged signatures), now delegating to the package.

- [ ] **Step 1: Identify the public surface + callers**

```bash
grep -n "export" apps/mobile/src/lib/card/moon-phase.ts
grep -rn "card/moon-phase" apps/mobile/src
```
Note the exported names and whether callers pass a window timestamp (`parseLocalInstant`) vs a date string.

- [ ] **Step 2: Write the failing test (delegation, output parity)**

Create `apps/mobile/src/lib/card/__tests__/moon-phase-parity.test.ts` asserting the existing exported function returns the same phase as `computeMoonPhase` for a known date (copy a known expectation from the package's own `__tests__/moon-phase.test.ts`).

- [ ] **Step 3: Re-point the implementation**

Rewrite `card/moon-phase.ts` so its exported function(s) compute the date string (via the existing `card/iso-local.ts` `parseLocalInstant` if the caller passes a window instant) and delegate to `computeMoonPhase` from `@inceptio/translations`. Delete the duplicated synodic-constant math. Keep the same export names so callers don't change.

- [ ] **Step 4: Run** — `npm -w inceptio test -- moon-phase` and the card suite → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/card/moon-phase.ts apps/mobile/src/lib/card/__tests__/moon-phase-parity.test.ts
git commit -m "refactor(mobile): card/moon-phase delegates to @inceptio/translations (drop duplicate)"
```

### Task 3.5: Replace `postAlertAck` with a local marker

**Files:**
- Create: `apps/mobile/src/lib/alert-ack.ts`
- Delete: `apps/mobile/src/lib/__tests__/post-alert-ack.test.ts` (network version)
- Test: `apps/mobile/src/lib/__tests__/alert-ack.test.ts`

**Interfaces:**
- Produces: `ackAlert(alertId: string): Promise<void>`; `isAlertAcked(alertId: string): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { ackAlert, isAlertAcked } from '../alert-ack';

describe('local alert-ack', () => {
  it('persists an ack locally and reads it back', async () => {
    await ackAlert('alert-xyz');
    expect(await isAlertAcked('alert-xyz')).toBe(true);
    expect(await isAlertAcked('never-acked')).toBe(false);
  });
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement (AsyncStorage; the server read-side never existed)**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyOf = (alertId: string) => `alert-ack:${alertId}`;

export async function ackAlert(alertId: string): Promise<void> {
  await AsyncStorage.setItem(keyOf(alertId), '1');
}

export async function isAlertAcked(alertId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(keyOf(alertId))) === '1';
}
```

- [ ] **Step 4: Delete the old network test + run**

```bash
git rm apps/mobile/src/lib/__tests__/post-alert-ack.test.ts
npm -w inceptio test -- alert-ack
```
Expected: PASS. Confirm no remaining import of `postAlertAck` (`grep -rn postAlertAck apps/mobile/src` → empty).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/alert-ack.ts apps/mobile/src/lib/__tests__/alert-ack.test.ts
git commit -m "feat(mobile): local alert-ack marker (server read-side never existed)"
```

---

## Phase 4 — Delete the Worker + reconcile docs (after Phase 0 external confirmation)

> **Gate:** Do not start Phase 4 until the Phase 0 `notes.md` action item is resolved — i.e. astrology-api.io confirms the keyless public tier is permanent. This is the one-way door.

### Task 4.1: Delete the Worker and its wiring

**Files:**
- Delete: `workers/` (entire `api-proxy`)
- Modify: root `package.json` (remove worker scripts + `workers/*` workspace glob)

**Interfaces:** none (removal only).

- [ ] **Step 1: Confirm nothing in mobile/packages imports the worker**

```bash
grep -rn "api-proxy\|workers/api-proxy" apps packages | grep -v node_modules
```
Expected: empty.

- [ ] **Step 2: Delete the worker + scripts**

```bash
git rm -r workers/api-proxy
```
Edit root `package.json`: remove `"dev:worker"` and `"deploy:worker"` scripts; change `"workspaces": ["packages/*", "workers/*"]` to `"workspaces": ["packages/*"]`.

- [ ] **Step 3: Reinstall + full test + typecheck**

```bash
npm install
npm -w @inceptio/translations test && npm -w @inceptio/shared-types test && npm -w inceptio test
npm -w inceptio run typecheck
```
Expected: all PASS; no dangling references.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Cloudflare Worker; mobile calls api-public directly"
```

### Task 4.2: Update CLAUDE.md and features.ts

**Files:**
- Modify: `CLAUDE.md` (decision log + architecture + translation-layer location)
- Modify: `apps/mobile/src/config/features.ts` (cap note)

**Interfaces:** none.

- [ ] **Step 1: Update the decision log**

Add a dated entry to the `## Decision log` section of `CLAUDE.md`: "**v2.1 → direct-api (2026-06): Cloudflare Worker removed.** Public keyless `api-public.astrology-api.io/api/v3` replaces the proxy; translation layer + daily-note synthesis moved to `packages/translations` (bundle-only — content fixes now require a release). Per-device rate-limit + server usage-cap + KV cache + version-policy + admin telemetry dropped; rate-limiting now relies on the upstream per-IP limit. New compromises: enum-drift signal is now `telemetry.emit` + a CI dictionary-coverage test (no server log); ephemeris `STATIONS` table and `verifyConcreteHorizon` stubs are now release-bound." Update the **Architecture → Stack (locked)** Backend bullet and the **Translation layer** file-structure block to point at `packages/translations`.

- [ ] **Step 2: Update features.ts cap comment**

In `apps/mobile/src/config/features.ts`, update the comment near the search-cap constants to: "Cap is now enforced upstream (api-public per-IP). The local counter no longer gates searches; a future paywall will build on the upstream limit." Leave the constants in place (no behavioral change).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md apps/mobile/src/config/features.ts
git commit -m "docs: record Cloudflare removal in decision log; note upstream-enforced cap"
```

---

## Self-Review

**Spec coverage:**
- §2 package architecture → Tasks 1.1–1.5. ✓
- §3 port table (toUpstreamBody, callUpstream, translate, Zod, daily-note, error mapping) → 2.1, 2.4, 3.1–3.3. ✓
- §3a daily-note invariants (3 no-viable shapes, `?? false`, upstreamTz alias pick, event-tz date) → Task 3.3 body. ✓
- §4 deletion → 4.1. ✓
- §5 mobile changes (baseUrl, translate-before-return, error mapping, header drop, library_version, alert-ack local, moon-phase reconcile) → 2.3, 2.4, 2.5, 3.3, 3.4, 3.5. ✓
- §5a dependency-drift correction (no RevenueCat step) → honored (no such task). ✓
- §6 compromises + §6a telemetry+CI → 1.3, 1.4, 2.2, 2.4; STATIONS/stub note → 4.2. ✓
- §7 phase ordering (verify→port→delete) → Phases 0→3→4 with the Phase 4 gate. ✓
- §8 tests (golden move, forbidden-words travels with package, grade calibration, completeness, cross-tz) → 1.2 (golden + forbidden-words + grade suites move verbatim), 1.3 (completeness), 3.x. ✓
- §11 MUST list → mapped across tasks. ✓

**Placeholder scan:** none — every code step shows real code; moves use exact `cp`/`git rm` commands.

**Type consistency:** `toUpstreamBody` signature identical in 2.1 and its use in 2.4; `SearchResult.envelope: TranslatedResponse` defined in 2.4 and consumed in 3.3; `dailyNoteCacheKey`/`readDailyNote`/`writeDailyNote` names consistent 3.2↔3.3; `ackAlert`/`isAlertAcked` consistent within 3.5; `LIBRARY_VERSION`/`PART_OF_DAY_CUTOFFS`/`computeMoonPhase`/`synthesizeDailyNote`/`composeDisplayable` exported in 1.5 and consumed in 3.2/3.3.

**Open dependency (flagged):** real telemetry sink (2.2 is a dev-log seam) and the Phase 0 external confirmation gating Phase 4 — both intentional per spec §9/§7.
