// format-window interprets the window's instant in the device-local zone (it
// does NOT use the card formatters' timeZone:'UTC' trick). Pin TZ=UTC so the
// rendered hour is deterministic across runner machines — the assertion below
// is about the locale's 24h CLOCK SHAPE, not the offset.
process.env.TZ = 'UTC';

import { afterEach, expect, it, vi } from 'vitest';

// i18n/locale.ts pulls expo-localization transitively; force an empty device
// list so resolveLocale() falls back to 'en' when no override is set. The
// override path under test bypasses getLocales() entirely.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

import { __setLocaleOverride } from '../../i18n/locale';
import { formatWindowTime } from '../format-window';

afterEach(() => __setLocaleOverride(null));

it('renders 24h window time for de', () => {
  __setLocaleOverride('de');
  const out = formatWindowTime({
    start: '2026-06-08T15:00:00+00:00',
    end: '2026-06-08T16:25:00+00:00',
    duration_minutes: 85,
  });
  expect(out.primary).toMatch(/15[:.]00/); // 24h, locale separator tolerant
});

it('does not pass es-419 to Intl (no M49 data)', () => {
  __setLocaleOverride('es-419');
  expect(() =>
    formatWindowTime({
      start: '2026-06-08T09:00:00+00:00',
      end: '2026-06-08T09:10:00+00:00',
      duration_minutes: 10,
    }),
  ).not.toThrow();
});
