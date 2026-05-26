import { describe, it, expect } from 'vitest';
import {
  compareFactors,
  rankFactors,
  synthesizeHeadline,
} from '../headlines/synthesizer';
import { factor, window_ } from './fixtures';

describe('compareFactors', () => {
  it('sorts by weight_class first (critical > high > medium > low)', () => {
    const low = factor({ weight_class: 'low', contribution: 100, status: 'pass' });
    const high = factor({ weight_class: 'high', contribution: 1, status: 'pass' });
    expect(compareFactors(low, high)).toBeGreaterThan(0);
    // high outranks low even when low has overwhelming contribution
    expect([low, high].sort(compareFactors)[0]).toBe(high);
  });

  it('sorts by contribution within the same weight_class', () => {
    const lowC = factor({ weight_class: 'high', contribution: 5, status: 'pass' });
    const highC = factor({ weight_class: 'high', contribution: 20, status: 'pass' });
    expect([lowC, highC].sort(compareFactors)[0]).toBe(highC);
  });

  it('lets a high-weight partial outrank a low-weight pass', () => {
    const highPartial = factor({
      weight_class: 'high',
      contribution: 8,
      status: 'partial',
    });
    const lowPass = factor({
      weight_class: 'low',
      contribution: 8,
      status: 'pass',
    });
    expect([lowPass, highPartial].sort(compareFactors)[0]).toBe(highPartial);
  });

  it('prefers pass over partial within the same (weight, contribution) tier', () => {
    const pass = factor({
      factor_id: 'venus_dignified_direct_well_aspected',
      weight_class: 'high',
      contribution: 10,
      status: 'pass',
    });
    const partial = factor({
      factor_id: 'moon_waxing_increasing_light',
      weight_class: 'high',
      contribution: 10,
      status: 'partial',
    });
    expect([partial, pass].sort(compareFactors)[0]).toBe(pass);
  });
});

describe('rankFactors', () => {
  it('removes fail factors from the candidate pool', () => {
    const passF = factor({ status: 'pass' });
    const failF = factor({ status: 'fail' });
    const ranked = rankFactors([passF, failF]);
    expect(ranked).toEqual([passF]);
  });

  it('returns an empty array when every factor failed', () => {
    expect(rankFactors([factor({ status: 'fail' })])).toEqual([]);
  });
});

describe('synthesizeHeadline', () => {
  it('returns NO_VIABLE_HEADLINES[activity] when noViableWindows is true', () => {
    const out = synthesizeHeadline({
      topWindow: window_(),
      activity: 'wedding',
      noViableWindows: true,
    });
    expect(out).toBe('These days ask for patience — the sky is between rooms.');
  });

  it('uses a hand-written headline when one exists for (activity, factor_id, status)', () => {
    const out = synthesizeHeadline({
      topWindow: window_({
        factors: [factor({ factor_id: 'venus_dignified_direct_well_aspected', status: 'pass' })],
      }),
      activity: 'wedding',
      noViableWindows: false,
    });
    expect(out).toBe('A tender day for beginnings.');
  });

  it('falls through to the generic activity stem when no hand-written headline matches', () => {
    // house_free_of_malefic + travel has no hand-written headline.
    const out = synthesizeHeadline({
      topWindow: window_({
        factors: [
          factor({
            factor_id: 'house_free_of_malefic',
            weight_class: 'medium',
            status: 'pass',
            contribution: 7,
          }),
        ],
      }),
      activity: 'travel',
      noViableWindows: false,
    });
    expect(out).toMatch(/^An open day —/);
    expect(out).toContain('the room is clear');
  });

  it('never picks a fail factor as lead — falls back to no-viable headline if all fail', () => {
    const out = synthesizeHeadline({
      topWindow: window_({
        factors: [
          factor({ status: 'fail', weight_class: 'critical', contribution: 20 }),
        ],
      }),
      activity: 'contracts',
      noViableWindows: false,
    });
    expect(out).toBe('A quieter stretch for paper. Better moments are nearby.');
  });

  it('honors the contracts activity override on Mercury for the contracts headline', () => {
    const out = synthesizeHeadline({
      topWindow: window_({
        factors: [
          factor({
            factor_id: 'mercury_dignified_direct_not_combust',
            weight_class: 'critical',
            status: 'pass',
            contribution: 18,
          }),
        ],
      }),
      activity: 'contracts',
      noViableWindows: false,
    });
    expect(out).toBe('A clear day for plain words.');
  });
});
