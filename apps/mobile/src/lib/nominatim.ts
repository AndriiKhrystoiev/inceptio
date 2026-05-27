// Nominatim (OpenStreetMap) geocoding client.
//
// Nominatim's usage policy requires a real User-Agent header identifying the
// app — omitting it returns 403. The policy also asks for max 1 req/sec; the
// hook that wraps this client debounces by 500ms and aborts in-flight calls,
// so we comfortably stay under that ceiling.

const USER_AGENT = 'Inceptio-Mobile/1.0 (https://inceptio.app)';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export interface NominatimResult {
  /** Stable id from Nominatim — use as React key. */
  place_id: number;
  lat: number;
  lng: number;
  /** Free-form full description, e.g. "Kyiv, Ukraine". */
  display_name: string;
  /** Best city-name guess (city → town → village → first display_name segment). */
  city: string;
  /** Country name. Empty string if Nominatim returned no address.country. */
  country: string;
}

// Discriminated error hierarchy so call sites can pattern-match on the cause.
export class NominatimError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'NominatimError';
  }
}

export class NominatimRateLimitError extends NominatimError {
  constructor() {
    super('Nominatim rate limit reached', 429);
    this.name = 'NominatimRateLimitError';
  }
}

export class NominatimNetworkError extends NominatimError {
  constructor(cause?: unknown) {
    super(
      `Nominatim network error: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'NominatimNetworkError';
  }
}

/**
 * Free-form forward geocoding. Returns up to 5 results, normalized to
 * `NominatimResult`. Caller-controlled cancellation via `signal`.
 *
 * Throws:
 *   - AbortError if `signal` was aborted (re-thrown from fetch)
 *   - NominatimRateLimitError on 429
 *   - NominatimError on 403 (User-Agent missing) or other non-2xx
 *   - NominatimNetworkError on connection/DNS failures
 */
export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    featuretype: 'city',
    'accept-language': 'en',
  });

  let res: Response;
  try {
    res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      signal,
    });
  } catch (err) {
    // Bubble abort up untouched so the hook can ignore it cleanly.
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new NominatimNetworkError(err);
  }

  if (res.status === 403) {
    // This should not happen — our User-Agent is set. If it does, the
    // header was stripped somewhere in the stack and we need to debug it.
    console.error(
      '[nominatim] 403 Forbidden — User-Agent header was rejected. ' +
        'Verify the User-Agent string is being sent.',
    );
    throw new NominatimError('Nominatim refused the request (403)', 403);
  }
  if (res.status === 429) {
    throw new NominatimRateLimitError();
  }
  if (!res.ok) {
    throw new NominatimError(`Nominatim HTTP ${res.status}`, res.status);
  }

  const raw = (await res.json()) as unknown[];
  return raw
    .map((item) => normalize(item as RawNominatim))
    .filter((r): r is NominatimResult => r !== null);
}

/**
 * Reverse geocoding — turn device GPS coordinates into a city name.
 *
 * Used by the "Use current location" button on the location picker. Returns
 * the same normalized shape as `searchLocations` so callers can drop the
 * result directly into the existing selection path.
 *
 * The `place_id` Nominatim returns for reverse queries can collide with
 * forward-search ids, but since this result is selected immediately (not
 * compared against a list of forward hits), that's a non-issue here.
 *
 * Throws the same NominatimError hierarchy as forward search.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<NominatimResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    zoom: '10', // city-level granularity
    'accept-language': 'en',
  });

  let res: Response;
  try {
    res = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new NominatimNetworkError(err);
  }

  if (res.status === 429) throw new NominatimRateLimitError();
  if (!res.ok) {
    throw new NominatimError(`Nominatim HTTP ${res.status}`, res.status);
  }

  const raw = (await res.json()) as RawNominatim;
  // Middle-of-ocean / Antarctica lookups return a 200 with an `error` field
  // and no usable address. Treat as "no city" so the caller can fall back.
  if (!raw || (raw as { error?: string }).error || !raw.lat || !raw.lon) {
    return null;
  }

  // The reverse endpoint occasionally returns a result without `place_id`
  // (lakes, parks, unusual reverse hits). We synthesize one — id is only
  // used as a React key and the reverse result is used immediately, not
  // compared against the forward-search list.
  const parsedLat = parseFloat(raw.lat);
  const parsedLng = parseFloat(raw.lon);
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
  const addr = raw.address ?? {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    raw.display_name?.split(',')[0]?.trim() ||
    '';
  return {
    place_id: typeof raw.place_id === 'number' ? raw.place_id : -2,
    lat: parsedLat,
    lng: parsedLng,
    display_name: raw.display_name ?? '',
    city,
    country: addr.country ?? '',
  };
}

interface RawNominatim {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

function normalize(item: RawNominatim): NominatimResult | null {
  const lat = parseFloat(item.lat ?? '');
  const lng = parseFloat(item.lon ?? '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (typeof item.place_id !== 'number') return null;

  const addr = item.address ?? {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    item.display_name?.split(',')[0]?.trim() ||
    '';

  return {
    place_id: item.place_id,
    lat,
    lng,
    display_name: item.display_name ?? '',
    city,
    country: addr.country ?? '',
  };
}
