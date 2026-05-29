import { describe, expect, it } from 'vitest';
import { deriveSavedSearchStatus } from '../daily-notes/saved-search-state';
import { window_ } from './fixtures';

const SAVED_BASE = {
  id: 'search-1',
  activity: 'wedding' as const,
  date_from: '2026-06-01',
  date_to: '2026-08-31',
};

describe('deriveSavedSearchStatus', () => {
  it('none-yet: no qualifying window, populates searched_through from date_to', () => {
    const result = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: null,
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    expect(result.state).toBe('none-yet');
    expect(result.window_start).toBeNull();
    expect(result.window_end).toBeNull();
    expect(result.searched_through).toBe('2026-08-31');
  });

  it('pre-window: future window, no prior history → not an alert', () => {
    const result = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({
        start: '2026-07-15T14:00:00+03:00',
        end: '2026-07-15T16:00:00+03:00',
        score: 68,
      }),
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    expect(result.state).toBe('pre-window');
    expect(result.window_start).toBe('2026-07-15T14:00:00+03:00');
    expect(result.window_end).toBe('2026-07-15T16:00:00+03:00');
    expect(result.is_stronger).toBeUndefined();
    expect(result.alert_id).toBeUndefined();
  });

  it('new-window: stronger than previousTopScore AND not acknowledged', () => {
    const result = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({
        start: '2026-07-15T14:00:00+03:00',
        end: '2026-07-15T16:00:00+03:00',
        score: 72,
      }),
      previousTopScore: 60,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    expect(result.state).toBe('new-window');
    expect(result.is_stronger).toBe(true);
    expect(result.new_score).toBe(72);
    expect(result.prior_best_score).toBe(60);
    expect(result.alert_id).toBeDefined();
    expect(result.acknowledged).toBe(false);
  });

  it('new-window collapses to pre-window when its alert_id is in acknowledgedAlertIds', () => {
    const top = window_({
      start: '2026-07-15T14:00:00+03:00',
      end: '2026-07-15T16:00:00+03:00',
      score: 72,
    });
    // First derive to learn the alert_id we would expect
    const firstPass = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: top,
      previousTopScore: 60,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    expect(firstPass.state).toBe('new-window');
    const ackedAlertId = firstPass.alert_id!;

    const acked = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: top,
      previousTopScore: 60,
      acknowledgedAlertIds: [ackedAlertId],
      today_iso_date: '2026-06-05',
    });
    expect(acked.state).toBe('pre-window');
    expect(acked.alert_id).toBeUndefined();
  });

  it('in-window: today is between window_start and window_end', () => {
    const result = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({
        start: '2026-06-05T10:00:00+03:00',
        end: '2026-06-05T14:00:00+03:00',
        score: 70,
      }),
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    expect(result.state).toBe('in-window');
  });

  it('passed: window_end is in the past', () => {
    const result = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({
        start: '2026-06-01T10:00:00+03:00',
        end: '2026-06-01T14:00:00+03:00',
        score: 65,
      }),
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    expect(result.state).toBe('passed');
  });

  it('priority: in-window < new-window < pre-window < none-yet < passed', () => {
    // Lower number = higher priority. Spot-check the bands.
    const inWin = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({ start: '2026-06-05T10:00:00+03:00', end: '2026-06-05T14:00:00+03:00', score: 70 }),
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    const newWin = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({ start: '2026-07-15T14:00:00+03:00', end: '2026-07-15T16:00:00+03:00', score: 72 }),
      previousTopScore: 60,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    const preWin = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({ start: '2026-07-15T14:00:00+03:00', end: '2026-07-15T16:00:00+03:00', score: 60 }),
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    const noneYet = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: null,
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    const passed = deriveSavedSearchStatus({
      saved: SAVED_BASE,
      topWindow: window_({ start: '2026-06-01T10:00:00+03:00', end: '2026-06-01T14:00:00+03:00', score: 65 }),
      previousTopScore: null,
      acknowledgedAlertIds: [],
      today_iso_date: '2026-06-05',
    });
    expect(inWin.priority).toBeLessThan(newWin.priority);
    expect(newWin.priority).toBeLessThan(preWin.priority);
    expect(preWin.priority).toBeLessThan(noneYet.priority);
    expect(noneYet.priority).toBeLessThan(passed.priority);
  });
});
