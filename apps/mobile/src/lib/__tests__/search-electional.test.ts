import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mocks must come first — same pattern as api-headers.test.ts.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-localization', () => ({ getLocales: () => [] }));
vi.mock('../device-id', () => ({
  getDeviceId: vi.fn(async () => 'test-device-id'),
}));

import { searchElectional } from '../api';

// Read fixture via fs (large JSON blows the rollup AST parser when imported directly).
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

describe('searchElectional (direct api-public)', () => {
  it('posts the nested upstream body and returns a translated envelope', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(searchFixture), { status: 200 }),
    );
    const result = await searchElectional(REQ);
    // request body was the nested upstream shape
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody.top_n_windows).toBe(10);
    expect(sentBody.date_range.start_date).toEqual({ year: 2026, month: 7, day: 1 });
    // response was translated → first window carries a displayable field
    expect(result.envelope.data.top_windows[0]).toHaveProperty('displayable');
  });

  it('maps a 422 to ServerError without crashing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: [{ msg: 'x' }] }), { status: 422 }),
    );
    await expect(searchElectional(REQ)).rejects.toMatchObject({ name: 'ServerError' });
  });
});
