import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { clusterWindows } from '../cluster-windows';

describe('clusterWindows', () => {
  it('returns [] for empty input', () => {
    expect(clusterWindows([])).toEqual([]);
  });

  it('collapses same-day windows into one card, strongest as representative', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T21:30:00+03:00', end: '2026-07-01T21:45:00+03:00', score: 60, duration_minutes: 15 },
      { start: '2026-07-01T22:00:00+03:00', end: '2026-07-01T22:15:00+03:00', score: 70, duration_minutes: 15 },
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].count).toBe(2);
    expect(cards[0].representative.score).toBe(70);
  });

  it('sorts cards by the day best score descending', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T21:30:00+03:00', score: 64, duration_minutes: 15 },
      { start: '2026-07-02T21:30:00+03:00', score: 72, duration_minutes: 15 },
    ]);
    expect(cards.map((c) => c.representative.score)).toEqual([72, 64]);
  });

  it('shows a contiguous range when windows fall within ~90 min', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T21:30:00+03:00', score: 60, duration_minutes: 15 },
      { start: '2026-07-01T22:30:00+03:00', score: 65, duration_minutes: 15 },
    ]);
    expect(cards[0].timePrimary).toContain('→');
  });

  it('points to the strongest moment when windows are spread across the day', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T15:00:00+03:00', score: 60, duration_minutes: 15 },
      { start: '2026-07-01T22:00:00+03:00', score: 65, duration_minutes: 15 },
    ]);
    expect(cards[0].timePrimary.toLowerCase()).toMatch(/best/);
  });
});

// BUG-001: date label is rendered in the device zone, not the event zone.
// A window starting 23:30 in a +12:00 zone is still the SAME calendar day
// locally, but on a device in a far-west zone Intl renders the prior day.
describe('clusterWindows date label (BUG-001)', () => {
  const realTZ = process.env.TZ;
  beforeAll(() => { process.env.TZ = 'America/Los_Angeles'; });
  afterAll(() => { process.env.TZ = realTZ; });

  it.fails('renders the date in the EVENT zone, not the device zone', () => {
    // 2026-07-01 23:30 at +12:00 → 2026-07-01 11:30 UTC → 2026-07-01 04:30 LA.
    // Same local date (July 1) at the event, but a naive formatter on an LA
    // device still says July 1 here; pick a case that crosses midnight:
    // 2026-07-02 00:30 at +12:00 → 2026-07-01 12:30 UTC → 2026-07-01 05:30 LA.
    const cards = clusterWindows([
      { start: '2026-07-02T00:30:00+12:00', score: 65, duration_minutes: 15 },
    ]);
    // Correct (event-zone) label is July 2; buggy code renders July 1.
    expect(cards[0].dateText).toMatch(/(July 2|2 July|Jul 2)/);
  });
});
