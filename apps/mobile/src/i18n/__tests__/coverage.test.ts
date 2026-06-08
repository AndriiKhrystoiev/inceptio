import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Consolidated coverage guard (Task C1). The per-ns coverage tests
// (nav-coverage.test.ts, calendar-coverage.test.ts, …) each assert their own
// namespace; this file is the GENERIC walker that catches what those miss: a
// new namespace added to en without a matching de/fr/es-419/pt-BR file, or a
// voice key that leaks out of en-only.
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

// The voice sub-files present in en/voice (these are en-ONLY by design).
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
  it('finds the expected 16 CHROME namespaces in en', () => {
    // Sanity floor: if someone deletes the locales dir or the glob breaks, this
    // guard would vacuously pass otherwise.
    expect(CHROME_NS.length).toBe(16);
    expect(CHROME_NS).toContain('common');
    expect(CHROME_NS).toContain('onboarding');
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

describe('voice-en-only invariant', () => {
  it('en actually carries voice sub-files', () => {
    expect(VOICE_NS.length).toBeGreaterThan(0);
    // matches the partition map: card, reason, calendar, moment, moments
    expect(VOICE_NS).toContain('reason');
  });

  it('no non-en locale has a voice/ directory or any voice file', () => {
    const leaks: string[] = [];
    for (const loc of NON_EN) {
      const voiceDir = resolve(LOCALES_DIR, loc, 'voice');
      if (existsSync(voiceDir)) {
        // Enumerate whatever leaked so the failure names it.
        for (const f of readdirSync(voiceDir)) leaks.push(`${loc}/voice/${f}`);
        if (readdirSync(voiceDir).length === 0) leaks.push(`${loc}/voice/ (empty dir)`);
      }
      // Also guard against a flat voice file (loc/voice.json) sneaking in.
      if (existsSync(resolve(LOCALES_DIR, loc, 'voice.json'))) {
        leaks.push(`${loc}/voice.json`);
      }
    }
    expect(leaks, `voice content leaked outside en:\n${leaks.join('\n')}`).toEqual([]);
  });

  it('every en voice key is absent from all non-en locales', () => {
    // Belt-and-braces: even if a voice file did exist, none of its keys may
    // appear under a non-en locale (e.g. accidentally pasted into a CHROME ns).
    const leaks: string[] = [];
    for (const ns of VOICE_NS) {
      const en = readJson(resolve(EN_VOICE_DIR, `${ns}.json`));
      const keys = flatten(en);
      for (const loc of NON_EN) {
        const path = resolve(LOCALES_DIR, loc, 'voice', `${ns}.json`);
        if (!existsSync(path)) continue;
        const locObj = readJson(path);
        for (const key of keys) {
          if (hasPath(locObj, key)) leaks.push(`${loc}:voice/${ns}:${showPath(key)}`);
        }
      }
    }
    expect(leaks, `voice keys found under a non-en locale:\n${leaks.join('\n')}`).toEqual([]);
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
