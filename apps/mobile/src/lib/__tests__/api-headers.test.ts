import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// react-native isn't parseable in the node test env (transitive import via
// src/config/api.ts → Platform.OS). Escape hatch documented in plan §13.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

// __DEV__ is an RN-injected global. config/api.ts reads it at module-eval
// time, so it must exist before any import resolves. vi.hoisted runs before
// the imports below.
vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

// device-id reads from storage which requires hydration; mock it.
vi.mock('../device-id', () => ({
  getDeviceId: vi.fn(async () => 'test-device-id-abc'),
}));

// expo-localization has no native backing in the node test env; the locale
// module calls getLocales() at resolution time. Stub it so activeBundle()
// resolves deterministically (no device prefs → 'en').
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

import { searchElectional, getDailyNote } from '../api';
import { __setLocaleOverride } from '../../i18n/locale';
import { ApiEnvelopeSchema, DailyNoteResponseSchema } from '@inceptio/shared-types';

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  __setLocaleOverride(null);
  vi.restoreAllMocks();
});

describe('searchElectional request shape (direct api-public)', () => {
  // remove-cloudflare migration: searchElectional now calls the public API
  // directly — no Worker, no X-Device-Id / X-Locale / X-Timezone headers.
  // Only Content-Type is sent; the body is the nested upstream shape.
  const validRequest = {
    activity: 'wedding' as const,
    start: '2026-06-08',
    end: '2026-06-15',
    lat: 50.45,
    lng: 30.52,
    timezone: 'Europe/Kyiv',
    city: 'Kyiv',
  };

  it('sends only Content-Type (no Worker meta-headers) with nested upstream body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    // Body parse will fail on {}, throwing SchemaMismatchError — that's fine,
    // the fetch (and thus the request shape) already happened.
    await searchElectional(validRequest).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect(headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(headers).not.toHaveProperty('X-Device-Id');
    expect(headers).not.toHaveProperty('X-Locale');
    expect(headers).not.toHaveProperty('X-Timezone');

    // body is nested upstream shape (not the flat mobile schema)
    const body = JSON.parse(init.body as string);
    expect(body).toHaveProperty('date_range.start_date');
    expect(body).toHaveProperty('top_n_windows', 10);
  });

  void ApiEnvelopeSchema; // keep the import live
});

describe('requestMetaHeaders on getDailyNote', () => {
  const input = {
    lat: 50.45,
    lng: 30.52,
    tz: 'Europe/Kyiv',
    activity: 'wedding' as const,
  };

  it('sends X-Device-Id + X-Locale, keeps ?tz= query, and does NOT add X-Timezone header', async () => {
    __setLocaleOverride('pt-BR');
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    await getDailyNote(input).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchSpy.mock.calls[0]!;

    // ?tz= query param preserved (O2 — locale-only, no header tz on daily-note).
    expect(String(calledUrl)).toContain(`tz=${encodeURIComponent('Europe/Kyiv')}`);

    const headers = init.headers as Record<string, string>;
    expect(headers).toMatchObject({
      'X-Device-Id': 'test-device-id-abc',
      'X-Locale': 'pt-BR',
    });
    expect(headers).not.toHaveProperty('X-Timezone');

    void DailyNoteResponseSchema;
  });
});
