import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import search200 from './fixtures/api-public/search-200.json';
import {
  searchElectional, getDailyNote, healthCheck,
  TimeoutError, NetworkError, SchemaMismatchError, ServerError,
} from '../api';

const validRequest = {
  activity: 'wedding' as const,
  start: '2026-07-01', end: '2026-07-01',
  lat: 50.45, lng: 30.52, timezone: 'Europe/Kyiv', city: 'Kyiv',
};

function mockFetchOnce(impl: () => Promise<Response>) {
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(impl as never);
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('searchElectional error paths', () => {
  it('throws NetworkError when fetch rejects', async () => {
    mockFetchOnce(async () => { throw new Error('offline'); });
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws TimeoutError when fetch aborts', async () => {
    mockFetchOnce(async () => {
      const e = new Error('aborted'); e.name = 'AbortError'; throw e;
    });
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(TimeoutError);
  });

  it('throws ServerError on a non-429 !ok response', async () => {
    mockFetchOnce(async () => new Response('{"detail":"bad"}', { status: 422 }));
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(ServerError);
  });

  it('throws SchemaMismatchError when the body fails Zod parse', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchOnce(async () => new Response('{"not":"an envelope"}', { status: 200 }));
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(SchemaMismatchError);
  });

  it('returns a translated envelope on a valid 200', async () => {
    mockFetchOnce(async () => new Response(JSON.stringify(search200), { status: 200 }));
    const { envelope, cacheHit } = await searchElectional(validRequest);
    expect(cacheHit).toBe(false);
    expect(envelope.data).toBeDefined();
  });
});

describe('healthCheck', () => {
  it('returns the parsed health body on ok', async () => {
    mockFetchOnce(async () => new Response(JSON.stringify({ status: 'healthy', worker_version: '1', upstream_check: true }), { status: 200 }));
    expect((await healthCheck()).status).toBe('healthy');
  });
  it('throws ServerError on a failed health check', async () => {
    mockFetchOnce(async () => new Response('', { status: 503 }));
    await expect(healthCheck()).rejects.toBeInstanceOf(ServerError);
  });
});

describe('getDailyNote', () => {
  it('synthesizes a daily note from a fresh search and caches it', async () => {
    // First call: cache miss → fetches search200, synthesizes, writes cache.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(search200), { status: 200 }) as never,
    );
    const r = await getDailyNote({ lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv', activity: 'wedding' });
    expect(r.cacheHit).toBe(false);
    expect(r.response.daily_note).toBeDefined();
  });
});
