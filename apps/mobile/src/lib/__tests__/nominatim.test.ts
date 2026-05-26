import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchLocations,
  NominatimError,
  NominatimRateLimitError,
  NominatimNetworkError,
} from '../nominatim';

const realFetch = globalThis.fetch;

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('searchLocations', () => {
  it('sends the User-Agent header (mandatory per Nominatim policy)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse([]),
    );

    await searchLocations('Kyiv');

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call).toBeDefined();
    const [, init] = call as [string, RequestInit];
    expect(init.headers).toBeDefined();
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(
      /Inceptio-Mobile/,
    );
  });

  it('encodes the query string + required params', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse([]),
    );

    await searchLocations('São Paulo');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
    ];
    expect(url).toContain('nominatim.openstreetmap.org/search');
    expect(url).toContain('format=json');
    expect(url).toContain('addressdetails=1');
    expect(url).toContain('limit=5');
    expect(url).toContain('accept-language=en');
    // URL-encoded space + accent
    expect(url).toMatch(/q=S%C3%A3o\+Paulo|q=S%C3%A3o%20Paulo/);
  });

  it('normalizes a typical city result', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse([
        {
          place_id: 12345,
          lat: '50.4501',
          lon: '30.5234',
          display_name: 'Kyiv, Ukraine',
          address: { city: 'Kyiv', country: 'Ukraine', country_code: 'ua' },
          type: 'city',
        },
      ]),
    );

    const results = await searchLocations('Kyiv');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      place_id: 12345,
      lat: 50.4501,
      lng: 30.5234,
      display_name: 'Kyiv, Ukraine',
      city: 'Kyiv',
      country: 'Ukraine',
    });
  });

  it('falls back through city → town → village → first display_name segment', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse([
        {
          place_id: 1,
          lat: '0',
          lon: '0',
          display_name: 'TownA, Region, Country',
          address: { town: 'TownA', country: 'Country' },
        },
        {
          place_id: 2,
          lat: '0',
          lon: '0',
          display_name: 'VillageB, Region, Country',
          address: { village: 'VillageB', country: 'Country' },
        },
        {
          place_id: 3,
          lat: '0',
          lon: '0',
          display_name: 'SomeWhere, Country',
          address: { country: 'Country' },
        },
      ]),
    );

    const results = await searchLocations('test');
    expect(results.map((r) => r.city)).toEqual(['TownA', 'VillageB', 'SomeWhere']);
  });

  it('drops results with invalid lat/lng or missing place_id', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse([
        { place_id: 1, lat: 'NaN', lon: '0', display_name: 'bad-lat' },
        { lat: '1', lon: '1', display_name: 'no-place-id' },
        { place_id: 2, lat: '1', lon: '1', display_name: 'OK, Country', address: { country: 'Country' } },
      ]),
    );

    const results = await searchLocations('test');
    expect(results).toHaveLength(1);
    expect(results[0]!.place_id).toBe(2);
  });

  it('throws NominatimRateLimitError on 429', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('Too Many', { status: 429 }),
    );
    await expect(searchLocations('x')).rejects.toBeInstanceOf(
      NominatimRateLimitError,
    );
  });

  it('throws NominatimError on 403 (User-Agent rejected)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('Forbidden', { status: 403 }),
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(searchLocations('x')).rejects.toMatchObject({
        name: 'NominatimError',
        status: 403,
      });
    } finally {
      errSpy.mockRestore();
    }
  });

  it('throws NominatimNetworkError on fetch rejection', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new TypeError('connection refused'),
    );
    await expect(searchLocations('x')).rejects.toBeInstanceOf(
      NominatimNetworkError,
    );
  });

  it('re-throws AbortError without wrapping it', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(abortErr);
    await expect(searchLocations('x')).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('forwards an AbortSignal to fetch', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse([]),
    );
    const controller = new AbortController();
    await searchLocations('x', controller.signal);
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});
