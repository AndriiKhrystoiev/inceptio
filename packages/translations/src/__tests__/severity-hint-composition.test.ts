import { describe, it, expect, vi } from 'vitest';
import { composeDisplayable } from '../daily-notes/composer';
import type { PickResult } from '../daily-notes/picker';

/**
 * Severity-hint composition lives in the composer, NOT the picker:
 *   - The picker chooses an entry by sky shape (entry_id, mood, headline,
 *     supporting). It is activity-agnostic — the same Mercury-retrograde sky
 *     yields the same entry for every activity.
 *   - The composer post-processes the PickResult with the activity to attach
 *     an activity-asymmetric severity_hint where the entry warrants one. This
 *     keeps activity asymmetry out of the picker's selection logic (the only
 *     place activity touches downstream output is here).
 *
 * The four asymmetric entry → condition mappings under test:
 *   - closed-mercury-retrograde     → mercury_retrograde
 *   - closed-venus-retrograde       → venus_retrograde
 *   - closed-moon-voc               → moon_voc
 *   - mixed-moon-void-until-noon    → moon_voc_intraday  (pending — undefined)
 * Any other entry id produces no severity_hint.
 */

const pickResult = (overrides: Partial<PickResult> = {}): PickResult => ({
  entry_id: 'good-venus-warm',
  mood: 'good',
  date: '2026-06-02',
  headline: 'A tender day for beginnings.',
  supporting: 'Venus is warm.',
  used_fallback: false,
  ...overrides,
});

describe('severity_hint composition', () => {
  it('asymmetric entry + activity → severity_hint in displayable', () => {
    const out = composeDisplayable({
      picked: pickResult({
        entry_id: 'closed-moon-voc',
        mood: 'closed',
        exclusion_reason: 'moon_voc',
      }),
      moonPhase: 'waxing-crescent',
      activity: 'wedding',
      locale: 'en',
      wasActivityFallback: false,
    });
    expect(out.severity_hint).toMatch(/does not take root/i);
  });

  it('asymmetric entry + travel activity → tolerant hint', () => {
    const out = composeDisplayable({
      picked: pickResult({
        entry_id: 'closed-venus-retrograde',
        mood: 'closed',
        exclusion_reason: 'venus_retrograde',
      }),
      moonPhase: 'waxing-crescent',
      activity: 'travel',
      locale: 'en',
      wasActivityFallback: false,
    });
    expect(out.severity_hint).toMatch(/matters less|fine to take/i);
  });

  it('non-asymmetric entry → no severity_hint', () => {
    const out = composeDisplayable({
      picked: pickResult({ entry_id: 'good-venus-warm' }),
      moonPhase: 'waxing-crescent',
      activity: 'wedding',
      locale: 'en',
      wasActivityFallback: false,
    });
    expect(out.severity_hint).toBeUndefined();
  });

  it('pending-marked entry (intraday VOC) → no severity_hint without includePending', () => {
    const out = composeDisplayable({
      picked: pickResult({
        entry_id: 'mixed-moon-void-until-noon',
        mood: 'mixed',
      }),
      moonPhase: 'waxing-crescent',
      activity: 'wedding',
      locale: 'en',
      wasActivityFallback: false,
    });
    expect(out.severity_hint).toBeUndefined();
  });

  it('passes through the PickResult fields verbatim alongside severity_hint', () => {
    const picked = pickResult({
      entry_id: 'closed-mercury-retrograde',
      mood: 'closed',
      headline: 'Mercury is sleeping.',
      supporting: 'Hold the words.',
      exclusion_reason: 'mercury_retrograde',
    });
    const out = composeDisplayable({
      picked,
      moonPhase: 'full',
      activity: 'contracts',
      locale: 'en',
      wasActivityFallback: false,
    });
    expect(out.entry_id).toBe('closed-mercury-retrograde');
    expect(out.mood).toBe('closed');
    expect(out.headline).toBe('Mercury is sleeping.');
    expect(out.supporting).toBe('Hold the words.');
    expect(out.exclusion_reason).toBe('mercury_retrograde');
    expect(out.moon_phase).toBe('full');
    expect(out.date).toBe('2026-06-02');
    expect(out.used_fallback).toBe(false);
    expect(out.severity_hint).toBeDefined();
  });

  it('asymmetric entry + activity-fallback → diagnostic console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      composeDisplayable({
        picked: pickResult({
          entry_id: 'closed-moon-voc',
          mood: 'closed',
          exclusion_reason: 'moon_voc',
        }),
        moonPhase: 'waxing-crescent',
        activity: 'business_launch',
        locale: 'en',
        wasActivityFallback: true,
      });
      // The warn fires only when BOTH (a) an asymmetric condition matched
      // AND (b) the route fell back to business_launch because the client
      // omitted ?activity=. Either signal alone is uninteresting.
      expect(warn).toHaveBeenCalledWith(
        '[daily-note] severity-hint composed with fallback activity:',
        expect.objectContaining({
          date: '2026-06-02',
          condition: 'moon_voc',
          fallback_activity: 'business_launch',
        }),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('asymmetric entry WITHOUT activity-fallback → no diagnostic warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      composeDisplayable({
        picked: pickResult({
          entry_id: 'closed-moon-voc',
          mood: 'closed',
          exclusion_reason: 'moon_voc',
        }),
        moonPhase: 'waxing-crescent',
        activity: 'wedding',
        locale: 'en',
        wasActivityFallback: false,
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('non-asymmetric entry WITH activity-fallback → no diagnostic warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      composeDisplayable({
        picked: pickResult({ entry_id: 'good-venus-warm' }),
        moonPhase: 'waxing-crescent',
        activity: 'business_launch',
        locale: 'en',
        wasActivityFallback: true,
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
