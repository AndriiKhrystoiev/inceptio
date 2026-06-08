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

describe('requestMetaHeaders on searchElectional', () => {
  const validRequest = {
    activity: 'wedding' as const,
    start: '2026-06-08',
    end: '2026-06-15',
    lat: 50.45,
    lng: 30.52,
    timezone: 'Europe/Kyiv',
    city: 'Kyiv',
  };

  function envelopeResponse() {
    // Minimal valid envelope — searchElectional re-validates the body, so the
    // header assertions need a body that parses. Build it from the schema's
    // own default-friendly shape by returning a parse-clean fixture.
    const fixture = ApiEnvelopeSchema.safeParse({});
    // If the empty object doesn't parse (it won't), we don't care — the header
    // assertion runs before the body parse only when status is ok AND parse
    // succeeds. To keep this test focused on headers, intercept before parse by
    // returning a 200 with a body and asserting on the request, not the result.
    void fixture;
    return new Response(JSON.stringify({}), { status: 200 });
  }

  it('sends X-Device-Id, X-Locale (=activeBundle), and keeps X-Timezone', async () => {
    __setLocaleOverride('de');
    const fetchSpy = vi.fn().mockResolvedValue(envelopeResponse());
    global.fetch = fetchSpy as unknown as typeof fetch;

    // Body parse will fail on {}, throwing SchemaMismatchError — that's fine,
    // the fetch (and thus the headers) already happened.
    await searchElectional(validRequest).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    expect(init.headers).toMatchObject({
      'X-Device-Id': 'test-device-id-abc',
      'X-Locale': 'de',
    });
    expect(init.headers).toHaveProperty('X-Timezone');
    expect((init.headers as Record<string, string>)['X-Timezone']).toBeTruthy();
  });

  it('X-Locale defaults to en when no override / device pref', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(envelopeResponse());
    global.fetch = fetchSpy as unknown as typeof fetch;

    await searchElectional(validRequest).catch(() => {});

    const [, init] = fetchSpy.mock.calls[0]!;
    expect((init.headers as Record<string, string>)['X-Locale']).toBe('en');
  });
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
