# Force-Update Gate + Soft Update Banner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a server-driven version policy that force-gates dangerously-old builds (full-screen, non-dismissible) and softly nudges out-of-date ones (dismissible banner), keyed on the installed native marketing version, fail-open by construction, with an instant Worker kill-switch.

**Architecture:** A pure, golden-tested core (`semver` + `decision` + `banner-policy`) decides state from a Zod-validated `VersionPolicy`; an impure shell (`update-store`) fetches + persists; a framework-agnostic `controller` holds the fetch/AppState/poll/throttle safety contract (unit-tested with fake timers); a thin React hook wires it into `App.js`. The Cloudflare Worker serves the policy from KV with a 60s edge cache, a schema+coherence guard, and a `forceEnabled` kill-switch. Force outranks onboarding/rating in the root render ladder.

**Tech Stack:** Expo SDK 55 / RN 0.83, TypeScript, Zod v3 (via `@inceptio/shared-types`), `expo-application`, RN core `Linking`/`AppState`/`AccessibilityInfo`, Cloudflare Worker + KV, vitest. No new runtime deps (no `semver`, no `date-fns`, no `expo-linking`).

**Source spec:** `docs/superpowers/specs/2026-06-11-force-update-gate-design.md`
**Pre-flight audits:** `docs/superpowers/expert/2026-06-11-force-update-gate-{archaeology,domain}.md`

---

## Plan-level refinements (deviations from the spec's file layout, with rationale)

1. **`semver.ts` lives in `packages/shared-types/src/semver.ts`, not mobile.** The Worker's coherence guard (§6.2) and the client decision fn must use the *identical* comparator (defense-in-depth, zero drift). shared-types is the only code both import. (Spec §4 put it in mobile; this strengthens the "single source of truth" principle.)
2. **The hook's timing logic lives in a framework-agnostic `controller.ts`.** Mobile has no RN test renderer; the §12.3 fake-timer contract is unit-testable only if the state machine is plain TS with injectable `fetchPolicy`/`now`/timer deps. `use-update-gate.ts` becomes a thin `useSyncExternalStore` wrapper (precedent: `activity-preference` already wraps `useSyncExternalStore`).
3. **Client zod-parses via the schema object imported from `@inceptio/shared-types`** (`VersionPolicySchema.safeParse`). No mobile `zod` dep is added — Metro resolves `zod` transitively through shared-types (confirmed: hoisted `node_modules/zod` 3.25.76).

---

## File Structure

**Create:**
- `packages/shared-types/src/semver.ts` — pure `parseSemver` + `compareSemver`.
- `packages/shared-types/src/api/version-policy.ts` — `VersionPolicySchema` + `PlatformPolicySchema` + types.
- `packages/shared-types/src/__tests__/semver.test.ts`, `version-policy.test.ts`.
- `apps/mobile/src/lib/update-gate/decision.ts` — pure `evaluateUpdateState`.
- `apps/mobile/src/lib/update-gate/banner-policy.ts` — pure `shouldShowSoftBanner`.
- `apps/mobile/src/lib/update-gate/update-store.ts` — shell: `fetchPolicy`, soft-dismissal storage, native version read.
- `apps/mobile/src/lib/update-gate/controller.ts` — framework-agnostic state machine.
- `apps/mobile/src/lib/update-gate/use-update-gate.ts` — thin React hook.
- `apps/mobile/src/lib/update-gate/__tests__/{decision,banner-policy,update-store,controller}.test.ts`.
- `apps/mobile/src/components/UpdateGateScreen.tsx`, `UpdateBanner.tsx`.
- `apps/mobile/src/locales/{en,de,fr,es-419,pt-BR}/update.json`.
- `workers/api-proxy/src/routes/version-policy.ts` + `workers/api-proxy/src/routes/__tests__/version-policy.test.ts`.

**Modify:**
- `packages/shared-types/src/index.ts` — export `./semver` + `./api/version-policy`.
- `apps/mobile/src/i18n/index.ts` — register 18th namespace `update` (signature + 5 imports + 5 call sites). **SHARED — sequential Task 0.**
- `apps/mobile/src/i18n/__tests__/coverage.test.ts` — bump `17`→`18` + `toContain('update')`.
- `workers/api-proxy/src/index.ts` — register `GET /version-policy`. **SHARED.**
- `apps/mobile/App.js` — hook call + force early-return + `__DEV__` simulator picker. **SHARED.**
- `apps/mobile/src/screens/TodayScreen.js` — mount `<UpdateBanner/>` at top.

---

## Partition Map (for Compound V parallel dispatch)

| Batch | Tasks | Files (disjoint) | Notes |
|---|---|---|---|
| **Task 0 (sequential, first)** | 0 | `i18n/index.ts`, `i18n/__tests__/coverage.test.ts`, `locales/*/update.json` | Shared barrel — must land before any component imports `update:` keys. |
| **Batch A (parallel)** | 1, 2 | T1: `shared-types/src/api/version-policy.ts` + index export; T2: `shared-types/src/semver.ts` + index export | Both touch `shared-types/src/index.ts` → **serialize the two index-export edits** or assign both to one agent. |
| **Batch B (parallel, after A)** | 3, 4, 5, 6 | T3 `decision.ts`; T4 `banner-policy.ts`; T5 `routes/version-policy.ts` + `index.ts`; T6 `update-store.ts` | T5 also edits Worker `index.ts` (no overlap with mobile). |
| **Batch C (after B)** | 7 | `controller.ts` | Depends on T3 + T6. |
| **Batch D (after C)** | 8, 9, 10 | T8 `use-update-gate.ts`; T9 `UpdateGateScreen.tsx`; T10 `UpdateBanner.tsx` | T9/T10 need Task 0 keys; T10 needs T4+T6. |
| **Batch E (sequential, last)** | 11, 12 | T11 `App.js`; T12 `TodayScreen.js` | T11 depends on T8+T9; T12 on T10. Different files. |

---

## Task 0: i18n `update` namespace (SHARED — do first)

**Files:**
- Test: `apps/mobile/src/i18n/__tests__/coverage.test.ts:XX` (the `toBe(17)` assertion)
- Create: `apps/mobile/src/locales/en/update.json` (+ de, fr, es-419, pt-BR)
- Modify: `apps/mobile/src/i18n/index.ts`

- [ ] **Step 1: Make the coverage test demand the 18th namespace (failing test)**

In `apps/mobile/src/i18n/__tests__/coverage.test.ts`, change the floor assertion and add a containment check:

```ts
    expect(CHROME_NS.length).toBe(18);
    expect(CHROME_NS).toContain('common');
    expect(CHROME_NS).toContain('onboarding');
    expect(CHROME_NS).toContain('share');
    expect(CHROME_NS).toContain('update');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx vitest run src/i18n/__tests__/coverage.test.ts`
Expected: FAIL — `expected 17 to be 18` (no `update.json` files yet).

- [ ] **Step 3: Create the en source file**

`apps/mobile/src/locales/en/update.json`:

```json
{
  "force": {
    "title": "An update is needed",
    "body": "This version of Inceptio is no longer supported. Update to keep choosing your moments.",
    "action": "Update",
    "actionHint": "Opens your app store",
    "retry": "Try again",
    "retryOffline": "Couldn't reach the update server. Check your connection.",
    "openFailed": "Couldn't open the store. Try again."
  },
  "soft": {
    "message": "A new version of Inceptio is ready.",
    "action": "Update",
    "dismiss": "Dismiss"
  }
}
```

- [ ] **Step 4: Create the 4 non-en files (placeholder translations — flag for native review)**

Create `de/update.json`, `fr/update.json`, `es-419/update.json`, `pt-BR/update.json` with the SAME key structure, translated. Use these as the implementation draft (owner tone + native review is a launch gate, tracked in spec §13). Example `de/update.json`:

```json
{
  "force": {
    "title": "Ein Update ist erforderlich",
    "body": "Diese Version von Inceptio wird nicht mehr unterstützt. Aktualisiere, um weiterhin deine Momente zu wählen.",
    "action": "Aktualisieren",
    "actionHint": "Öffnet deinen App-Store",
    "retry": "Erneut versuchen",
    "retryOffline": "Der Update-Server ist nicht erreichbar. Prüfe deine Verbindung.",
    "openFailed": "Der Store konnte nicht geöffnet werden. Versuche es erneut."
  },
  "soft": {
    "message": "Eine neue Version von Inceptio ist verfügbar.",
    "action": "Aktualisieren",
    "dismiss": "Schließen"
  }
}
```

`fr/update.json`:

```json
{
  "force": {
    "title": "Une mise à jour est nécessaire",
    "body": "Cette version d'Inceptio n'est plus prise en charge. Mettez à jour pour continuer à choisir vos moments.",
    "action": "Mettre à jour",
    "actionHint": "Ouvre votre boutique d'applications",
    "retry": "Réessayer",
    "retryOffline": "Impossible de joindre le serveur de mise à jour. Vérifiez votre connexion.",
    "openFailed": "Impossible d'ouvrir la boutique. Réessayez."
  },
  "soft": {
    "message": "Une nouvelle version d'Inceptio est disponible.",
    "action": "Mettre à jour",
    "dismiss": "Fermer"
  }
}
```

`es-419/update.json`:

```json
{
  "force": {
    "title": "Se necesita una actualización",
    "body": "Esta versión de Inceptio ya no es compatible. Actualiza para seguir eligiendo tus momentos.",
    "action": "Actualizar",
    "actionHint": "Abre tu tienda de aplicaciones",
    "retry": "Reintentar",
    "retryOffline": "No se pudo conectar con el servidor de actualizaciones. Revisa tu conexión.",
    "openFailed": "No se pudo abrir la tienda. Inténtalo de nuevo."
  },
  "soft": {
    "message": "Ya está lista una nueva versión de Inceptio.",
    "action": "Actualizar",
    "dismiss": "Descartar"
  }
}
```

`pt-BR/update.json`:

```json
{
  "force": {
    "title": "É necessário atualizar",
    "body": "Esta versão do Inceptio não é mais compatível. Atualize para continuar escolhendo seus momentos.",
    "action": "Atualizar",
    "actionHint": "Abre sua loja de aplicativos",
    "retry": "Tentar novamente",
    "retryOffline": "Não foi possível acessar o servidor de atualização. Verifique sua conexão.",
    "openFailed": "Não foi possível abrir a loja. Tente novamente."
  },
  "soft": {
    "message": "Uma nova versão do Inceptio está pronta.",
    "action": "Atualizar",
    "dismiss": "Dispensar"
  }
}
```

- [ ] **Step 5: Wire the 18th namespace into the eager barrel**

In `apps/mobile/src/i18n/index.ts`:

(a) Add 5 imports next to the other per-locale CHROME imports:
```ts
import en_update from '../locales/en/update.json';
import de_update from '../locales/de/update.json';
import fr_update from '../locales/fr/update.json';
import es419_update from '../locales/es-419/update.json';
import ptBR_update from '../locales/pt-BR/update.json';
```

(b) Add `update: Json` as the 18th param of `bundle()` and to its returned object:
```ts
const bundle = (
  common: Json, nav: Json, onboarding: Json, activity: Json, daterange: Json,
  location: Json, loading: Json, calendar: Json, moment: Json, noviable: Json,
  moments: Json, settings: Json, paywall: Json, today: Json, card: Json, errors: Json,
  share: Json, update: Json,
) => ({
  common, nav, onboarding, activity, daterange, location, loading, calendar,
  moment, noviable, moments, settings, paywall, today, card, errors, share, update,
});
```

(c) Append the matching arg to each of the 5 `bundle(...)` call sites (`en_update`, `de_update`, `fr_update`, `es419_update`, `ptBR_update` respectively), e.g. for en:
```ts
  en: bundle(
    en_common, en_nav, en_onboarding, en_activity, en_daterange, en_location,
    en_loading, en_calendar, en_moment, en_noviable, en_moments, en_settings,
    en_paywall, en_today, en_card, en_errors, en_share, en_update,
  ),
```

**SCOPE-GUARD (spec §4):** add the param in place. Do NOT refactor the positional `bundle()` into an object/map — that's separate tech debt, out of scope.

- [ ] **Step 6: Run coverage + literal-lint to verify green**

Run: `cd apps/mobile && npx vitest run src/i18n/__tests__/coverage.test.ts src/i18n/__tests__/no-literal-lint.test.ts`
Expected: PASS (18 namespaces, all 5 locales present, every en key present in non-en, `TRANSLATION_DEFERRED` still `[]`).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/locales/*/update.json apps/mobile/src/i18n/index.ts apps/mobile/src/i18n/__tests__/coverage.test.ts
git commit -m "feat(i18n): add 'update' CHROME namespace (force-update gate copy) x5 locales"
```

---

## Task 1: `VersionPolicy` Zod schema (shared-types)

**Files:**
- Create: `packages/shared-types/src/api/version-policy.ts`
- Modify: `packages/shared-types/src/index.ts`
- Test: `packages/shared-types/src/__tests__/version-policy.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/shared-types/src/__tests__/version-policy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { VersionPolicySchema } from '../api/version-policy';

const valid = {
  forceEnabled: true,
  ios: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://apps.apple.com/app/id1' },
  android: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://play.google.com/store/apps/details?id=x' },
};

describe('VersionPolicySchema', () => {
  it('accepts a valid doc', () => {
    expect(VersionPolicySchema.safeParse(valid).success).toBe(true);
  });
  it('accepts a doc with only one platform (other → fail-open downstream)', () => {
    const { android, ...iosOnly } = valid;
    expect(VersionPolicySchema.safeParse(iosOnly).success).toBe(true);
  });
  it('rejects a missing forceEnabled', () => {
    const { forceEnabled, ...rest } = valid;
    expect(VersionPolicySchema.safeParse(rest).success).toBe(false);
  });
  it('rejects a non-string version', () => {
    const bad = { ...valid, ios: { ...valid.ios, minVersion: 2 } };
    expect(VersionPolicySchema.safeParse(bad).success).toBe(false);
  });
  it('rejects a non-url storeUrl', () => {
    const bad = { ...valid, ios: { ...valid.ios, storeUrl: 'not-a-url' } };
    expect(VersionPolicySchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/shared-types && npx vitest run src/__tests__/version-policy.test.ts`
Expected: FAIL — cannot resolve `../api/version-policy`.

- [ ] **Step 3: Write the schema**

`packages/shared-types/src/api/version-policy.ts`:

```ts
import { z } from 'zod';

/** Per-platform policy. Versions are plain marketing strings ("1.2.3"); semver
 *  parsing/validation happens in the decision fn (fail-open on unparseable),
 *  NOT here — the schema only guarantees shape. storeUrl is constrained to a URL
 *  so an operator typo fails Worker validation (→503→client fail-opens) rather
 *  than rendering a dead Update button. */
export const PlatformPolicySchema = z.object({
  minVersion: z.string(),
  latestVersion: z.string(),
  storeUrl: z.string().url(),
});
export type PlatformPolicy = z.infer<typeof PlatformPolicySchema>;

/** Both platforms optional → a missing platform key is a valid doc and the
 *  decision fn returns 'none'/'missing_platform' (fail-open). */
export const VersionPolicySchema = z.object({
  forceEnabled: z.boolean(),
  ios: PlatformPolicySchema.optional(),
  android: PlatformPolicySchema.optional(),
});
export type VersionPolicy = z.infer<typeof VersionPolicySchema>;
```

- [ ] **Step 4: Export from the barrel**

In `packages/shared-types/src/index.ts` add:
```ts
export * from './api/version-policy';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared-types && npx vitest run src/__tests__/version-policy.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/api/version-policy.ts packages/shared-types/src/index.ts packages/shared-types/src/__tests__/version-policy.test.ts
git commit -m "feat(shared-types): VersionPolicy Zod schema"
```

---

## Task 2: `semver` util (shared-types)

**Files:**
- Create: `packages/shared-types/src/semver.ts`
- Modify: `packages/shared-types/src/index.ts`
- Test: `packages/shared-types/src/__tests__/semver.test.ts`

- [ ] **Step 1: Write the failing golden test**

`packages/shared-types/src/__tests__/semver.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSemver, compareSemver } from '../semver';

describe('parseSemver', () => {
  const ok: Array<[string, [number, number, number]]> = [
    ['1.2.3', [1, 2, 3]],
    ['v1.2.3', [1, 2, 3]],
    [' 1.2.3 ', [1, 2, 3]],
    ['1.2.3-beta.1', [1, 2, 3]],
    ['1.2.3+42', [1, 2, 3]],
    ['0.0.0', [0, 0, 0]],
  ];
  it.each(ok)('parses %s', (input, [major, minor, patch]) => {
    expect(parseSemver(input)).toEqual({ major, minor, patch });
  });
  const bad = ['1.2', '1', '', 'abc', '1.2.x', '1.2.3.4'];
  it.each(bad)('rejects %s → null', (input) => {
    expect(parseSemver(input)).toBeNull();
  });
  it.each([null, undefined, 2, {}])('rejects non-string %s → null', (input) => {
    expect(parseSemver(input as unknown)).toBeNull();
  });
});

describe('compareSemver', () => {
  const v = (s: string) => parseSemver(s)!;
  it('orders major', () => { expect(compareSemver(v('2.0.0'), v('1.9.9'))).toBe(1); });
  it('orders minor', () => { expect(compareSemver(v('1.2.0'), v('1.3.0'))).toBe(-1); });
  it('orders patch', () => { expect(compareSemver(v('1.2.3'), v('1.2.4'))).toBe(-1); });
  it('equal', () => { expect(compareSemver(v('1.2.3'), v('1.2.3'))).toBe(0); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/shared-types && npx vitest run src/__tests__/semver.test.ts`
Expected: FAIL — cannot resolve `../semver`.

- [ ] **Step 3: Write the util**

`packages/shared-types/src/semver.ts`:

```ts
/** Minimal, dependency-free semver for store MARKETING versions ("x.y.z").
 *  Tolerant of a leading 'v', surrounding whitespace, and a pre-release/build
 *  suffix (ignored). Returns null on anything not readable as exactly three
 *  non-negative integers — callers MUST treat null as "unknown" and fail open.
 *  Never throws. No implicit zero-fill (a 2-part "1.2" is null, not 1.2.0). */
export type Semver = { major: number; minor: number; patch: number };

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

export function parseSemver(input: unknown): Semver | null {
  if (typeof input !== 'string') return null;
  const m = SEMVER_RE.exec(input.trim());
  if (!m) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) {
    return null;
  }
  return { major, minor, patch };
}

export function compareSemver(a: Semver, b: Semver): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}
```

- [ ] **Step 4: Export from the barrel**

In `packages/shared-types/src/index.ts` add:
```ts
export * from './semver';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared-types && npx vitest run src/__tests__/semver.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/semver.ts packages/shared-types/src/index.ts packages/shared-types/src/__tests__/semver.test.ts
git commit -m "feat(shared-types): zero-dep semver parse/compare util"
```

---

## Task 3: `decision.ts` — pure, total, fail-open (the safety-critical file)

**Files:**
- Create: `apps/mobile/src/lib/update-gate/decision.ts`
- Test: `apps/mobile/src/lib/update-gate/__tests__/decision.test.ts`

- [ ] **Step 1: Write the failing golden table**

`apps/mobile/src/lib/update-gate/__tests__/decision.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateUpdateState } from '../decision';
import type { VersionPolicy } from '@inceptio/shared-types';

const url = 'https://apps.apple.com/app/id1';
const policy = (over: Partial<VersionPolicy['ios']> & { forceEnabled?: boolean; bothPlatforms?: boolean } = {}): VersionPolicy => ({
  forceEnabled: over.forceEnabled ?? true,
  ios: { minVersion: over.minVersion ?? '1.2.0', latestVersion: over.latestVersion ?? '1.5.0', storeUrl: url },
});

type Row = [string, unknown, Partial<Parameters<typeof policy>[0]>, 'ios' | 'android', string, string];
const rows: Row[] = [
  ['force',                  '1.0.0', {}, 'ios', 'force', 'force'],
  ['soft band',              '1.3.0', {}, 'ios', 'soft', 'soft'],
  ['up to date (equal)',     '1.5.0', {}, 'ios', 'none', 'up_to_date'],
  ['up to date (newer)',     '1.6.0', {}, 'ios', 'none', 'up_to_date'],
  ['boundary == min',        '1.2.0', {}, 'ios', 'soft', 'soft'],
  ['force disabled',         '1.0.0', { forceEnabled: false }, 'ios', 'soft', 'force_disabled'],
  ['min>latest, below',      '1.0.0', { minVersion: '1.5.0', latestVersion: '1.2.0' }, 'ios', 'soft', 'min_exceeds_latest'],
  ['min>latest, mid',        '1.3.0', { minVersion: '1.5.0', latestVersion: '1.2.0' }, 'ios', 'none', 'min_exceeds_latest'],
  ['unparseable installed',  'abc',   {}, 'ios', 'none', 'unparseable_installed'],
  ['null installed',         null,    {}, 'ios', 'none', 'unparseable_installed'],
  ['unparseable policy min', '1.0.0', { minVersion: 'x' }, 'ios', 'none', 'unparseable_policy'],
  ['missing platform',       '1.0.0', {}, 'android', 'none', 'missing_platform'],
];

describe('evaluateUpdateState', () => {
  it.each(rows)('%s', (_label, installed, over, platform, state, reason) => {
    const result = evaluateUpdateState(installed, policy(over), platform);
    expect(result).toEqual({ state, reason });
  });
  it('never throws on a wildly malformed policy', () => {
    // @ts-expect-error intentional garbage
    expect(() => evaluateUpdateState('1.0.0', {}, 'ios')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/decision.test.ts`
Expected: FAIL — cannot resolve `../decision`.

- [ ] **Step 3: Write the decision fn**

`apps/mobile/src/lib/update-gate/decision.ts`:

```ts
import { parseSemver, compareSemver, type VersionPolicy } from '@inceptio/shared-types';

export type UpdateState = 'force' | 'soft' | 'none';
export type UpdateReason =
  | 'force'
  | 'soft'
  | 'up_to_date'
  | 'force_disabled'
  | 'min_exceeds_latest'
  | 'unparseable_installed'
  | 'missing_platform'
  | 'unparseable_policy';

/** TIME-FREE, TOTAL, FAIL-OPEN. The only lockout-capable code path, and there
 *  is no OTA escape — so its only failure mode is 'none' ("let the user in").
 *  Never throws, never spuriously forces. Force is unconditional/stateless:
 *  it consults no time, cooldown, or suppression. */
export function evaluateUpdateState(
  installed: unknown,
  policy: VersionPolicy,
  platform: 'ios' | 'android',
): { state: UpdateState; reason: UpdateReason } {
  const inst = parseSemver(installed);
  if (!inst) return { state: 'none', reason: 'unparseable_installed' };

  const p = policy?.[platform];
  if (!p) return { state: 'none', reason: 'missing_platform' };

  const min = parseSemver(p.minVersion);
  const latest = parseSemver(p.latestVersion);
  if (!min || !latest) return { state: 'none', reason: 'unparseable_policy' };

  const belowLatest = compareSemver(inst, latest) < 0;

  // Incoherent policy backstop (Worker also guards this) — never force.
  if (compareSemver(min, latest) > 0) {
    return belowLatest
      ? { state: 'soft', reason: 'min_exceeds_latest' }
      : { state: 'none', reason: 'min_exceeds_latest' };
  }

  if (compareSemver(inst, min) < 0) {
    if (policy.forceEnabled) return { state: 'force', reason: 'force' };
    // Killed force degrades to a soft nudge (inst < min ≤ latest ⟹ inst < latest).
    return { state: 'soft', reason: 'force_disabled' };
  }

  if (belowLatest) return { state: 'soft', reason: 'soft' };
  return { state: 'none', reason: 'up_to_date' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/decision.test.ts`
Expected: PASS (13 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/update-gate/decision.ts apps/mobile/src/lib/update-gate/__tests__/decision.test.ts
git commit -m "feat(update-gate): pure total fail-open decision fn"
```

---

## Task 4: `banner-policy.ts` — pure soft-banner suppression

**Files:**
- Create: `apps/mobile/src/lib/update-gate/banner-policy.ts`
- Test: `apps/mobile/src/lib/update-gate/__tests__/banner-policy.test.ts`

- [ ] **Step 1: Write the failing golden table**

`apps/mobile/src/lib/update-gate/__tests__/banner-policy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldShowSoftBanner, SOFT_BANNER_CONFIG } from '../banner-policy';
import type { UpdateState } from '../decision';

const NOW = new Date('2026-06-11T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

const call = (state: UpdateState, latestVersion: string, dismissedForVersion: string | null, dismissedAt: string | null) =>
  shouldShowSoftBanner({ state, latestVersion, suppression: { dismissedForVersion, dismissedAt }, config: SOFT_BANNER_CONFIG, now: NOW });

describe('shouldShowSoftBanner (cooldownDays=7)', () => {
  it('soft + never dismissed → true', () => { expect(call('soft', '1.5.0', null, null)).toBe(true); });
  it('soft + same version dismissed 1d ago → false (sticky)', () => { expect(call('soft', '1.5.0', '1.5.0', daysAgo(1))).toBe(false); });
  it('soft + same version dismissed 100d ago → false (sticky forever)', () => { expect(call('soft', '1.5.0', '1.5.0', daysAgo(100))).toBe(false); });
  it('soft + old version dismissed 2d ago, new latest → false (floor)', () => { expect(call('soft', '1.6.0', '1.5.0', daysAgo(2))).toBe(false); });
  it('soft + old version dismissed 30d ago, new latest → true', () => { expect(call('soft', '1.6.0', '1.5.0', daysAgo(30))).toBe(true); });
  it('soft + dismissed EXACTLY 7d ago, new latest → true (< boundary)', () => { expect(call('soft', '1.6.0', '1.5.0', daysAgo(7))).toBe(true); });
  it('soft + future dismissedAt (clock skew) → false', () => { expect(call('soft', '1.6.0', '1.5.0', inDays(3))).toBe(false); });
  it('force → false', () => { expect(call('force', '1.5.0', null, null)).toBe(false); });
  it('none → false', () => { expect(call('none', '1.5.0', null, null)).toBe(false); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/banner-policy.test.ts`
Expected: FAIL — cannot resolve `../banner-policy`.

- [ ] **Step 3: Write the policy**

`apps/mobile/src/lib/update-gate/banner-policy.ts`:

```ts
import { MS_PER_DAY } from '../rating/eligibility';
import type { UpdateState } from './decision';

export type SoftSuppression = {
  dismissedForVersion: string | null;
  dismissedAt: string | null; // ISO
};
export type SoftBannerConfig = { cooldownDays: number };

/** N is only the cross-bump floor; per-version permanent silence does the
 *  heavy anti-nag work. 7 = "at most weekly". Post-launch dial (manual-feedback
 *  driven; no analytics in scope — spec §9.3). */
export const SOFT_BANNER_CONFIG: SoftBannerConfig = { cooldownDays: 7 };

// Native-Date elapsed days (date-fns is not installed). Reuses MS_PER_DAY from
// the rating core. A future stored timestamp yields a NEGATIVE value, which the
// `< cooldownDays` guard reads as "still cooling down" → suppress (clock-skew safe).
function elapsedDays(now: Date, storedIso: string): number {
  return (now.getTime() - new Date(storedIso).getTime()) / MS_PER_DAY;
}

export function shouldShowSoftBanner(input: {
  state: UpdateState;
  latestVersion: string;
  suppression: SoftSuppression;
  config: SoftBannerConfig;
  now: Date;
}): boolean {
  const { state, latestVersion, suppression, config, now } = input;
  if (state !== 'soft') return false;

  const { dismissedForVersion, dismissedAt } = suppression;
  // Dismissing a version silences THAT version permanently.
  if (dismissedForVersion === latestVersion) return false;
  // Global floor after any dismiss (applies across version bumps).
  if (dismissedAt !== null && elapsedDays(now, dismissedAt) < config.cooldownDays) return false;

  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/banner-policy.test.ts`
Expected: PASS (9 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/update-gate/banner-policy.ts apps/mobile/src/lib/update-gate/__tests__/banner-policy.test.ts
git commit -m "feat(update-gate): pure soft-banner suppression policy"
```

---

## Task 5: Worker `GET /version-policy` route

**Files:**
- Create: `workers/api-proxy/src/routes/version-policy.ts`
- Modify: `workers/api-proxy/src/index.ts`
- Test: `workers/api-proxy/src/routes/__tests__/version-policy.test.ts`

- [ ] **Step 1: Write the failing test**

`workers/api-proxy/src/routes/__tests__/version-policy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { handleVersionPolicy } from '../version-policy';

function envWith(value: string | null) {
  const store = new Map<string, string>();
  if (value !== null) store.set('version-policy', value);
  return { CACHE: { get: async (k: string) => store.get(k) ?? null } } as unknown as import('../../env').Env;
}

const valid = JSON.stringify({
  forceEnabled: true,
  ios: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://apps.apple.com/app/id1' },
});

describe('handleVersionPolicy', () => {
  it('200 + 60s cache-control for a valid doc', async () => {
    const res = await handleVersionPolicy(envWith(valid));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect((await res.json() as any).forceEnabled).toBe(true);
  });
  it('503 when the key is missing', async () => {
    const res = await handleVersionPolicy(envWith(null));
    expect(res.status).toBe(503);
  });
  it('503 when the value is not JSON', async () => {
    const res = await handleVersionPolicy(envWith('{not json'));
    expect(res.status).toBe(503);
  });
  it('503 when the doc fails schema', async () => {
    const res = await handleVersionPolicy(envWith(JSON.stringify({ forceEnabled: 'yes' })));
    expect(res.status).toBe(503);
  });
  it('neutralizes forceEnabled to false when min>latest on a platform', async () => {
    const incoherent = JSON.stringify({
      forceEnabled: true,
      ios: { minVersion: '1.9.0', latestVersion: '1.2.0', storeUrl: 'https://apps.apple.com/app/id1' },
    });
    const res = await handleVersionPolicy(envWith(incoherent));
    expect(res.status).toBe(200);
    expect((await res.json() as any).forceEnabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd workers/api-proxy && npx vitest run src/routes/__tests__/version-policy.test.ts`
Expected: FAIL — cannot resolve `../version-policy`.

- [ ] **Step 3: Write the handler**

`workers/api-proxy/src/routes/version-policy.ts`:

```ts
import type { Env } from '../env';
import { VersionPolicySchema, parseSemver, compareSemver, type VersionPolicy } from '@inceptio/shared-types';

// Reserved key in the shared CACHE namespace (mirrors `health:upstream`).
// CRITICAL: this key is written WITHOUT an expirationTtl (persistent) and must
// be excluded from any future cache-flush/clear logic — eviction → 503 → the
// gate goes silently inert. (No flush-all logic exists today; search/health use
// per-key TTLs only.)
const KEY = 'version-policy';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Serve-time second safety layer. A corrupt/incoherent KV doc can never leave
 *  the Worker as a force-capable response. */
export async function handleVersionPolicy(env: Env): Promise<Response> {
  const raw = await env.CACHE.get(KEY);
  if (raw === null) {
    console.warn('[version-policy] KV key missing — endpoint inert (client fail-opens)');
    return Response.json({ error: 'no_policy' }, { status: 503, headers: NO_STORE });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[version-policy] KV value is not JSON');
    return Response.json({ error: 'bad_policy' }, { status: 503, headers: NO_STORE });
  }

  const result = VersionPolicySchema.safeParse(parsed);
  if (!result.success) {
    console.warn('[version-policy] KV doc failed schema:', result.error.message);
    return Response.json({ error: 'bad_policy' }, { status: 503, headers: NO_STORE });
  }

  const doc = neutralizeIncoherent(result.data);
  return Response.json(doc, { headers: { 'Cache-Control': 'public, max-age=60' } });
}

/** If any platform has min>latest, the doc is incoherent — disable force for
 *  the whole doc (degrade to soft) so an operator typo can't mass-lock. */
function neutralizeIncoherent(doc: VersionPolicy): VersionPolicy {
  for (const platform of ['ios', 'android'] as const) {
    const p = doc[platform];
    if (!p) continue;
    const min = parseSemver(p.minVersion);
    const latest = parseSemver(p.latestVersion);
    if (min && latest && compareSemver(min, latest) > 0) {
      console.warn(`[version-policy] incoherent ${platform} min>latest — neutralizing forceEnabled`);
      return { ...doc, forceEnabled: false };
    }
  }
  return doc;
}
```

- [ ] **Step 4: Register the route**

In `workers/api-proxy/src/index.ts`, add the import near the other route imports:
```ts
import { handleVersionPolicy } from './routes/version-policy';
```
and add the branch (after the `/health` branch):
```ts
    if (url.pathname === '/version-policy' && req.method === 'GET') {
      return handleVersionPolicy(env);
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd workers/api-proxy && npx vitest run src/routes/__tests__/version-policy.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 6: Commit**

```bash
git add workers/api-proxy/src/routes/version-policy.ts workers/api-proxy/src/index.ts workers/api-proxy/src/routes/__tests__/version-policy.test.ts
git commit -m "feat(worker): GET /version-policy (KV + schema/coherence guard + 60s cache)"
```

---

## Task 6: `update-store.ts` — impure shell

**Files:**
- Create: `apps/mobile/src/lib/update-gate/update-store.ts`
- Test: `apps/mobile/src/lib/update-gate/__tests__/update-store.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/mobile/src/lib/update-gate/__tests__/update-store.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map<string, string>();
vi.mock('../../storage', () => ({
  storage: {
    getString: (k: string) => memory.get(k),
    set: (k: string, v: string) => { memory.set(k, v); },
    delete: (k: string) => { memory.delete(k); },
  },
}));

import { fetchPolicy, loadSuppression, recordSoftDismiss } from '../update-store';

const valid = {
  forceEnabled: true,
  ios: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://apps.apple.com/app/id1' },
};

beforeEach(() => { memory.clear(); vi.restoreAllMocks(); });

describe('fetchPolicy (fail-open on every failure path)', () => {
  it('returns the parsed policy on 200 + valid body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(valid), { status: 200 })));
    expect(await fetchPolicy('https://api.test')).toEqual(valid);
  });
  it('returns null on non-200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 503 })));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
  it('returns null on a network throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
  it('returns null on invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{not json', { status: 200 })));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
  it('returns null on schema mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ forceEnabled: 'no' }), { status: 200 })));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
});

describe('soft suppression storage', () => {
  it('round-trips dismiss → load', () => {
    const now = new Date('2026-06-11T00:00:00.000Z');
    recordSoftDismiss('1.5.0', now);
    expect(loadSuppression()).toEqual({ dismissedForVersion: '1.5.0', dismissedAt: now.toISOString() });
  });
  it('empty suppression before any dismiss', () => {
    expect(loadSuppression()).toEqual({ dismissedForVersion: null, dismissedAt: null });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/update-store.test.ts`
Expected: FAIL — cannot resolve `../update-store`.

- [ ] **Step 3: Write the shell**

`apps/mobile/src/lib/update-gate/update-store.ts`:

```ts
import * as Application from 'expo-application';
import { VersionPolicySchema, type VersionPolicy } from '@inceptio/shared-types';
import { storage } from '../storage';
import type { SoftSuppression } from './banner-policy';

const FETCH_TIMEOUT_MS = 5000;

const K = {
  softDismissedVersion: 'update.softDismissedVersion',
  softDismissedAt: 'update.softDismissedAt',
} as const;

/** Installed NATIVE marketing version (OTA-independent). NOTE: inside Expo Go
 *  this returns Expo Go's version — correct only in a standalone/dev-client
 *  build. The __DEV__ simulator (use-update-gate) is the local-test path. */
export function getInstalledVersion(): string | null {
  return Application.nativeApplicationVersion ?? null;
}

/** GET <baseUrl>/version-policy with its OWN ~5s timeout (never reuse the 60s
 *  API_CONFIG.timeout). EVERY failure — network, timeout, non-200, bad JSON,
 *  schema mismatch — returns null ≡ fail-open. A malformed policy can never
 *  produce 'force'. */
export async function fetchPolicy(baseUrl: string): Promise<VersionPolicy | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/version-policy`, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = VersionPolicySchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function loadSuppression(): SoftSuppression {
  return {
    dismissedForVersion: storage.getString(K.softDismissedVersion) ?? null,
    dismissedAt: storage.getString(K.softDismissedAt) ?? null,
  };
}

export function recordSoftDismiss(latestVersion: string, now: Date = new Date()): void {
  storage.set(K.softDismissedVersion, latestVersion);
  storage.set(K.softDismissedAt, now.toISOString());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/update-store.test.ts`
Expected: PASS (7 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/update-gate/update-store.ts apps/mobile/src/lib/update-gate/__tests__/update-store.test.ts
git commit -m "feat(update-gate): fetch shell (fail-open) + soft-dismiss storage"
```

---

## Task 7: `controller.ts` — framework-agnostic state machine (the reach/safety contract)

**Files:**
- Create: `apps/mobile/src/lib/update-gate/controller.ts`
- Test: `apps/mobile/src/lib/update-gate/__tests__/controller.test.ts`

- [ ] **Step 1: Write the failing fake-timer contract test**

`apps/mobile/src/lib/update-gate/__tests__/controller.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createUpdateGateController } from '../controller';
import type { VersionPolicy } from '@inceptio/shared-types';

const url = 'https://apps.apple.com/app/id1';
const forcePolicy: VersionPolicy = { forceEnabled: true, ios: { minVersion: '2.0.0', latestVersion: '2.0.0', storeUrl: url } };
const okPolicy: VersionPolicy = { forceEnabled: true, ios: { minVersion: '1.0.0', latestVersion: '1.0.0', storeUrl: url } };

function make(fetchImpl: () => Promise<VersionPolicy | null>) {
  const fetchPolicy = vi.fn(fetchImpl);
  const c = createUpdateGateController({
    installed: '1.0.0', platform: 'ios', fetchPolicy, pollMs: 60_000, throttleMs: 60_000,
  });
  return { c, fetchPolicy };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

describe('update-gate controller', () => {
  it('fail-open entry: a failed first fetch never creates a gate', async () => {
    const { c } = make(async () => null);
    await c.check('mount');
    expect(c.getSnapshot().state).toBe('none');
  });

  it('enters force only on a successful fetch', async () => {
    const { c } = make(async () => forcePolicy);
    await c.check('mount');
    expect(c.getSnapshot().state).toBe('force');
  });

  it('persistence: a failed re-check does NOT clear an active force', async () => {
    let policy: VersionPolicy | null = forcePolicy;
    const { c } = make(async () => policy);
    await c.check('mount');
    expect(c.getSnapshot().state).toBe('force');
    policy = null; // go offline
    await c.check('foreground');
    expect(c.getSnapshot().state).toBe('force'); // stays gated
  });

  it('exit: a successful non-force re-check clears the gate', async () => {
    let policy: VersionPolicy | null = forcePolicy;
    const { c } = make(async () => policy);
    await c.check('mount');
    policy = okPolicy; // kill-switch / fixed
    await c.check('foreground');
    expect(c.getSnapshot().state).toBe('none');
  });

  it('throttle when NOT gated: a 2nd foreground within throttleMs is skipped', async () => {
    const { c, fetchPolicy } = make(async () => okPolicy);
    await c.check('mount');          // 1 (none)
    await c.check('foreground');     // 2
    await c.check('foreground');     // skipped (within 60s)
    expect(fetchPolicy).toHaveBeenCalledTimes(2);
  });

  it('NO throttle when gated: every foreground re-checks', async () => {
    const { c, fetchPolicy } = make(async () => forcePolicy);
    await c.check('mount');          // 1 (force)
    await c.check('foreground');     // 2
    await c.check('foreground');     // 3 — gated → not throttled
    expect(fetchPolicy).toHaveBeenCalledTimes(3);
  });

  it('polls while gated and stops after clear', async () => {
    let policy: VersionPolicy | null = forcePolicy;
    const { c, fetchPolicy } = make(async () => policy);
    await c.check('mount');                 // 1 (force) → poll scheduled
    await vi.advanceTimersByTimeAsync(60_000); // poll → 2
    expect(fetchPolicy).toHaveBeenCalledTimes(2);
    policy = okPolicy;
    await vi.advanceTimersByTimeAsync(60_000); // poll → 3, clears, stops polling
    expect(c.getSnapshot().state).toBe('none');
    await vi.advanceTimersByTimeAsync(120_000); // no more polls
    expect(fetchPolicy).toHaveBeenCalledTimes(3);
    c.dispose();
  });

  it('dedups concurrent checks into one fetch', async () => {
    let resolve!: (p: VersionPolicy | null) => void;
    const { c, fetchPolicy } = make(() => new Promise((r) => { resolve = r; }));
    const a = c.check('mount');
    const b = c.check('foreground');
    resolve(okPolicy);
    await Promise.all([a, b]);
    expect(fetchPolicy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/controller.test.ts`
Expected: FAIL — cannot resolve `../controller`.

- [ ] **Step 3: Write the controller**

`apps/mobile/src/lib/update-gate/controller.ts`:

```ts
import type { VersionPolicy } from '@inceptio/shared-types';
import { evaluateUpdateState, type UpdateReason, type UpdateState } from './decision';

export type GateSnapshot = { state: UpdateState; reason: UpdateReason | 'pending' };
export type CheckReason = 'mount' | 'foreground' | 'poll' | 'manual';

export type ControllerOptions = {
  installed: string | null;
  platform: 'ios' | 'android';
  fetchPolicy: () => Promise<VersionPolicy | null>;
  pollMs?: number;     // default 60_000
  throttleMs?: number; // default 60_000
  now?: () => number;  // injectable clock (default Date.now)
};

export type UpdateGateController = {
  getSnapshot: () => GateSnapshot;
  subscribe: (listener: () => void) => () => void;
  check: (reason: CheckReason) => Promise<void>;
  recheck: () => Promise<void>; // manual (Retry button) — never throttled
  dispose: () => void;
};

const PENDING: GateSnapshot = { state: 'none', reason: 'pending' };

export function createUpdateGateController(opts: ControllerOptions): UpdateGateController {
  const pollMs = opts.pollMs ?? 60_000;
  const throttleMs = opts.throttleMs ?? 60_000;
  const now = opts.now ?? (() => Date.now());

  let snapshot: GateSnapshot = PENDING;
  let lastCheckAt = 0;
  let inFlight: Promise<void> | null = null;
  let pollHandle: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const gated = () => snapshot.state === 'force';
  const emit = () => { for (const l of listeners) l(); };

  function setSnapshot(next: GateSnapshot) {
    if (next.state === snapshot.state && next.reason === snapshot.reason) return;
    snapshot = next;
    emit();
  }

  function stopPoll() { if (pollHandle) { clearTimeout(pollHandle); pollHandle = null; } }
  function ensurePoll() {
    if (pollHandle) return;
    pollHandle = setTimeout(() => { pollHandle = null; void check('poll'); }, pollMs);
  }

  async function runFetch(): Promise<void> {
    const policy = await opts.fetchPolicy();
    lastCheckAt = now();
    if (policy === null) {
      // FAIL-OPEN: never create or clear a gate on a failed fetch. If pending,
      // resolve to 'none' (let in). If already forced, KEEP it (no bypass).
      if (snapshot.reason === 'pending') setSnapshot({ state: 'none', reason: 'unparseable_policy' });
    } else {
      const d = evaluateUpdateState(opts.installed, policy, opts.platform);
      setSnapshot({ state: d.state, reason: d.reason });
    }
    // Manage the while-gated poll.
    if (gated()) ensurePoll(); else stopPoll();
  }

  function check(reason: CheckReason): Promise<void> {
    // Throttle ONLY foreground re-checks while NOT gated. Mount/poll/manual and
    // any check while gated are never throttled (kill-switch must reach gated
    // users fastest).
    if (reason === 'foreground' && !gated() && now() - lastCheckAt < throttleMs) {
      return Promise.resolve();
    }
    if (inFlight) return inFlight; // in-flight dedup
    inFlight = runFetch().finally(() => { inFlight = null; });
    return inFlight;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    check,
    recheck: () => check('manual'),
    dispose: () => { stopPoll(); listeners.clear(); },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/update-gate/__tests__/controller.test.ts`
Expected: PASS (8 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/update-gate/controller.ts apps/mobile/src/lib/update-gate/__tests__/controller.test.ts
git commit -m "feat(update-gate): controller state machine (fail-open/persistence/throttle/poll)"
```

---

## Task 8: `use-update-gate.ts` — thin React hook

**Files:**
- Create: `apps/mobile/src/lib/update-gate/use-update-gate.ts`

(No unit test — covered by the controller tests + the manual device matrix. The hook is pure wiring: `useSyncExternalStore` + real `AppState` + native version + `__DEV__` simulator.)

- [ ] **Step 1: Write the hook**

`apps/mobile/src/lib/update-gate/use-update-gate.ts`:

```ts
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { API_CONFIG } from '../api'; // existing module exposing the Worker baseUrl
import { getInstalledVersion, fetchPolicy } from './update-store';
import { createUpdateGateController } from './controller';
import type { UpdateState } from './decision';

export type UseUpdateGate = {
  state: UpdateState;
  pending: boolean;
  recheck: () => Promise<void>;
  // __DEV__ simulator surface (no-op in prod):
  devOverride: UpdateState | null;
  setDevOverride: (s: UpdateState | null) => void;
};

export function useUpdateGate(): UseUpdateGate {
  // In __DEV__, never run a real fetch (Expo Go reports the wrong native version
  // → would spuriously gate). The gate is exercised via the simulator instead.
  const controller = useMemo(() => createUpdateGateController({
    installed: getInstalledVersion(),
    platform: AppState.currentState === 'active' && /ios/i.test('') ? 'ios' : (require('react-native').Platform.OS as 'ios' | 'android'),
    fetchPolicy: __DEV__ ? async () => null : () => fetchPolicy(API_CONFIG.baseUrl),
  }), []);

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  // Mount check + AppState true-bg→active re-check.
  const prevState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (!__DEV__) void controller.check('mount');
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground = prevState.current === 'background';
      prevState.current = next;
      if (next === 'active' && wasBackground && !__DEV__) void controller.check('foreground');
    });
    return () => { sub.remove(); controller.dispose(); };
  }, [controller]);

  const [devOverride, setDevOverride] = useState<UpdateState | null>(null);
  const state = __DEV__ && devOverride ? devOverride : snapshot.state;

  return { state, pending: snapshot.reason === 'pending', recheck: controller.recheck, devOverride, setDevOverride };
}
```

> **Note for the implementer:** simplify the `platform` line to just `Platform.OS` with a top-level `import { AppState, Platform, type AppStateStatus } from 'react-native'`. The convoluted expression above is a placeholder artifact — replace with:
> ```ts
> platform: Platform.OS === 'ios' ? 'ios' : 'android',
> ```
> Also confirm `API_CONFIG.baseUrl` is the exported Worker origin in `apps/mobile/src/lib/api.ts`; if the export differs (e.g. `API_CONFIG.url`), use the real name (archaeology flagged prod `baseUrl` as TBD — wire to whatever the existing search client uses).

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS (no type errors in `use-update-gate.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/update-gate/use-update-gate.ts
git commit -m "feat(update-gate): useUpdateGate hook (useSyncExternalStore + AppState + dev simulator)"
```

---

## Task 9: `UpdateGateScreen.tsx` — full-screen force gate

**Files:**
- Create: `apps/mobile/src/components/UpdateGateScreen.tsx`

(Visual/native — not unit-tested in Node; covered by the manual a11y matrix.)

- [ ] **Step 1: Write the component**

`apps/mobile/src/components/UpdateGateScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking, Platform, AccessibilityInfo, findNodeHandle, ToastAndroid, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

type Props = { storeUrl: string; onRecheck: () => Promise<void> };

export default function UpdateGateScreen({ storeUrl, onRecheck }: Props) {
  const { t } = useTranslation('update');
  const titleRef = useRef<Text>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);

  // Move screen-reader focus to the title on mount (no accessibilityAutoFocus —
  // not a real RN prop).
  useEffect(() => {
    const tag = findNodeHandle(titleRef.current);
    if (tag != null) AccessibilityInfo.setAccessibilityFocus(tag);
  }, []);

  const announce = useCallback((msg: string) => {
    AccessibilityInfo.announceForAccessibility(msg); // iOS (liveRegion is Android-only)
  }, []);

  const openStore = useCallback(async () => {
    try {
      await Linking.openURL(storeUrl); // https → no canOpenURL precheck needed
    } catch {
      const msg = t('force.openFailed');
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
      else Alert.alert('', msg);
      announce(msg);
    }
  }, [storeUrl, t, announce]);

  const retry = useCallback(async () => {
    setBusy(true); setOffline(false);
    try {
      await onRecheck();
    } finally {
      setBusy(false);
    }
    // If still mounted after recheck, the policy didn't clear → surface offline copy.
    setOffline(true);
    announce(t('force.retryOffline'));
  }, [onRecheck, t, announce]);

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={styles.content}>
        <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
          {t('force.title')}
        </Text>
        <Text style={styles.body}>{t('force.body')}</Text>

        <Pressable
          onPress={openStore}
          accessibilityRole="button"
          accessibilityLabel={t('force.action')}
          accessibilityHint={t('force.actionHint')}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>{t('force.action')}</Text>
        </Pressable>

        <Pressable
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel={t('force.retry')}
          accessibilityState={{ busy }}
          style={styles.secondary}
        >
          {busy ? <ActivityIndicator color={colors.textMuted} /> : <Text style={styles.secondaryLabel}>{t('force.retry')}</Text>}
        </Pressable>

        {offline && !busy ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.offline}>
            {t('force.retryOffline')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { maxWidth: 360, gap: 16, alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 24, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  primary: { backgroundColor: colors.accentPrimary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, minWidth: 200, alignItems: 'center' },
  primaryLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  secondary: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  secondaryLabel: { color: colors.textMuted, fontSize: 15 },
  offline: { color: colors.stateBad, fontSize: 14, textAlign: 'center' },
});
```

> **Implementer note:** match the exact token names in `apps/mobile/src/theme` (the spec palette uses `bg-deep`, `text-primary`, `text-muted`, `accent-primary`, `state-bad`; the JS theme likely exports `bgBase`/`textPrimary`/etc. — confirm and adjust). Reuse the project's existing button primitive if one exists in `components/` (reuse-first). The "still mounted after recheck → offline" heuristic is acceptable because a successful non-force recheck unmounts this screen (App.js stops rendering it); if a shared toast/snackbar primitive exists, prefer it over `ToastAndroid`/`Alert`.

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/UpdateGateScreen.tsx
git commit -m "feat(update-gate): UpdateGateScreen (a11y, https Linking, retry, openFailed)"
```

---

## Task 10: `UpdateBanner.tsx` — dismissible soft banner

**Files:**
- Create: `apps/mobile/src/components/UpdateBanner.tsx`

- [ ] **Step 1: Write the component**

`apps/mobile/src/components/UpdateBanner.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, AccessibilityInfo, ToastAndroid, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { shouldShowSoftBanner, SOFT_BANNER_CONFIG } from '../lib/update-gate/banner-policy';
import { loadSuppression, recordSoftDismiss } from '../lib/update-gate/update-store';
import type { UpdateState } from '../lib/update-gate/decision';

type Props = { state: UpdateState; latestVersion: string | null; storeUrl: string | null };

export default function UpdateBanner({ state, latestVersion, storeUrl }: Props) {
  const { t } = useTranslation('update');
  const [dismissed, setDismissed] = useState(false);

  const visible = !dismissed && latestVersion != null && storeUrl != null &&
    shouldShowSoftBanner({ state, latestVersion, suppression: loadSuppression(), config: SOFT_BANNER_CONFIG, now: new Date() });

  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(t('soft.message')); // iOS polite-ish
  }, [visible, t]);

  const onUpdate = useCallback(async () => {
    if (!storeUrl) return;
    try { await Linking.openURL(storeUrl); }
    catch {
      const msg = t('force.openFailed');
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG); else Alert.alert('', msg);
    }
  }, [storeUrl, t]);

  const onDismiss = useCallback(() => {
    if (latestVersion) recordSoftDismiss(latestVersion);
    setDismissed(true);
  }, [latestVersion]);

  if (!visible) return null;

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <Text style={styles.message}>{t('soft.message')}</Text>
      <Pressable onPress={onUpdate} accessibilityRole="button" accessibilityLabel={t('soft.action')} accessibilityHint={t('force.actionHint')} style={styles.action}>
        <Text style={styles.actionLabel}>{t('soft.action')}</Text>
      </Pressable>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('soft.dismiss')} hitSlop={12} style={styles.dismiss}>
        <Text style={styles.dismissGlyph}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Contrast: text-primary on bg-surface/elevated — verify AA on the Today
  // surface specifically (spec §11.2), distinct from the gate's bg-deep check.
  root: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgElevated, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, margin: 16 },
  message: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  action: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.accentPrimary, borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  actionLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dismissGlyph: { color: colors.textMuted, fontSize: 20 },
});
```

> **Implementer note:** confirm theme token names (`bgElevated`, `accentPrimary`, etc.). Verify message + action-label contrast against the banner's actual background (`bgElevated`) meets WCAG AA — do not assume the gate's check covers it.

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/UpdateBanner.tsx
git commit -m "feat(update-gate): UpdateBanner (suppression-gated, a11y, dismiss)"
```

---

## Task 11: `App.js` integration — force early-return + precedence + dev simulator

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Import the hook, screen, and surface the policy fields**

At the top of `App.js`, add:
```js
import { useUpdateGate } from './src/lib/update-gate/use-update-gate';
import UpdateGateScreen from './src/screens/UpdateGateScreen'; // see note below
```

> **Note:** `UpdateGateScreen.tsx` was created in `src/components/` (Task 9). Either import from `./src/components/UpdateGateScreen` or move it to `src/screens/` to match the screen-import convention in `App.js`. Pick one and be consistent. The component needs `storeUrl` + `onRecheck`; expose the resolved current-platform `storeUrl` from the hook (add `storeUrl` to `UseUpdateGate` by surfacing the last successful policy's `policy[Platform.OS].storeUrl`, or read it from a small getter on the controller). Wire `onRecheck={recheck}`.

- [ ] **Step 2: Call the hook above all conditional returns**

Add alongside `useActivityPreference` / `useLocationPreference` (above the boot guards), per Rules of Hooks:
```js
  const update = useUpdateGate();
```

- [ ] **Step 3: Insert the force early-return immediately after the fonts/storage boot guard**

After the existing `if (!fontsLoaded || !storageReady) { return (<boot/>); }` block, and BEFORE the `hydrationStatus === 'loading'` / `locationHydrationStatus === 'loading'` guards, add:
```js
  // Force-update outranks EVERYTHING (onboarding, location, rating). storageReady
  // ⟹ i18n locale is resolved (synchronous initI18n in the hydrate effect), so no
  // English flash. Self-wrap in withProviders — the bare-spinner guards below don't.
  if (update.state === 'force') {
    return withProviders(
      <UpdateGateScreen storeUrl={update.storeUrl} onRecheck={update.recheck} />,
    );
  }
```

- [ ] **Step 4: Add the `__DEV__` gate simulator to the DevLocaleBar area**

Inside the `{__DEV__ && (...)}` block that renders `<DevLocaleBar/>`, add a second `StatePicker` row:
```js
            {__DEV__ && (
              <StatePicker
                label="update-gate"
                options={[['none', 'none'], ['soft', 'soft'], ['force', 'force']]}
                value={update.devOverride ?? 'none'}
                onChange={(v) => update.setDevOverride(v === 'none' ? null : v)}
              />
            )}
```

> **Note:** because the force early-return reads `update.state`, setting the simulator to `force` makes the gate take over even in Expo Go (the only way to exercise it locally — Task 7/§7.6). `soft` drives the banner via Today (Task 12). The picker mirrors the existing `DevLocaleBar` pattern.

- [ ] **Step 5: Typecheck + run the full mobile suite**

Run: `cd apps/mobile && npx tsc --noEmit && npx vitest run`
Expected: PASS (all existing + new tests green).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/App.js
git commit -m "feat(update-gate): root force-gate early-return (outranks onboarding/rating) + dev simulator"
```

---

## Task 12: `TodayScreen.js` — mount the soft banner

**Files:**
- Modify: `apps/mobile/src/screens/TodayScreen.js`

- [ ] **Step 1: Import and render the banner at the top of Today**

Add the import:
```js
import UpdateBanner from '../components/UpdateBanner';
```
Render `<UpdateBanner state={update.state} latestVersion={update.latestVersion} storeUrl={update.storeUrl} />` at the very top of the Today content.

> **Note:** Today needs `update.state` + `latestVersion` + `storeUrl`. Two options: (a) lift `useUpdateGate()`'s result into a small context provider created in `App.js` and consumed by both `App.js` and `TodayScreen` (avoids two controller instances); or (b) call `useUpdateGate()` again in Today (a second controller — acceptable but double-fetches). **Prefer (a):** wrap the app tree in an `UpdateGateContext.Provider value={update}` inside `withProviders` so there is ONE controller, and `TodayScreen` reads it via `useContext`. Add `latestVersion` + `storeUrl` to the hook's return (resolved from the last successful policy for `Platform.OS`).

- [ ] **Step 2: Typecheck + targeted run**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke (dev simulator)**

Run the app, set the `update-gate` dev picker to `soft` → banner appears on Today; tap × → disappears; set to `force` → full-screen gate takes over and the tab bar is gone.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/TodayScreen.js
git commit -m "feat(update-gate): soft UpdateBanner on Today (single shared controller via context)"
```

---

## Deployment & seeding (post-implementation, before/at Worker prod deploy)

These are runbook steps, not code tasks — execute when shipping (spec §6, §13):

- [ ] **Seed the KV doc BEFORE deploy** so `/version-policy` returns 200, not 503. Use a dormant doc (force off):
```bash
wrangler kv key put --binding=CACHE version-policy '{"forceEnabled":false,"ios":{"minVersion":"1.0.0","latestVersion":"1.0.0","storeUrl":"https://apps.apple.com/app/id<APPLE_APP_ID>"},"android":{"minVersion":"1.0.0","latestVersion":"1.0.0","storeUrl":"https://play.google.com/store/apps/details?id=<ANDROID_PACKAGE_NAME>"}}'
```
  (No `--expiration-ttl` — the key must be persistent. Fill the real Apple App ID + Android package name, spec §13.)
- [ ] **Confirm no cache-flush logic evicts `version-policy`** (search/health use per-key TTLs; there is no flush-all today — keep it that way, or exclude the reserved key if one is ever added).
- [ ] **Kill-switch drill:** flip `forceEnabled:false` and confirm a gated build clears within ~2 min.
- [ ] **Pre-`min`-bump checklist (no OTA escape — two-person sign-off recommended):** build is live + 100% rolled out in all regions + ≥24h; the submitted build does not gate itself; `min ≤ latest`.

---

## Self-Review (completed by plan author)

**Spec coverage:** §4 module layout → Tasks 1–10 + refinements; §5 decision/semver → T2/T3; §6 Worker → T5 + deploy section; §7 fetch lifecycle/persistence/throttle/poll/dev → T6/T7/T8; §8 precedence → T11; §9 banner → T4/T10/T12; §10 i18n → T0; §11 a11y → T9/T10; §12 testing → golden tables in T2/T3/T4 + controller contract T7 + shell T6 + worker T5 + manual matrix in deploy section; §13 open items → deploy section + hook notes. The three plan-level constraints (KV persistence, barrel scope-guard, no analytics) are in T5, T0 Step 5, and T4 respectively.

**Placeholder scan:** the two `> Note` blocks in T8/T11 flag genuinely codebase-dependent names (`API_CONFIG.baseUrl`, theme tokens, component vs screen dir) that the implementer must confirm against real files — these are resolved-at-implementation lookups, not unfilled logic. All code steps contain complete code.

**Type consistency:** `UpdateState`/`UpdateReason` (decision.ts) used consistently in banner-policy, controller, hook, components; `VersionPolicy`/`PlatformPolicy` from shared-types used in schema/decision/worker/store; `SoftSuppression` defined in banner-policy, consumed by store; `evaluateUpdateState(installed, policy, platform)` signature identical across T3 definition and T7 usage; `fetchPolicy(baseUrl)` / `loadSuppression()` / `recordSoftDismiss(v, now)` names consistent T6↔T8/T10; controller `check`/`recheck`/`getSnapshot`/`subscribe`/`dispose` consistent T7↔T8.
