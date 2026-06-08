import { describe, it, expect, vi } from 'vitest';
import { toIntlLocale } from '../locale';

// Plural / Intl assertions (Task C1). Two things are proven here:
//   1. i18next's French plural resolution: count:0 → the `_one` form ("0 jour"),
//      which is correct CLDR French (0 and 1 are both `one`). This is the bug
//      class the FormatJS PluralRules polyfill exists to prevent on Hermes.
//   2. Intl plumbing: PluralRules categories for de/es/pt resolve without
//      throwing, and Intl.DateTimeFormat(toIntlLocale('es-419')) uses real `es`
//      data (NOT a silent en-US fallback, and NOT a throw on the M49 `419`).
//
// We assert Intl.* BEHAVIOR directly (node ships Intl.PluralRules + ICU data),
// which is exactly what the @formatjs polyfill back-fills on Hermes. We do NOT
// import ../polyfills (its '@formatjs/intl-locale/polyfill-force' export map is
// unparseable under vitest's node resolver — see card-strings.test.ts), and we
// mock expo-localization which locale.ts pulls in transitively.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

describe('French _one covers 0', () => {
  it('i18next resolves count:0 to the _one form in fr', async () => {
    const i18next = (await import('i18next')).default;
    // A throwaway instance + ns so we do not depend on real bundle content.
    const inst = i18next.createInstance();
    await inst.init({
      lng: 'fr',
      resources: {
        fr: { test: { days_one: '{{count}} jour', days_other: '{{count}} jours' } },
      },
      nsSeparator: ':',
      interpolation: { escapeValue: false },
    });
    expect(inst.t('test:days', { count: 0 })).toBe('0 jour');
    expect(inst.t('test:days', { count: 1 })).toBe('1 jour');
    expect(inst.t('test:days', { count: 2 })).toBe('2 jours');
  });

  it('the underlying CLDR rule agrees (fr 0 → one, en 0 → other)', () => {
    expect(new Intl.PluralRules('fr').select(0)).toBe('one');
    expect(new Intl.PluralRules('en').select(0)).toBe('other'); // contrast: en 0 is plural
  });
});

describe('Intl.PluralRules works for de/es/pt (polyfill-backed on device)', () => {
  it('resolves a category without throwing for each supported locale', () => {
    for (const loc of ['de', 'es', 'pt', 'fr', 'en']) {
      const rules = new Intl.PluralRules(loc);
      const cat = rules.select(2);
      expect(typeof cat).toBe('string');
      // Must be a real CLDR category, not undefined/empty.
      expect(['zero', 'one', 'two', 'few', 'many', 'other']).toContain(cat);
    }
  });
});

describe('Intl.DateTimeFormat uses mapped locale, not es-419 / en-US', () => {
  // A fixed UTC instant; format with timeZone UTC so the test is tz-stable.
  const D = new Date(Date.UTC(2026, 0, 15, 12, 0, 0)); // 15 Jan 2026
  const OPTS: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', timeZone: 'UTC' };

  it('toIntlLocale maps the variant bundle keys', () => {
    expect(toIntlLocale('es-419')).toBe('es');
    expect(toIntlLocale('pt-BR')).toBe('pt');
    expect(toIntlLocale('de')).toBe('de');
  });

  it('es-419 → es renders Spanish and does NOT silently fall back to en-US', () => {
    const es = new Intl.DateTimeFormat(toIntlLocale('es-419'), OPTS).format(D);
    const enUS = new Intl.DateTimeFormat('en-US', OPTS).format(D);
    expect(es).not.toBe(enUS); // would be equal if it had fallen back
    expect(es.toLowerCase()).toContain('enero'); // genuine es month name
  });

  it('does not throw on the M49 region (es-419 must never reach Intl raw)', () => {
    // Passing the BUNDLE key straight to Intl is the bug we map away from.
    // toIntlLocale must yield an ICU-valid arg.
    expect(() => new Intl.DateTimeFormat(toIntlLocale('es-419'), OPTS).format(D)).not.toThrow();
    expect(() => new Intl.DateTimeFormat(toIntlLocale('pt-BR'), OPTS).format(D)).not.toThrow();
  });

  it('de renders a German date distinct from en-US', () => {
    const de = new Intl.DateTimeFormat(toIntlLocale('de'), OPTS).format(D);
    expect(de).not.toBe(new Intl.DateTimeFormat('en-US', OPTS).format(D));
    expect(de).toContain('Januar');
  });
});
