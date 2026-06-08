import { describe, expect, it, vi } from 'vitest';

// format-date now reads the active bundle, which pulls expo-localization
// transitively (unparseable in the node test env). Empty device list -> 'en',
// the locale these assertions expect.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

import { formatDailyEyebrow, casedForBundle } from '../format-date';
import { __setLocaleOverride } from '../../i18n/locale';

describe('formatDailyEyebrow', () => {
  it('formats an ISO date as lowercase "weekday, mon day"', () => {
    // 2026-05-23 was a Saturday in en-US calendar
    expect(formatDailyEyebrow('2026-05-23')).toBe('saturday, may 23');
  });

  it('uses short month name', () => {
    // 2026-09-04 was a Friday
    expect(formatDailyEyebrow('2026-09-04')).toBe('friday, sep 4');
  });

  it('does not pad single-digit days', () => {
    // 2026-01-01 was a Thursday
    expect(formatDailyEyebrow('2026-01-01')).toBe('thursday, jan 1');
  });
});

describe('casedForBundle (locale-aware casing — TASK C)', () => {
  it('German keeps weekday/month capitalization', () => {
    __setLocaleOverride('de');
    try {
      // Intl de output for 2026-06-08 is "Montag, 8. Juni"; must NOT be lowercased.
      expect(formatDailyEyebrow('2026-06-08')).toBe('Montag, 8. Juni');
      expect(casedForBundle('Montag, 8. Juni')).toBe('Montag, 8. Juni');
    } finally {
      __setLocaleOverride(null);
    }
  });

  it('non-de bundles lowercase', () => {
    for (const b of ['en', 'fr', 'es-419', 'pt-BR'] as const) {
      __setLocaleOverride(b);
      try {
        expect(casedForBundle('ABC')).toBe('abc');
      } finally {
        __setLocaleOverride(null);
      }
    }
  });
});
