// Impure shell around storage.ts for the rating feature. All rating.* keys live
// here. storage.ts updates its in-memory cache SYNCHRONOUSLY on set() (verified
// storage.ts:36-51), so a write is visible to the next read in the same tick —
// that is what makes per-session attempt dedup work without a separate guard.

import { storage } from '../storage';
import { MS_PER_DAY, type RatingHistory } from './eligibility';

const K = {
  distinctDayCount: 'rating.distinctDayCount',
  lastActiveDay: 'rating.lastActiveDay',
  successfulSearches: 'rating.successfulSearches',
  firstSaveDone: 'rating.firstSaveDone',
  lastAttemptAt: 'rating.lastAttemptAt',
  attemptsInWindow: 'rating.attemptsInWindow',
  lastFrustrationAt: 'rating.lastFrustrationAt',
} as const;

function getInt(key: string): number {
  const raw = storage.getString(key);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
function setInt(key: string, n: number): void { storage.set(key, String(n)); }
function getStr(key: string): string | null { return storage.getString(key) ?? null; }
function getIsoArray(key: string): string[] {
  const raw = storage.getString(key);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

/** Device-local calendar day key. Device-local is the correct frame for
 *  "was the user active today" (spec §5 — NOT event-tz, no BUG-001 hazard). */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Drop attempt timestamps older than the rolling window (default 365d). */
export function pruneAttempts(attempts: string[], now: Date, windowDays = 365): string[] {
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  return attempts.filter((iso) => {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

/** Read the full history the pure fn needs, pruning the attempt window first. */
export function loadHistory(now: Date): RatingHistory {
  return {
    distinctDayCount: getInt(K.distinctDayCount),
    successfulSearches: getInt(K.successfulSearches),
    lastAttemptAt: getStr(K.lastAttemptAt),
    attemptsInWindow: pruneAttempts(getIsoArray(K.attemptsInWindow), now),
    lastFrustrationAt: getStr(K.lastFrustrationAt),
  };
}

export function isFirstEverSave(): boolean {
  return storage.getString(K.firstSaveDone) !== '1';
}

// ── Recorders ──────────────────────────────────────────────────────────────

/** Bump the distinct-day counter once per new device-local day. */
export function recordActiveDay(now: Date = new Date()): void {
  const today = localDayKey(now);
  if (storage.getString(K.lastActiveDay) === today) return;
  storage.set(K.lastActiveDay, today);
  setInt(K.distinctDayCount, getInt(K.distinctDayCount) + 1);
}

export function recordSuccessfulSearch(): void {
  setInt(K.successfulSearches, getInt(K.successfulSearches) + 1);
}

/** Write a frustration instant (429 / upstream-quota / no_viable / error /
 *  feedback tap). Suppresses the next positive prompt for the cooldown. */
export function recordFrustration(now: Date = new Date()): void {
  storage.set(K.lastFrustrationAt, now.toISOString());
}

export function recordFirstSaveDone(): void {
  storage.set(K.firstSaveDone, '1');
}

/** Record OUR requestReview call (not a card-show — that is unknowable). */
export function recordAttempt(now: Date = new Date()): void {
  storage.set(K.lastAttemptAt, now.toISOString());
  const next = pruneAttempts(getIsoArray(K.attemptsInWindow), now);
  next.push(now.toISOString());
  storage.set(K.attemptsInWindow, JSON.stringify(next));
}

/** Dev-only: wipe every rating.* key (Debug "Reset rating state"). */
export function resetRatingState(): void {
  for (const key of Object.values(K)) storage.delete(key);
}

// ── Idempotency (EC10) — guards effect re-fires on cache-hit remounts ────────
// Module-scoped, so it survives screen remounts within a session (a useRef
// would not). Last-key-per-bucket: dedupes consecutive identical keys, allows a
// genuinely new search to record again.

const _lastKey: Record<string, string | undefined> = {};
export function oncePerKey(bucket: string, key: string): boolean {
  // Dedupe ANY string (including ''); the prior `key &&` guard let empty keys
  // bypass dedup entirely. Real call sites pass searchKeyOf(...) which is never
  // empty, but the guard was semantically wrong.
  if (_lastKey[bucket] === key) return false;
  _lastKey[bucket] = key;
  return true;
}
export function __resetRatingDedupeForTests(): void {
  for (const k of Object.keys(_lastKey)) delete _lastKey[k];
}

/** Stable identity for one search (mirrors the React Query key fields). */
export function searchKeyOf(req: {
  activity?: string; start?: string; end?: string; lat?: number; lng?: number;
}): string {
  return [req.activity, req.start, req.end, req.lat, req.lng].join('|');
}
