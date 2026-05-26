import { describe, it, expect, vi } from 'vitest';
import {
  translate,
  translateExcludedReason,
  translateFactor,
} from '../translate';
import { factor, window_, viableResponse, noViableResponse, envelope } from './fixtures';

describe('translateFactor', () => {
  it('returns the wedding venus override (tenderness)', () => {
    const out = translateFactor(
      'venus_dignified_direct_well_aspected',
      'pass',
      'wedding',
    );
    expect(out.phrase_short).toBe('Venus brings tenderness');
  });

  it('applies contracts override on venus.partial (both fields)', () => {
    const out = translateFactor(
      'venus_dignified_direct_well_aspected',
      'partial',
      'contracts',
    );
    expect(out.phrase_short).toBe('Goodwill is present');
    expect(out.phrase_full).toContain('Venus is around but not at her brightest');
  });

  it('falls back to base.partial when the activity has no partial override', () => {
    const out = translateFactor(
      'venus_dignified_direct_well_aspected',
      'partial',
      'travel',
    );
    expect(out.phrase_short).toBe('Venus shows up gently');
    expect(out.phrase_full).toContain('in good standing but not at her strongest');
  });

  it('does not let activity.pass bleed into fail status', () => {
    // wedding overrides venus.pass but not venus.fail. Fail must stay base fail.
    const out = translateFactor(
      'venus_dignified_direct_well_aspected',
      'fail',
      'wedding',
    );
    expect(out.phrase_short).toBe('Venus is muted');
    expect(out.phrase_full).toContain('Venus is quiet in the sky');
  });

  it('applies travel override to Mercury pass', () => {
    const out = translateFactor(
      'mercury_dignified_direct_not_combust',
      'pass',
      'travel',
    );
    expect(out.phrase_short).toBe('Mercury moves easily');
  });

  it('falls back to a generic phrasing + warns on unknown factor_id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const out = translateFactor('totally_new_2027_factor', 'pass', 'wedding');
      expect(out.phrase_short).toBe('A subtle influence');
      expect(out.phrase_full).toContain('subtle influence');
      expect(warn).toHaveBeenCalledWith(
        '[translate] unknown factor_id from upstream:',
        'totally_new_2027_factor',
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe('translateExcludedReason', () => {
  it('returns the locked Mercury retrograde phrase', () => {
    expect(translateExcludedReason('mercury_retrograde')).toBe(
      'Mercury is sleeping — communication needs extra care this week.',
    );
  });

  it('returns the locked moon_voc phrase', () => {
    expect(translateExcludedReason('moon_voc')).toContain(
      'The Moon is between signs',
    );
  });

  it('falls back to a generic phrase + warns on unknown reason_id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const out = translateExcludedReason('pluto_retrograde');
      expect(out).toBe('The sky asks for stillness here.');
      expect(warn).toHaveBeenCalledWith(
        '[translate] unknown reason_id from upstream:',
        'pluto_retrograde',
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe('translate — viable response (envelope shape)', () => {
  const out = translate(viableResponse(), 'wedding');

  it('preserves the envelope (success, metadata, warnings, pagination)', () => {
    expect(out.success).toBe(true);
    expect(out.metadata.api_version).toBe('v3');
    expect(out.metadata.request_id).toBe('req_test_abc');
    expect(out.warnings).toBeNull();
    expect(out.pagination).toBeNull();
  });

  it('puts the L1 headline at data.summary.displayable.headline', () => {
    expect(out.data.summary.displayable.headline).toBe(
      'A tender day for beginnings.',
    );
  });

  it('preserves the raw summary fields alongside displayable', () => {
    expect(out.data.summary.viable_windows_count).toBe(2);
    expect(out.data.summary.no_viable_windows).toBe(false);
    expect(out.data.summary.total_candidates_evaluated).toBe(720);
  });

  it('adds displayable to each top_window with headline + factors', () => {
    expect(out.data.top_windows).toHaveLength(1);
    const w = out.data.top_windows[0]!;
    expect(w.displayable.headline).toBe('A tender day for beginnings.');
    expect(w.displayable.factors).toHaveLength(3);
  });

  it('translates ALL factors including fail (mobile filters at render time)', () => {
    const w = out.data.top_windows[0]!;
    const ids = w.displayable.factors.map((f) => f.factor_id);
    expect(ids).toContain('venus_dignified_direct_well_aspected');
    expect(ids).toContain('moon_waxing_increasing_light');
    expect(ids).toContain('mercury_dignified_direct_not_combust');
    const failFactor = w.displayable.factors.find((f) => f.status === 'fail');
    expect(failFactor).toBeDefined();
    expect(failFactor!.phrase_short).toBe('Mercury is dim');
  });

  it('ranks the displayable factors by weight×contribution', () => {
    const w = out.data.top_windows[0]!;
    expect(w.displayable.factors[0]!.factor_id).toBe(
      'venus_dignified_direct_well_aspected',
    );
    expect(w.displayable.factors[1]!.factor_id).toBe(
      'moon_waxing_increasing_light',
    );
    expect(w.displayable.factors[2]!.factor_id).toBe(
      'mercury_dignified_direct_not_combust',
    );
  });

  it('preserves the raw factor data alongside displayable (L3 needs it)', () => {
    const w = out.data.top_windows[0]!;
    expect(w.factors).toHaveLength(3);
    expect(w.factors[0]!.factor_id).toBe('venus_dignified_direct_well_aspected');
    expect(w.factors[0]!.contribution).toBe(15.58);
    expect(w.factors[0]!.observation).toContain('Leo');
    expect(w.factors[0]!.rationale_short).toBe('Venus is dignified and direct.');
    expect(w.factors[0]!.category).toBe('electional');
  });

  it('softens excluded ranges to displayable phrases', () => {
    expect(out.data.excluded_ranges).toHaveLength(1);
    expect(out.data.excluded_ranges[0]!.displayable.phrase).toBe(
      'Mercury is sleeping — communication needs extra care this week.',
    );
    // Raw API fields still present
    expect(out.data.excluded_ranges[0]!.label).toContain('Mercury retrograde');
    expect(out.data.excluded_ranges[0]!.severity).toBe('medium');
    expect(out.data.excluded_ranges[0]!.applies_to_activity).toBe(true);
  });

  it('handles factor with null details (e.g. moon_applying_to_benefic with no aspect)', () => {
    const w = out.data.top_windows[0]!;
    const moonFactor = w.factors.find(
      (f) => f.factor_id === 'moon_waxing_increasing_light',
    );
    expect(moonFactor).toBeDefined();
    expect(moonFactor!.details).toBeNull();
  });
});

describe('translate — no_viable_windows', () => {
  it('returns the stock per-activity headline at data.summary.displayable.headline', () => {
    const out = translate(noViableResponse(), 'contracts');
    expect(out.data.summary.displayable.headline).toBe(
      'A quieter stretch for paper. Better moments are nearby.',
    );
  });

  it("still translates every window's factors (L3 view needs them)", () => {
    const out = translate(noViableResponse(), 'wedding');
    expect(out.data.top_windows[0]!.displayable.factors).toHaveLength(1);
  });
});

describe('translate — determinism', () => {
  it('same input → same output (golden-style)', () => {
    const a = translate(viableResponse(), 'wedding');
    const b = translate(viableResponse(), 'wedding');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different activities produce different headlines for the same Venus-led window', () => {
    const weddingOut = translate(viableResponse(), 'wedding');
    const travelOut = translate(viableResponse(), 'travel');
    expect(weddingOut.data.summary.displayable.headline).not.toBe(
      travelOut.data.summary.displayable.headline,
    );
  });
});

describe('translate — fallback to generic stem', () => {
  it('applies the activity-shaped stem when no hand-written headline matches the lead', () => {
    const out = translate(
      envelope({
        top_windows: [
          window_({
            factors: [
              factor({
                factor_id: 'house_ruler_dignified_well_placed',
                weight_class: 'high',
                status: 'pass',
                contribution: 12,
              }),
            ],
          }),
        ],
      }),
      'travel',
    );
    expect(out.data.summary.displayable.headline).toMatch(/^An open day —/);
  });
});
