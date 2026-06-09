// Pure rating-eligibility policy. Imports nothing native, touches no storage,
// never reads the clock (now is injected). This is the only file the golden
// tests need — and the only file that defines WHEN we may ask for a review.

export type Grade = 'exceptional' | 'strong' | 'good' | 'fair' | 'caution' | 'poor';

export type TriggerEvent =
  | { kind: 'qualifying_save'; grade: Grade; isFirstEverSave: boolean }
  | { kind: 'qualifying_view'; grade: Grade };

export type RatingContext =
  | 'result_view' | 'moment_detail'                 // valid fire surfaces
  | 'no_viable' | 'rate_limited' | 'upstream_quota'
  | 'error' | 'empty' | 'paywall' | 'onboarding' | 'mid_flow';  // suppressed

export type RatingHistory = {
  distinctDayCount: number;
  successfulSearches: number;
  lastAttemptAt: string | null;        // ISO
  attemptsInWindow: string[];          // ISO list; the shell pre-prunes to 365d
  lastFrustrationAt: string | null;    // ISO
};

export type RatingConfig = {
  qualifyingGrades: Grade[];
  minDistinctDays: number;
  minSuccessfulSearches: number;
  minDaysBetweenAttempts: number;
  maxAttemptsPer365d: number;
  frustrationCooldownDays: number;
};

export const RATING_CONFIG: RatingConfig = {
  qualifyingGrades: ['exceptional', 'strong', 'good'],
  minDistinctDays: 2,
  minSuccessfulSearches: 2,
  minDaysBetweenAttempts: 90,
  maxAttemptsPer365d: 2,
  frustrationCooldownDays: 14,
};

export type EligibilityReason =
  | 'eligible' | 'suppressed_context' | 'below_grade_cut'
  | 'first_ever_save' | 'below_floor' | 'frustration_cooldown'
  | 'attempt_cooldown' | 'max_attempts_reached';

export type EligibilityDecision = { shouldAttempt: boolean; reason: EligibilityReason };

const SUPPRESSED: ReadonlySet<RatingContext> = new Set([
  'no_viable', 'rate_limited', 'upstream_quota', 'error', 'empty',
  'paywall', 'onboarding', 'mid_flow',
]);

export const MS_PER_DAY = 86_400_000;

// Elapsed days between an instant and a stored ISO timestamp. Native Date math
// (date-fns is NOT installed). NOT a calendar-day diff — see spec §5/§6 BUG-001
// discipline. A future stored timestamp yields a NEGATIVE result, which every
// `< cooldown` guard reads as "still cooling down" → suppress (EC6).
function elapsedDays(now: Date, storedIso: string): number {
  return (now.getTime() - new Date(storedIso).getTime()) / MS_PER_DAY;
}

export function evaluateRatingEligibility(input: {
  event: TriggerEvent;
  context: RatingContext;
  history: RatingHistory;
  config: RatingConfig;
  now: Date;
}): EligibilityDecision {
  const { event, context, history, config, now } = input;

  if (SUPPRESSED.has(context)) {
    return { shouldAttempt: false, reason: 'suppressed_context' };
  }
  if (!config.qualifyingGrades.includes(event.grade)) {
    return { shouldAttempt: false, reason: 'below_grade_cut' };
  }
  if (event.kind === 'qualifying_save' && event.isFirstEverSave) {
    return { shouldAttempt: false, reason: 'first_ever_save' };
  }
  if (
    history.distinctDayCount < config.minDistinctDays ||
    history.successfulSearches < config.minSuccessfulSearches
  ) {
    return { shouldAttempt: false, reason: 'below_floor' };
  }
  if (
    history.lastFrustrationAt !== null &&
    elapsedDays(now, history.lastFrustrationAt) < config.frustrationCooldownDays
  ) {
    return { shouldAttempt: false, reason: 'frustration_cooldown' };
  }
  if (
    history.lastAttemptAt !== null &&
    elapsedDays(now, history.lastAttemptAt) < config.minDaysBetweenAttempts
  ) {
    return { shouldAttempt: false, reason: 'attempt_cooldown' };
  }
  if (history.attemptsInWindow.length >= config.maxAttemptsPer365d) {
    return { shouldAttempt: false, reason: 'max_attempts_reached' };
  }
  return { shouldAttempt: true, reason: 'eligible' };
}
