// Task A2 — X-Locale seam on /daily-note: validated INDEPENDENTLY of the
// device-id gate; absent = valid; malformed = 400; well-formed = ignored and
// the existing ?tz= query param is untouched.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the upstream search handler BEFORE importing the route (mirrors
// daily-note-route.test.ts).
vi.mock('../routes/search', () => ({
  handleSearch: vi.fn(),
}));

import { handleDailyNote } from '../routes/daily-note';
import { handleSearch } from '../routes/search';
import { envelope } from '../translations/__tests__/fixtures';
import type { Env } from '../env';

function makeKV() {
  const store = new Map<string, string>();
  return {
    store,
    namespace: {
      async get(key: string, type?: 'json' | 'text' | 'arrayBuffer' | 'stream') {
        const raw = store.get(key);
        if (raw === undefined) return null;
        if (type === 'json') return JSON.parse(raw);
        return raw;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async delete(key: string) {
        store.delete(key);
      },
    } as unknown as KVNamespace,
  };
}

function makeEnv(): { env: Env; store: Map<string, string> } {
  const { store, namespace } = makeKV();
  return {
    store,
    env: {
      CACHE: namespace,
      UPSTREAM_BASE_URL: 'https://upstream.test',
      WORKER_VERSION: 'test',
      ASTROLOGY_API_KEY: 'k',
      ENV: 'development',
      ADMIN_TOKEN: 'test-admin-token',
    },
  };
}

function makeRequest(
  qs: string,
  headers: Record<string, string> = { 'X-Device-Id': 'test-device' },
): Request {
  return new Request(`https://w.test/daily-note?${qs}`, { headers });
}

describe('handleDailyNote — X-Locale accept + validate + ignore', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
    // Fresh Response per call — a Response body is single-read, and several
    // tests invoke the route twice.
    vi.mocked(handleSearch).mockImplementation(async () =>
      new Response(JSON.stringify(envelope()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  it('malformed X-Locale → 400 invalid_locale, independent of the device-id gate', async () => {
    const { env } = makeEnv();
    // Device-id IS present, so a 400 here can only be the locale check —
    // proving it is validated independently of (and after) the device gate.
    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', {
        'X-Device-Id': 'd1',
        'X-Locale': 'bad!!',
      }),
      env,
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('invalid_locale');
  });

  it('missing device-id still wins over a malformed locale (device gate is first)', async () => {
    const { env } = makeEnv();
    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', { 'X-Locale': 'bad!!' }),
      env,
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('missing_device_id');
  });

  it('absent X-Locale → 200 (no regression for existing clients)', async () => {
    const { env } = makeEnv();
    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC'),
      env,
    );
    expect(res.status).toBe(200);
  });

  it('well-formed X-Locale (pt-BR) is ignored: same body + same cache key as no header', async () => {
    const a = makeEnv();
    const resWith = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', {
        'X-Device-Id': 'd1',
        'X-Locale': 'pt-BR',
      }),
      a.env,
    );
    const b = makeEnv();
    const resWithout = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', { 'X-Device-Id': 'd1' }),
      b.env,
    );
    expect(resWith.status).toBe(200);
    expect(resWithout.status).toBe(200);
    expect(await resWith.json()).toEqual(await resWithout.json());
    // Cache key unaffected by locale: both runs wrote the SAME single KV key.
    expect([...a.store.keys()]).toEqual([...b.store.keys()]);
  });

  it('strong-form O2: locale-A (pt-BR) vs locale-B (de) write IDENTICAL cache key sets', async () => {
    // The strong inverse the VOICE phase will deliberately flip: two requests
    // identical except X-Locale (pt-BR vs de), same lat/lng/tz/device/activity,
    // must produce the SAME written KV key set today (locale is header-only and
    // never enters the key). The existing test covers with-locale vs no-header;
    // this asserts locale-A vs locale-B so a future per-locale key split fails
    // here loudly rather than silently passing the absent-vs-present case.
    const a = makeEnv();
    const resA = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', {
        'X-Device-Id': 'd1',
        'X-Locale': 'pt-BR',
      }),
      a.env,
    );
    const b = makeEnv();
    const resB = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', {
        'X-Device-Id': 'd1',
        'X-Locale': 'de',
      }),
      b.env,
    );
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect([...a.store.keys()]).toEqual([...b.store.keys()]);
  });

  it('the ?tz= query param remains the tz transport (locale is header-only, O2)', async () => {
    // The O2 invariant: locale rides as a header and must NEVER enter the cache
    // key; tz stays the only transport that shapes the key. Assert that directly
    // — not the flaky "two zones write different keys" claim (UTC and Tokyo can
    // share a local date when run before Tokyo midnight, silently passing).
    const { env, store } = makeEnv();
    await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', {
        'X-Device-Id': 'd1',
        'X-Locale': 'pt-BR',
      }),
      env,
    );
    const keys = [...store.keys()];
    expect(keys.length).toBeGreaterThan(0);
    // The locale value never appears in any written cache key (header-only, O2).
    // The daily-note key embeds the tz-derived local dateIso, not the literal tz
    // string, so we assert the locale's ABSENCE rather than the tz's presence.
    expect(keys.every((k) => !k.includes('pt-BR') && !k.includes('locale'))).toBe(true);
  });
});
