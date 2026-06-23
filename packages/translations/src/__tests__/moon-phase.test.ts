import { describe, expect, it } from 'vitest';
import { computeMoonPhase } from '../daily-notes/moon-phase';

describe('computeMoonPhase', () => {
  it('returns one of the 8 phases', () => {
    const phases = new Set([
      'new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous',
      'full', 'waning-gibbous', 'last-quarter', 'waning-crescent',
    ]);
    expect(phases.has(computeMoonPhase('2026-05-29'))).toBe(true);
  });

  it('is deterministic for the same iso_date', () => {
    expect(computeMoonPhase('2026-05-29')).toBe(computeMoonPhase('2026-05-29'));
    expect(computeMoonPhase('2026-12-31')).toBe(computeMoonPhase('2026-12-31'));
  });

  it('reference date Jan 6 2000 ~18:14 UTC is "new" — phase 0 anchor', () => {
    expect(computeMoonPhase('2000-01-06')).toBe('new');
  });

  it('advances through phases over a synodic cycle', () => {
    // Sample 16 dates spanning ~32 days; the chosen segments should include
    // at least 4 distinct phases — proves the cycle math is moving.
    const start = new Date('2026-05-01T12:00:00Z');
    const observed = new Set<string>();
    for (let i = 0; i < 16; i++) {
      const d = new Date(start.getTime() + i * 2 * 24 * 3600 * 1000);
      observed.add(computeMoonPhase(d.toISOString().slice(0, 10)));
    }
    expect(observed.size).toBeGreaterThanOrEqual(4);
  });

  it('full moon ~14.77 days after a new moon', () => {
    // Anchor a new moon then jump ~half a cycle (14 days from Jan 6 2000)
    // and expect a gibbous-or-full phase, not new/crescent.
    const phase = computeMoonPhase('2000-01-20'); // 14 days after anchor
    expect(['waxing-gibbous', 'full', 'waning-gibbous']).toContain(phase);
  });
});
