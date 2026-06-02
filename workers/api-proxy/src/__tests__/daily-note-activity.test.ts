import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the upstream search handler BEFORE importing the route so the route's
// in-process /electional/search fan-out is intercepted. Mirrors the pattern
// used by daily-note-route.test.ts.
vi.mock('../routes/search', () => ({
  handleSearch: vi.fn(),
}));

import { handleDailyNote } from '../routes/daily-note';
import { handleSearch } from '../routes/search';
import { envelope } from '../translations/__tests__/fixtures';

import type { Env } from '../env';

// ─── Test helpers ───

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
      async put(key: string, value: string, _opts?: { expirationTtl?: number }) {
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
    },
  };
}

function searchResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeRequest(qs: string, deviceId: string | null = 'test-device'): Request {
  const headers: Record<string, string> = {};
  if (deviceId !== null) headers['X-Device-Id'] = deviceId;
  return new Request(`https://w.test/daily-note?${qs}`, { headers });
}

// ─── Tests ───

describe('Phase A — /daily-note route accepts ?activity= (optional)', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
  });

  it('valid activity → 200 (route accepts the param)', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));
    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'),
      env,
    );
    expect(res.status).toBe(200);
    // Cache-key activity inclusion is verified in Task 2.3; this test only
    // verifies the route accepts a valid activity and does not 400.
  });

  it('missing activity → 200 + warn + fallback to business_launch', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv'),
      env,
    );
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] activity missing, defaulting to business_launch'),
    );
    warn.mockRestore();
  });

  it('invalid activity → 400 with invalid_activity error', async () => {
    const { env } = makeEnv();
    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=not_real'),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; valid: string[] };
    expect(body.error).toBe('invalid_activity');
    expect(body.valid).toEqual(
      expect.arrayContaining(['wedding', 'contracts', 'business_launch', 'travel']),
    );
  });
});
