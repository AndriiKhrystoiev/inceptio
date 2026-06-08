import { describe, it, expect } from 'vitest';
import {
  formatDateInTz,
  tzOffsetMinutes,
  nextLocalMidnightUnix,
  secondsToNextLocalMidnight,
  isValidTz,
  resolveBucketTz,
} from '../lib/local-date';

// Format a unix-seconds instant back into a tz as HH:mm and YYYY-MM-DD so we
// can assert "this instant is local midnight" without hand-computing offsets.
function wallClock(unixSec: number, tz: string): { date: string; hm: string } {
  const d = new Date(unixSec * 1000);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  return { date, hm: hm === '24:00' ? '00:00' : hm };
}

describe('formatDateInTz', () => {
  it('returns YYYY-MM-DD in the given tz (date rolls forward east of UTC)', () => {
    // 2023-11-14T22:13:20Z → Tokyo (+9) is already 2023-11-15.
    const d = new Date(1_700_000_000 * 1000);
    expect(formatDateInTz(d, 'Asia/Tokyo')).toBe('2023-11-15');
    expect(formatDateInTz(d, 'UTC')).toBe('2023-11-14');
  });
});

describe('tzOffsetMinutes', () => {
  it('reads the offset AT the instant (EST = -300)', () => {
    const ms = Date.UTC(2026, 0, 15, 12, 0, 0); // Jan → EST
    expect(tzOffsetMinutes(ms, 'America/New_York')).toBe(-300);
  });
  it('reads the post-transition offset (EDT = -240) after spring-forward', () => {
    const ms = Date.UTC(2026, 6, 15, 12, 0, 0); // Jul → EDT
    expect(tzOffsetMinutes(ms, 'America/New_York')).toBe(-240);
  });
});

describe('nextLocalMidnightUnix', () => {
  it('lands exactly on 00:00 of the next local day (simple case)', () => {
    const nowMs = Date.UTC(2026, 0, 15, 12, 0, 0); // NY 07:00 EST
    const r = nextLocalMidnightUnix(nowMs, 'America/New_York');
    const { date, hm } = wallClock(r, 'America/New_York');
    expect(hm).toBe('00:00');
    expect(date).toBe('2026-01-16');
  });
  it('is DST-correct across spring-forward (offset shifts -5→-4)', () => {
    // 2026-03-08 is the US spring-forward day (02:00 EST→EDT).
    const nowMs = Date.UTC(2026, 2, 8, 6, 0, 0); // NY 01:00 EST on the DST day
    const r = nextLocalMidnightUnix(nowMs, 'America/New_York');
    const { date, hm } = wallClock(r, 'America/New_York');
    expect(hm).toBe('00:00');
    expect(date).toBe('2026-03-09');
  });
  it('is DST-correct across fall-back (offset shifts -4→-5)', () => {
    // 2026-11-01 is the US fall-back day (02:00 EDT → 01:00 EST). At 01:00 EDT
    // (05:00 UTC) the local date is still 2026-11-01; next local midnight is
    // 2026-11-02 00:00 EST. This is the case the settle-once iteration exists for.
    const nowMs = Date.UTC(2026, 10, 1, 5, 0, 0);
    const r = nextLocalMidnightUnix(nowMs, 'America/New_York');
    const { date, hm } = wallClock(r, 'America/New_York');
    expect(hm).toBe('00:00');
    expect(date).toBe('2026-11-02');
  });
  it('lands on 00:00 next local day for a positive-offset zone (Tokyo +9)', () => {
    const nowMs = Date.UTC(2026, 0, 15, 12, 0, 0);
    const r = nextLocalMidnightUnix(nowMs, 'Asia/Tokyo');
    const { date, hm } = wallClock(r, 'Asia/Tokyo');
    expect(hm).toBe('00:00');
  });
});

describe('secondsToNextLocalMidnight', () => {
  it('is the concrete number of seconds until local midnight (NY noon UTC)', () => {
    // 2026-01-15 12:00 UTC → 07:00 EST (-5h). Next local midnight = 17:00 UTC.
    // 17h remain → 61200s.
    const now = Math.floor(Date.UTC(2026, 0, 15, 12, 0, 0) / 1000);
    expect(secondsToNextLocalMidnight(now, 'America/New_York')).toBe(17 * 3600);
  });
});

describe('isValidTz / resolveBucketTz', () => {
  it('isValidTz rejects junk and accepts IANA ids', () => {
    expect(isValidTz('America/Sao_Paulo')).toBe(true);
    expect(isValidTz('Not/AZone')).toBe(false);
    expect(isValidTz(null)).toBe(false);
    expect(isValidTz('')).toBe(false);
  });
  it('resolveBucketTz picks the first valid candidate, else UTC', () => {
    expect(resolveBucketTz('bad', 'Europe/Madrid')).toBe('Europe/Madrid');
    expect(resolveBucketTz('America/New_York', 'Europe/Madrid')).toBe('America/New_York');
    expect(resolveBucketTz(null, undefined)).toBe('UTC');
    expect(resolveBucketTz('bad', 'also-bad')).toBe('UTC');
  });
});
