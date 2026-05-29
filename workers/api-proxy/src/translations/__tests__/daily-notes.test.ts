import { describe, expect, it } from 'vitest';
import { synthesizeDailyNote } from '../daily-notes/picker';
import { excludedRange, factor, window_ } from './fixtures';

describe('synthesizeDailyNote — quality bucket → entry selection', () => {
  it('Strong bucket: picks strong-sky-is-clear when 6+ factors PASS, no exclusions', () => {
    const top = window_({
      score: 82,
      grade: 'strong',
      factors: [
        factor({ factor_id: 'venus_dignified_direct_well_aspected', status: 'pass', weight_class: 'high' }),
        factor({ factor_id: 'jupiter_angular_or_aspecting',         status: 'pass', weight_class: 'high' }),
        factor({ factor_id: 'mercury_dignified_direct_not_combust', status: 'pass', weight_class: 'medium' }),
        factor({ factor_id: 'moon_waxing_increasing_light',         status: 'pass', weight_class: 'medium' }),
        factor({ factor_id: 'no_malefic_on_angle',                  status: 'pass', weight_class: 'medium' }),
        factor({ factor_id: 'house_free_of_malefic',                status: 'pass', weight_class: 'low' }),
      ],
    });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('strong-sky-is-clear');
    expect(result.mood).toBe('strong');
    expect(result.date).toBe('2026-05-28');
    expect(result.headline).toBe('A wide-open day — the sky is clear.');
    expect(result.supporting).toContain('big asks');
    expect(result.exclusion_reason).toBeUndefined();
    expect(result.used_fallback).toBe(false);
  });

  it('Good bucket: picks good-venus-warm when Venus is the highest-weight PASS factor', () => {
    const top = window_({
      score: 68,
      grade: 'fair',
      factors: [
        factor({ factor_id: 'venus_dignified_direct_well_aspected', status: 'pass', weight_class: 'high', contribution: 18 }),
        factor({ factor_id: 'mercury_dignified_direct_not_combust', status: 'partial', weight_class: 'medium' }),
      ],
    });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('good-venus-warm');
    expect(result.mood).toBe('good');
  });

  it('Closed bucket: picks closed-moon-voc when an active moon_voc exclusion covers today', () => {
    const top = window_({ score: 35, grade: 'poor' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'moon_voc' })],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('closed-moon-voc');
    expect(result.mood).toBe('closed');
    expect(result.exclusion_reason).toBe('moon_voc');
  });

  it('Closed bucket: Mercury retrograde → primary entry when station <= 3 days away', () => {
    // Mercury direct station Aug 31, 2026 — pick "today" = Aug 29 (2 days out).
    const top = window_({ score: 40, grade: 'caution' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'mercury_retrograde' })],
      today_iso_date: '2026-08-29',
    });
    expect(result.entry_id).toBe('closed-mercury-retrograde');
    expect(result.headline).toBe('Mercury is sleeping.');
    expect(result.exclusion_reason).toBe('mercury_retrograde');
    expect(result.used_fallback).toBe(false);
  });

  it('Closed bucket: Mercury retrograde → vague fallback when station > 3 days away', () => {
    // Mercury Rx starts Aug 8; on Aug 10 the next direct station is Aug 31 (21 days out).
    const top = window_({ score: 40, grade: 'caution' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'mercury_retrograde' })],
      today_iso_date: '2026-08-10',
    });
    expect(result.entry_id).toBe('closed-mercury-retrograde-vague');
    expect(result.supporting).toContain('for now');
    expect(result.used_fallback).toBe(true);
  });

  it('exclusion precedence: closed-bucket wins even when raw score is in good band', () => {
    // Score 72 ("good"-band) but Venus rx covers today — must pick closed entry.
    const top = window_({ score: 72, grade: 'fair' });
    const result = synthesizeDailyNote({
      topWindow: top,
      excludedRangesActiveToday: [excludedRange({ reason_id: 'venus_retrograde' })],
      today_iso_date: '2026-05-28',
    });
    expect(result.entry_id).toBe('closed-venus-retrograde');
    expect(result.mood).toBe('closed');
    expect(result.exclusion_reason).toBe('venus_retrograde');
  });
});
