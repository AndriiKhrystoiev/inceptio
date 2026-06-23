import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mocks must come first.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-localization', () => ({ getLocales: () => [] }));
vi.mock('../device-id', () => ({ getDeviceId: vi.fn(async () => 'test-device-id') }));

// Simulate a dev build that resolved an API key + keyed base URL from .env.
vi.mock('../../config/api', () => ({
  API_CONFIG: {
    baseUrl: 'https://api.astrology-api.io/api/v3',
    apiKey: 'dev-secret-key',
    timeout: 20_000,
  },
}));

import { searchElectional } from '../api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const searchFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/api-public/search-200.json'), 'utf-8'),
) as Record<string, unknown>;

const REQ = {
  activity: 'wedding', lat: 50.45, lng: 30.52,
  start: '2026-07-01', end: '2026-07-07', timezone: 'Europe/Kyiv', city: 'Kyiv',
} as const;

beforeEach(() => { vi.restoreAllMocks(); });

describe('searchElectional with a configured dev API key', () => {
  it('sends X-API-Key and hits the configured base URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(searchFixture), { status: 200 }),
    );
    await searchElectional(REQ);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;

    expect(calledUrl).toBe('https://api.astrology-api.io/api/v3/electional/search');
    expect(headers['X-API-Key']).toBe('dev-secret-key');
  });
});
