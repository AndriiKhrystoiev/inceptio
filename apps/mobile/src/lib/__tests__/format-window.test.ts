import { describe, it, expect } from 'vitest';
import { getDurationVariant, formatWindowTime, buildNarrative } from '../format-window';

describe('getDurationVariant', () => {
  it('classifies by duration_minutes', () => {
    expect(getDurationVariant(null)).toBe('unknown');
    expect(getDurationVariant(undefined)).toBe('unknown');
    expect(getDurationVariant(90)).toBe('long');
    expect(getDurationVariant(61)).toBe('long');
    expect(getDurationVariant(60)).toBe('medium');
    expect(getDurationVariant(10)).toBe('medium');
    expect(getDurationVariant(5)).toBe('short');
    expect(getDurationVariant(2)).toBe('short');
    expect(getDurationVariant(1)).toBe('single');
    expect(getDurationVariant(0)).toBe('unknown');
  });
});

describe('formatWindowTime', () => {
  it('returns empty primary when no start', () => {
    expect(formatWindowTime({})).toEqual({ primary: '', secondary: null });
  });
  it('renders a long window as a range with duration', () => {
    const r = formatWindowTime({ start: '2026-07-01T12:00:00Z', end: '2026-07-01T13:25:00Z', duration_minutes: 85 });
    expect(r.primary).toMatch(/\(1h 25m\)$/);
    expect(r.secondary).toBeNull();
  });
  it('renders a single-minute window with the "exactly" label + hint', () => {
    const r = formatWindowTime({ start: '2026-07-01T12:00:00Z', end: '2026-07-01T12:01:00Z', duration_minutes: 1 });
    expect(r.primary).toMatch(/exactly/i);
    expect(r.secondary).toBe('A single, pristine moment. Be ready.');
  });
  it('treats a synthetic window as approximate', () => {
    const r = formatWindowTime({ start: '2026-07-01T12:00:00Z', _synthetic: true, duration_minutes: null });
    expect(r.secondary).toMatch(/Approximate time/);
  });
});

describe('buildNarrative', () => {
  it('falls back honestly when there are no displayable factors', () => {
    expect(buildNarrative({})).toEqual([
      'Less detail is available for this day — try a focused search to see the full breakdown.',
    ]);
  });
  it('picks up to two passing factors then one partial/non-low fail', () => {
    const paras = buildNarrative({
      factors: [
        { factor_id: 'a', weight_class: 'high' },
        { factor_id: 'b', weight_class: 'high' },
        { factor_id: 'c', weight_class: 'high' },
      ],
      displayable: {
        factors: [
          { factor_id: 'a', status: 'pass', phrase_short: 'A', phrase_full: 'Para A.' },
          { factor_id: 'b', status: 'pass', phrase_short: 'B', phrase_full: 'Para B.' },
          { factor_id: 'c', status: 'partial', phrase_short: 'C', phrase_full: 'Para C.' },
        ],
      },
    });
    expect(paras).toEqual(['Para A.', 'Para B.', 'Para C.']);
  });
  it('skips a low-weight fail', () => {
    const paras = buildNarrative({
      factors: [{ factor_id: 'x', weight_class: 'low' }],
      displayable: { factors: [{ factor_id: 'x', status: 'fail', phrase_short: 'X', phrase_full: 'Low fail.' }] },
    });
    // no passing, only a low-weight fail → falls back to the first annotated phrase
    expect(paras).toEqual(['Low fail.']);
  });
});
