import { describe, expect, it, vi } from 'vitest';

// format-date now reads the active bundle, which pulls expo-localization
// transitively (unparseable in the node test env). Empty device list -> 'en',
// the locale these assertions expect.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

import { formatDailyEyebrow } from '../format-date';

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
