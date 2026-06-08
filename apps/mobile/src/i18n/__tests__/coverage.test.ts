import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Consolidated coverage guard (Task C1 + Task T voice-guard flip).
//
// The per-ns coverage tests (nav-coverage.test.ts, calendar-coverage.test.ts,
// …) each assert their own namespace; this file is the GENERIC walker that
// catches what those miss: a new namespace added to en without a matching
// de/fr/es-419/pt-BR file, or a voice key missing from a non-en locale.
//
// VOICE GUARD FLIP (Task T, 2026-06-08):
//   C-voice (D-task) has filled de/fr/es-419/pt-BR voice/*.json for all 5
//   voice sub-files (card, reason, calendar, moment, moments). The prior
//   invariant ("voice is en-only") is now WRONG and must be REVERSED:
//   voice.* keys must exist in ALL 5 locales, same as CHROME namespaces.
//
//   Removed:
//     - "no non-en locale has a voice/ directory or any voice file"
//     - "every en voice key is absent from all non-en locales"
//   Added:
//     - "every voice ns file exists in all 5 locales"
//     - "every voice key in en is present in de/fr/es-419/pt-BR"
//
//   Unchanged: the onboarding:subhead CHROME exception (length-1 allowlist).
//
// fs is fine here — vitest runs in the node env (see vitest.config.ts) with cwd
// = apps/mobile. No i18n/polyfills import, so no @formatjs export-map trouble.

const LOCALES_DIR = resolve('src/locales');
const EN_DIR = resolve(LOCALES_DIR, 'en');
const EN_VOICE_DIR = resolve(EN_DIR, 'voice');
const NON_EN = ['de', 'fr', 'es-419', 'pt-BR'] as const;
const ALL = ['en', ...NON_EN] as const;

type Json = Record<string, unknown>;

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, 'utf8')) as Json;
}

// Keys are FLAT literals that may themselves contain dots (keySeparator:false,
// e.g. "toast.comingSoon" is a single own-property, NOT a nested path). The
// voice sub-files, by contrast, use genuinely nested objects ({legend:{…}}).
// So we walk by ACTUAL object structure, carrying each leaf as an array of
// own-property segments — never by string-splitting on '.'. A flat key becomes
// a one-segment path; a nested voice key becomes a multi-segment path.
type LeafPath = string[];

/** Walk a (possibly nested) ns object into structural leaf paths. */
function flatten(obj: Json, prefix: string[] = []): LeafPath[] {
  const out: LeafPath[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = [...prefix, k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatten(v as Json, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

const showPath = (p: LeafPath) => p.join('.');

/** Does an object contain the given structural leaf path (segment by segment)? */
function hasPath(obj: Json, path: LeafPath): boolean {
  let cur: unknown = obj;
  for (const part of path) {
    if (cur == null || typeof cur !== 'object') return false;
    cur = (cur as Json)[part];
    if (cur === undefined) return false;
  }
  return true;
}

// The set of CHROME namespace files present in en (filename without .json).
const CHROME_NS = readdirSync(EN_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

// The voice sub-files present in en/voice.
const VOICE_NS = existsSync(EN_VOICE_DIR)
  ? readdirSync(EN_VOICE_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
  : [];

// Single named, length-asserted exception (4.3-framing pending — see A4 launch
// checklist). The ONLY CHROME key allowed to hold its en value in non-en bundles.
// Hardcoded so it cannot silently grow.
const TRANSLATION_DEFERRED = [{ ns: 'onboarding', key: 'subhead' }] as const;

describe('consolidated CHROME coverage', () => {
  it('finds the expected 17 CHROME namespaces in en', () => {
    // Sanity floor: if someone deletes the locales dir or the glob breaks, this
    // guard would vacuously pass otherwise. (17th ns `share` added when the
    // MomentCardSheet share sheet was extracted — closing the Batch-B gap.)
    expect(CHROME_NS.length).toBe(17);
    expect(CHROME_NS).toContain('common');
    expect(CHROME_NS).toContain('onboarding');
    expect(CHROME_NS).toContain('share');
  });

  it('every CHROME ns file exists in all 5 locales', () => {
    const missing: string[] = [];
    for (const ns of CHROME_NS) {
      for (const loc of ALL) {
        if (!existsSync(resolve(LOCALES_DIR, loc, `${ns}.json`))) {
          missing.push(`${loc}/${ns}.json`);
        }
      }
    }
    expect(missing, `missing CHROME ns files:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every CHROME key in en is present in de/fr/es-419/pt-BR', () => {
    const missing: string[] = [];
    for (const ns of CHROME_NS) {
      const en = readJson(resolve(EN_DIR, `${ns}.json`));
      const keys = flatten(en);
      for (const loc of NON_EN) {
        const path = resolve(LOCALES_DIR, loc, `${ns}.json`);
        if (!existsSync(path)) continue; // reported by the previous test
        const locObj = readJson(path);
        for (const key of keys) {
          if (!hasPath(locObj, key)) missing.push(`${loc}:${ns}:${showPath(key)}`);
        }
      }
    }
    expect(
      missing,
      `CHROME keys present in en but missing in a non-en locale:\n${missing.join('\n')}`,
    ).toEqual([]);
  });
});

// ─── VOICE all-5-locale invariant (Task T flip) ──────────────────────────────
//
// C-voice has filled voice/*.json for de/fr/es-419/pt-BR.
// The prior en-only guard is reversed: voice keys MUST be in all 5 locales.
describe('voice all-5-locale invariant (Task T flip)', () => {
  it('en carries voice sub-files', () => {
    expect(VOICE_NS.length).toBeGreaterThan(0);
    // Sanity: check the known partition map sub-files exist.
    expect(VOICE_NS).toContain('card');
    expect(VOICE_NS).toContain('reason');
    expect(VOICE_NS).toContain('calendar');
    expect(VOICE_NS).toContain('moment');
    expect(VOICE_NS).toContain('moments');
  });

  it('every voice ns file exists in all 5 locales', () => {
    const missing: string[] = [];
    for (const ns of VOICE_NS) {
      for (const loc of ALL) {
        if (!existsSync(resolve(LOCALES_DIR, loc, 'voice', `${ns}.json`))) {
          missing.push(`${loc}/voice/${ns}.json`);
        }
      }
    }
    expect(missing, `missing voice ns files:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every voice key in en is present in de/fr/es-419/pt-BR', () => {
    const missing: string[] = [];
    for (const ns of VOICE_NS) {
      const enPath = resolve(EN_VOICE_DIR, `${ns}.json`);
      if (!existsSync(enPath)) continue;
      const en = readJson(enPath);
      const keys = flatten(en);
      for (const loc of NON_EN) {
        const path = resolve(LOCALES_DIR, loc, 'voice', `${ns}.json`);
        if (!existsSync(path)) continue; // reported by the previous test
        const locObj = readJson(path);
        for (const key of keys) {
          if (!hasPath(locObj, key)) missing.push(`${loc}:voice/${ns}:${showPath(key)}`);
        }
      }
    }
    expect(
      missing,
      `voice keys present in en but missing in a non-en locale:\n${missing.join('\n')}`,
    ).toEqual([]);
  });
});

describe('translation-deferred allowlist', () => {
  it('contains exactly one entry (cannot silently grow)', () => {
    expect(TRANSLATION_DEFERRED).toHaveLength(1);
    expect(TRANSLATION_DEFERRED[0]).toEqual({ ns: 'onboarding', key: 'subhead' });
  });

  it('the single deferred key is the place non-en==en is allowed', () => {
    // Confirm the allowlisted key genuinely holds the en value in every non-en
    // locale (the 4.3-pending state). This pins WHY the exception exists; we do
    // NOT broadly assert non-en!=en elsewhere (OK / "Inceptio" are legitimately
    // identical across locales — too many false positives).
    const { ns, key } = TRANSLATION_DEFERRED[0];
    const en = readJson(resolve(EN_DIR, `${ns}.json`));
    const enVal = en[key];
    expect(typeof enVal).toBe('string');
    for (const loc of NON_EN) {
      const locObj = readJson(resolve(LOCALES_DIR, loc, `${ns}.json`));
      expect(locObj[key], `${loc}:${ns}:${key} should still hold the en value`).toBe(enVal);
    }
  });
});
