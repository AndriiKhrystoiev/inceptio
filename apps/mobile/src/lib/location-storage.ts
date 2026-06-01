import { storage } from './storage';

// Canonical persisted shape for "the location the user last picked." Read by
// the Today screen's useDailyNote query and the picker chain when the
// user starts a new search.
//
// `timezone` is mandatory because the Worker's ElectionalSearchRequestSchema
// requires it. Nominatim doesn't return it, so callers populate it from
// `Intl.DateTimeFormat().resolvedOptions().timeZone` (device TZ) for now.
// TODO: add `tz-lookup` (CLAUDE.md "Stack (locked)") for per-location TZ.
export interface SavedLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
  timezone: string;
  /** Unix seconds. Useful for telemetry / staleness checks. */
  selected_at: number;
}

const KEY = 'inceptio.last_location';

export function saveLocation(loc: SavedLocation): void {
  storage.set(KEY, JSON.stringify(loc));
}

export function getLastLocation(): SavedLocation | null {
  const raw = storage.getString(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedLocation>;
    // Defensive: a value persisted by an older build may be missing the
    // new fields. We hydrate sensible defaults so consumers don't crash.
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      typeof parsed.city !== 'string'
    ) {
      return null;
    }
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      city: parsed.city,
      country: parsed.country ?? '',
      timezone:
        parsed.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone ??
        'UTC',
      selected_at: parsed.selected_at ?? 0,
    };
  } catch {
    return null;
  }
}

export function clearLocation(): void {
  storage.delete(KEY);
}

/**
 * Pick only the fields ElectionalSearchRequestSchema accepts (.strict()).
 * `SavedLocation` carries `country` and `selected_at` for UI/telemetry, but
 * including them in a request body makes the mobile-side parse throw a raw
 * ZodError — which falls through `friendlyMessage` to the generic "Something
 * went wrong" copy. Always pipe a SavedLocation through this helper before
 * spreading into a search request.
 */
export function locationToRequestFields(loc: {
  lat: number;
  lng: number;
  timezone: string;
  city: string;
}): { lat: number; lng: number; timezone: string; city: string } {
  return {
    lat: loc.lat,
    lng: loc.lng,
    timezone: loc.timezone,
    city: loc.city,
  };
}

/** Device timezone via Intl. Pure helper used when persisting Nominatim picks. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}
