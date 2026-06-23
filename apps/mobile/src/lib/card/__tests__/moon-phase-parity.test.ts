import { describe, expect, it } from 'vitest';
import { moonPhaseForDate, moonPhaseForIso } from '../moon-phase';
import { computeMoonPhase } from '@inceptio/translations';

// Parity test: card/moon-phase delegates to @inceptio/translations.
// Known-date expectations from packages/translations/src/__tests__/moon-phase.test.ts.
describe('moon-phase-parity (card → @inceptio/translations)', () => {
  it('moonPhaseForDate matches computeMoonPhase for the new-moon anchor date', () => {
    expect(moonPhaseForDate('2000-01-06')).toBe(computeMoonPhase('2000-01-06'));
    expect(moonPhaseForDate('2000-01-06')).toBe('new');
  });

  it('moonPhaseForDate matches computeMoonPhase for a full-moon date', () => {
    expect(moonPhaseForDate('2000-01-21')).toBe(computeMoonPhase('2000-01-21'));
    expect(moonPhaseForDate('2000-01-21')).toBe('full');
  });

  it('moonPhaseForDate matches computeMoonPhase for a 2026 date', () => {
    expect(moonPhaseForDate('2026-06-18')).toBe(computeMoonPhase('2026-06-18'));
  });

  it('moonPhaseForIso extracts local date and delegates to computeMoonPhase', () => {
    // 2026-06-18T20:30:00+03:00 → local date 2026-06-18
    const iso = '2026-06-18T20:30:00+03:00';
    expect(moonPhaseForIso(iso)).toBe(computeMoonPhase('2026-06-18'));
  });
});
