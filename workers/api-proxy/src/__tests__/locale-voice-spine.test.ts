// VOICE Task 0 — the locale-threading spine. The cross-locale-poisoning
// correctness boundary: locale MUST enter BOTH cache keys, and the composition
// path MUST thread a non-optional `locale` through every signature.
//
// This is the STRONG-FORM cache test that inverts the CHROME-phase
// "X-Locale-cache-key-UNaffected" guard (locale-cache-key-unaffected.test.ts,
// daily-note-cache.test.ts:"key is identical regardless of locale"): two
// requests differing only in locale now produce DIFFERENT keys.
//
// Composition output is still all-English at this commit (dictionaries hold
// plain strings; `localize()` returns en) — so `translate(.., 'de')` runs and
// returns the en strings without throwing.
import { describe, expect, it } from 'vitest';
import type { ElectionalSearchRequest, ApiEnvelope } from '@inceptio/shared-types';
import { computeCacheKey } from '../cache';
import { keyOf } from '../daily-note-cache';
import { translate } from '../translations/translate';
import { localize } from '../translations/types';
import type { Localized } from '../translations/types';

const baseRequest: ElectionalSearchRequest = {
  activity: 'wedding',
  start: '2026-06-01',
  end: '2026-06-30',
  lat: -23.5,
  lng: -46.6,
  timezone: 'America/Sao_Paulo',
  city: 'São Paulo',
};

// Minimal viable envelope — one window, one factor — exercising the factor
// leaf-read path through translate → translateFactor → localize.
function viableEnvelope(): ApiEnvelope {
  return {
    success: true,
    data: {
      summary: { no_viable_windows: false } as ApiEnvelope['data']['summary'],
      top_windows: [
        {
          start: '2026-06-10T14:00:00-03:00',
          end: '2026-06-10T14:25:00-03:00',
          score: 68,
          grade: 'fair',
          duration_minutes: 25,
          factors: [
            {
              factor_id: 'venus_dignified_direct_well_aspected',
              status: 'pass',
              weight_class: 'high',
              contribution: 9,
              observation: 'Venus in Leo 9.8° (term, direct)',
            },
          ],
        },
      ],
      excluded_ranges: [],
    },
  } as unknown as ApiEnvelope;
}

describe('localize() — tolerant leaf resolution', () => {
  it('returns the plain string verbatim for a non-migrated (en-everywhere) leaf', () => {
    const leaf: Localized = 'Venus brings warmth';
    expect(localize(leaf, 'en')).toBe('Venus brings warmth');
    expect(localize(leaf, 'de')).toBe('Venus brings warmth');
    expect(localize(leaf, 'pt-BR')).toBe('Venus brings warmth');
  });

  it('resolves the requested locale for a migrated Record leaf', () => {
    const leaf: Localized = {
      en: 'Venus brings warmth',
      de: 'Venus bringt Wärme',
      fr: 'Vénus apporte de la chaleur',
      'es-419': 'Venus trae calidez',
      'pt-BR': 'Vênus traz calor',
    };
    expect(localize(leaf, 'de')).toBe('Venus bringt Wärme');
    expect(localize(leaf, 'en')).toBe('Venus brings warmth');
    expect(localize(leaf, 'pt-BR')).toBe('Vênus traz calor');
  });

  it('falls back to en for a Record missing the requested locale value', () => {
    // Simulates a partially-migrated leaf (TS would normally require all keys,
    // but runtime tolerance is the contract).
    const partial = { en: 'English only' } as unknown as Localized;
    expect(localize(partial, 'fr')).toBe('English only');
  });
});

describe('search cache key carries locale (strong form)', () => {
  it('de and en produce DIFFERENT keys', async () => {
    const en = await computeCacheKey(baseRequest, 'en');
    const de = await computeCacheKey(baseRequest, 'de');
    expect(de).not.toBe(en);
  });

  it('the locale lives in the key prefix segment', async () => {
    const de = await computeCacheKey(baseRequest, 'de');
    expect(de).toContain(':de:');
  });

  it('same locale is byte-identical (determinism preserved)', async () => {
    expect(await computeCacheKey(baseRequest, 'pt-BR')).toBe(
      await computeCacheKey(baseRequest, 'pt-BR'),
    );
  });
});

describe('daily-note cache key carries locale (strong form)', () => {
  const base = { lat: 50.45, lng: 30.52, dateIso: '2026-06-08', activity: 'wedding' } as const;

  it('de and en produce DIFFERENT keys', () => {
    const en = keyOf({ ...base, locale: 'en' });
    const de = keyOf({ ...base, locale: 'de' });
    expect(de).not.toBe(en);
  });

  it('the locale is the final appended segment', () => {
    expect(keyOf({ ...base, locale: 'de' }).endsWith(':de')).toBe(true);
  });
});

describe('translate threads locale and stays all-English via localize', () => {
  it('runs with a non-en locale without throwing and returns en leaf strings', () => {
    const de = translate(viableEnvelope(), 'wedding', 'de');
    const en = translate(viableEnvelope(), 'wedding', 'en');
    // Dictionaries are still plain English → de output is byte-identical to en.
    expect(de).toEqual(en);
    const factor = de.data.top_windows[0]!.displayable.factors[0]!;
    // Wedding activity-override on Venus.pass → "Venus brings tenderness"
    // (the base FACTORS phrase is "Venus brings warmth"). Either way it's the
    // EN string resolved through localize() — proving the de path runs and the
    // leaf resolves without throwing.
    expect(factor.phrase_short).toBe('Venus brings tenderness');
  });
});
