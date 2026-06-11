/** Minimal, dependency-free semver for store MARKETING versions ("x.y.z").
 *  Tolerant of a leading 'v', surrounding whitespace, and a pre-release/build
 *  suffix (ignored). Returns null on anything not readable as exactly three
 *  non-negative integers — callers MUST treat null as "unknown" and fail open.
 *  Never throws. No implicit zero-fill (a 2-part "1.2" is null, not 1.2.0). */
export type Semver = { major: number; minor: number; patch: number };

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

export function parseSemver(input: unknown): Semver | null {
  if (typeof input !== 'string') return null;
  const m = SEMVER_RE.exec(input.trim());
  if (!m) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) {
    return null;
  }
  return { major, minor, patch };
}

export function compareSemver(a: Semver, b: Semver): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}
