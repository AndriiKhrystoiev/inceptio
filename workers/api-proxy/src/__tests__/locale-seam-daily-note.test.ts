// Task A2 (CHROME) — X-Locale seam on /daily-note: validated INDEPENDENTLY of
// the device-id gate; absent = valid; malformed = 400; the existing ?tz=
// query param is untouched.
//
// VOICE Task 0 UPDATE: locale now ENTERS the daily-note cache key (it is the
// final `:${locale}` segment, see daily-note-cache.ts keyOf). The three
// CHROME "locale never enters the key" assertions below are FLIPPED to the
// strong form: locale-A vs locale-B now write DIFFERENT key sets, and the key
// DOES contain the locale tag. Validation behavior (400/200) is unchanged.
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

  it('well-formed X-Locale (pt-BR): same response body, DIFFERENT cache key vs no header (FLIPPED)', async () => {
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
    // Body is still equal: dictionaries are all-English at this commit, so the
    // composed copy is byte-identical (only the cache KEY namespace changed).
    expect(await resWith.json()).toEqual(await resWithout.json());
    // FLIPPED (VOICE Task 0): pt-BR keys under :pt-BR, absent → :en. The written
    // key SETS now DIFFER. (CHROME asserted .toEqual here.)
    expect([...a.store.keys()]).not.toEqual([...b.store.keys()]);
  });

  it('strong-form: locale-A (pt-BR) vs locale-B (de) write DIFFERENT cache key sets (FLIPPED)', async () => {
    // The strong inverse the VOICE phase deliberately flipped: two requests
    // identical except X-Locale (pt-BR vs de), same lat/lng/tz/device/activity,
    // now produce DIFFERENT written KV key sets — locale is the final key
    // segment (cross-locale-poisoning boundary). CHROME asserted .toEqual.
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
    expect([...a.store.keys()]).not.toEqual([...b.store.keys()]);
  });

  it('the cache key now carries the locale tag as its final segment (FLIPPED)', async () => {
    // FLIPPED (VOICE Task 0): the daily-note key ends with `:${locale}`. tz is
    // still the local-date transport; locale is now an additional key dimension.
    const { env, store } = makeEnv();
    await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=UTC', {
        'X-Device-Id': 'd1',
        'X-Locale': 'pt-BR',
      }),
      env,
    );
    // Filter to the daily-note CACHE key (the route also writes `metrics:*`
    // counter keys, which are locale-independent observability — not the
    // response cache).
    const dnKeys = [...store.keys()].filter((k) => k.startsWith('daily-note:'));
    expect(dnKeys.length).toBeGreaterThan(0);
    // Every written daily-note cache key ends with the request locale (CHROME
    // asserted the locale was ABSENT from every key).
    expect(dnKeys.every((k) => k.endsWith(':pt-BR'))).toBe(true);
  });
});
