import { describe, it, expect } from 'vitest';
import {
  evaluateRatingEligibility,
  RATING_CONFIG,
  type RatingHistory,
  type TriggerEvent,
  type RatingContext,
} from '../eligibility';

const NOW = new Date('2026-06-09T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

// A history that passes every guard — start here and break one thing per case.
const HEALTHY: RatingHistory = {
  distinctDayCount: 5,
  successfulSearches: 5,
  lastAttemptAt: null,
  attemptsInWindow: [],
  lastFrustrationAt: null,
};
const SAVE: TriggerEvent = { kind: 'qualifying_save', grade: 'exceptional', isFirstEverSave: false };

function evl(over: Partial<{
  event: TriggerEvent; context: RatingContext; history: RatingHistory;
}> = {}) {
  return evaluateRatingEligibility({
    event: over.event ?? SAVE,
    context: over.context ?? 'moment_detail',
    history: over.history ?? HEALTHY,
    config: RATING_CONFIG,
    now: NOW,
  });
}

describe('evaluateRatingEligibility — one row per reason', () => {
  it('eligible: healthy save passes (null cooldown fields do not throw)', () => {
    expect(evl()).toEqual({ shouldAttempt: true, reason: 'eligible' });
  });

  it('suppressed_context: every suppressed surface short-circuits first', () => {
    for (const c of ['no_viable', 'rate_limited', 'upstream_quota', 'error', 'empty', 'paywall', 'onboarding', 'mid_flow'] as RatingContext[]) {
      expect(evl({ context: c })).toEqual({ shouldAttempt: false, reason: 'suppressed_context' });
    }
  });

  it('below_grade_cut: fair/caution/poor never qualify; good/strong/exceptional do', () => {
    for (const g of ['fair', 'caution', 'poor'] as const) {
      expect(evl({ event: { kind: 'qualifying_view', grade: g } }).reason).toBe('below_grade_cut');
    }
    for (const g of ['good', 'strong', 'exceptional'] as const) {
      expect(evl({ event: { kind: 'qualifying_view', grade: g } }).shouldAttempt).toBe(true);
    }
  });

  it('first_ever_save: the very first save never prompts even if exceptional', () => {
    expect(evl({ event: { kind: 'qualifying_save', grade: 'exceptional', isFirstEverSave: true } }))
      .toEqual({ shouldAttempt: false, reason: 'first_ever_save' });
  });

  it('below_floor: needs >=2 distinct days AND >=2 searches (boundary = eligible)', () => {
    expect(evl({ history: { ...HEALTHY, distinctDayCount: 1 } }).reason).toBe('below_floor');
    expect(evl({ history: { ...HEALTHY, successfulSearches: 1 } }).reason).toBe('below_floor');
    expect(evl({ history: { ...HEALTHY, distinctDayCount: 2, successfulSearches: 2 } }).shouldAttempt).toBe(true);
  });

  it('frustration_cooldown: 14d window, exact threshold is eligible (< guard)', () => {
    expect(evl({ history: { ...HEALTHY, lastFrustrationAt: daysAgo(13) } }).reason).toBe('frustration_cooldown');
    expect(evl({ history: { ...HEALTHY, lastFrustrationAt: daysAgo(14) } }).shouldAttempt).toBe(true);
  });

  it('attempt_cooldown: 90d window, exact threshold is eligible', () => {
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAgo(89), attemptsInWindow: [daysAgo(89)] } }).reason).toBe('attempt_cooldown');
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAgo(90), attemptsInWindow: [daysAgo(90)] } }).shouldAttempt).toBe(true);
  });

  it('max_attempts_reached: 2 attempts in window blocks even past the cooldown', () => {
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAgo(120), attemptsInWindow: [daysAgo(120), daysAgo(200)] } }))
      .toEqual({ shouldAttempt: false, reason: 'max_attempts_reached' });
  });

  it('EC6 backward clock skew: a future timestamp suppresses, never enables', () => {
    expect(evl({ history: { ...HEALTHY, lastFrustrationAt: daysAhead(5) } }).reason).toBe('frustration_cooldown');
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAhead(5), attemptsInWindow: [daysAhead(5)] } }).reason).toBe('attempt_cooldown');
  });
});
