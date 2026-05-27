import type { Activity } from '@inceptio/shared-types';
import { storage } from './storage';
import {
  getLastLocation as _getLastLocation,
  saveLocation as _saveLocation,
  deviceTimezone,
  type SavedLocation as CanonicalSavedLocation,
} from './location-storage';

// The user's in-progress search assembly: activity picked → dates picked →
// location picked → fire. Persisted so leaving the modal flow halfway
// through (interrupted by app switch, etc.) doesn't lose the prior steps.
//
// `last_*` mirrors are kept after a successful search so Today screen can
// reuse them for the today single-day query without re-prompting.
//
// Backed by `./storage`, which is AsyncStorage + an in-memory cache so reads
// stay synchronous. See storage.ts for the rationale (Expo Go vs Nitro/MMKV).

const KEY_DRAFT = 'inceptio.search_draft';
const KEY_LAST_ACTIVITY = 'inceptio.last_activity';

export interface SearchDraft {
  activity?: Activity;
  start?: string;
  end?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  city?: string;
}

// Canonical SavedLocation now lives in `./location-storage`. Re-exported here
// for backward compatibility with existing imports.
export type SavedLocation = CanonicalSavedLocation;

function readJson<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

export function getDraft(): SearchDraft {
  return readJson<SearchDraft>(KEY_DRAFT) ?? {};
}

export function patchDraft(partial: Partial<SearchDraft>): SearchDraft {
  const next = { ...getDraft(), ...partial };
  writeJson(KEY_DRAFT, next);
  return next;
}

export function clearDraft(): void {
  storage.delete(KEY_DRAFT);
}

export function getLastActivity(): Activity | null {
  return (storage.getString(KEY_LAST_ACTIVITY) as Activity | undefined) ?? null;
}

export function setLastActivity(activity: Activity): void {
  storage.set(KEY_LAST_ACTIVITY, activity);
}

/**
 * Legacy entry point — delegates to the canonical store in `./location-storage`.
 * Returns the full `SavedLocation` shape (with `country` / `selected_at` /
 * `timezone`) so older callers that only read `lat`/`lng`/`timezone`/`city`
 * keep working unchanged.
 */
export function getLastLocation(): SavedLocation | null {
  return _getLastLocation();
}

/**
 * Legacy entry point — accepts the OLD shape `{lat, lng, timezone, city}` for
 * call-site compatibility. Fills in `country: ''` and `selected_at: now()` and
 * persists via the canonical store.
 */
export function setLastLocation(
  location: Pick<SavedLocation, 'lat' | 'lng' | 'timezone' | 'city'> &
    Partial<Pick<SavedLocation, 'country' | 'selected_at'>>,
): void {
  _saveLocation({
    lat: location.lat,
    lng: location.lng,
    city: location.city,
    country: location.country ?? '',
    timezone: location.timezone || deviceTimezone(),
    selected_at: location.selected_at ?? Math.floor(Date.now() / 1000),
  });
}

// ---------------------------------------------------------------------------
// Saved moments — local persistence for the You tab.
// A "saved moment" is a lightweight snapshot of a window the user bookmarked.
// No API call needed to determine if it's passed — compare end timestamp to
// Date.now() at read time.
// ---------------------------------------------------------------------------

const KEY_SAVED_MOMENTS = 'inceptio.saved_moments';

export interface SavedMoment {
  /** Unique id — window start ISO string + activity, enough to identify the search. */
  id: string;
  activity: Activity;
  city: string;
  /** ISO string — window start; drives the "When" display. */
  start: string;
  /** ISO string — window end; used to detect "Passed" status. */
  end: string;
  duration_minutes: number;
  score: number;
  grade: string;
  /** Friendly headline from the window's displayable.headline, or rationale. */
  headline: string;
  /** ISO string — when the user saved it. */
  saved_at: string;
}

export function getSavedMoments(): SavedMoment[] {
  return readJson<SavedMoment[]>(KEY_SAVED_MOMENTS) ?? [];
}

export function saveMoment(moment: SavedMoment): void {
  const existing = getSavedMoments();
  // Deduplicate by id — pressing Save twice on the same window is harmless.
  const deduped = existing.filter((m) => m.id !== moment.id);
  writeJson(KEY_SAVED_MOMENTS, [moment, ...deduped]);
}

export function removeSavedMoment(id: string): void {
  const filtered = getSavedMoments().filter((m) => m.id !== id);
  writeJson(KEY_SAVED_MOMENTS, filtered);
}

/** Drop the entire saved-moments list. Dev/debug only. */
export function clearSavedMoments(): void {
  storage.delete(KEY_SAVED_MOMENTS);
}
