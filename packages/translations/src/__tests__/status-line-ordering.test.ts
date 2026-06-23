import { describe, expect, it } from 'vitest';
import { orderStatusLines } from '../daily-notes/status-line-ordering';
import type { SavedSearchStatusOutput } from '../types';

function status(
  id: string,
  priority: number,
  overrides: Partial<SavedSearchStatusOutput> = {},
): SavedSearchStatusOutput {
  return {
    id,
    activity: 'wedding',
    state: 'pre-window',
    window_start: '2026-07-15T14:00:00+03:00',
    window_end: '2026-07-15T16:00:00+03:00',
    priority,
    ...overrides,
  };
}

describe('orderStatusLines', () => {
  it('sorts ascending by priority — in-window (0) before new-window (1M) before pre-window (2M) before none-yet (3M) before passed (4M)', () => {
    const result = orderStatusLines([
      status('s-passed',  4_000_000, { state: 'passed' }),
      status('s-pre',     2_000_000),
      status('s-new',     1_000_000, { state: 'new-window', is_stronger: true, alert_id: 'a1' }),
      status('s-in',              0, { state: 'in-window' }),
    ]);
    expect(result.visible.map((s) => s.id)).toEqual(['s-in', 's-new', 's-pre']);
    expect(result.overflow_count).toBe(1);
  });

  it('within the same band, lower priority wins (stable for ties)', () => {
    // Five pre-window entries with monotonically increasing priority — the
    // state-derivation function distinguishes them by tail digits (days_until,
    // etc.). Here we just verify the ordering function respects the input.
    const result = orderStatusLines([
      status('far',    2_000_030),
      status('close',  2_000_003),
      status('medium', 2_000_014),
    ]);
    expect(result.visible.map((s) => s.id)).toEqual(['close', 'medium', 'far']);
    expect(result.overflow_count).toBe(0);
  });

  it('none-yet sits between pre-window and passed', () => {
    const result = orderStatusLines([
      status('s-passed', 4_000_000, { state: 'passed' }),
      status('s-none',   3_000_000, { state: 'none-yet', window_start: null, window_end: null, searched_through: '2026-08-31' }),
      status('s-pre',    2_000_000),
    ]);
    expect(result.visible.map((s) => s.id)).toEqual(['s-pre', 's-none', 's-passed']);
  });

  it('caps at 3 visible + overflow', () => {
    const all = Array.from({ length: 8 }, (_, i) =>
      status(`s-${i}`, 2_000_000 + i),
    );
    const result = orderStatusLines(all);
    expect(result.visible.length).toBe(3);
    expect(result.overflow_count).toBe(5);
    expect(result.visible.map((s) => s.id)).toEqual(['s-0', 's-1', 's-2']);
  });

  it('empty input → empty visible, zero overflow', () => {
    const result = orderStatusLines([]);
    expect(result.visible).toEqual([]);
    expect(result.overflow_count).toBe(0);
  });
});
