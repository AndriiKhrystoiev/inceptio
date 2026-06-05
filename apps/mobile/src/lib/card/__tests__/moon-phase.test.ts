import { describe, it, expect } from 'vitest';
import { moonPhaseForDate, moonPhaseForIso } from '../moon-phase';

// Golden values LOCKED to the backend algorithm (workers/.../daily-notes/
// moon-phase.ts). If these change, the client port drifted from the server.
describe('moon-phase', () => {
  it('matches the backend algorithm at reference dates', () => {
    expect(moonPhaseForDate('2000-01-06')).toBe('new'); // new-moon anchor day
    expect(moonPhaseForDate('2000-01-21')).toBe('full'); // ~half a synodic month
    expect(moonPhaseForDate('2026-06-18')).toBe('waxing-crescent');
    expect(moonPhaseForDate('2026-06-29')).toBe('full');
  });

  it('moonPhaseForIso uses the moment LOCAL date, not the UTC date', () => {
    // 23:30 at -05:00 is the 18th locally (would be the 19th in UTC) — must stay the 18th.
    expect(moonPhaseForIso('2026-06-18T23:30:00-05:00')).toBe('waxing-crescent');
    // The user's real moment: 8:30 PM in Kyiv (+03:00) on the 18th.
    expect(moonPhaseForIso('2026-06-18T20:30:00+03:00')).toBe('waxing-crescent');
  });
});
