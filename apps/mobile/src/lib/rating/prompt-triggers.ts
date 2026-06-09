// Fire-and-forget orchestration: read history → run the pure policy → if
// eligible, attempt the native card. Screens call these at natural breaks.
// No React state — plain async functions (despite the "trigger" name).

import {
  evaluateRatingEligibility, RATING_CONFIG,
  type Grade, type RatingContext, type TriggerEvent, type EligibilityDecision,
} from './eligibility';
import { loadHistory, oncePerKey } from './rating-store';
import { attemptNativeReview } from './store-review';

// Grades arrive from the API typed as z.string() (permissive-enum policy), so
// the screen passes `grade: string`; we cast to Grade at this boundary. A
// non-qualifying value simply fails the grade cut in the pure fn.
// A grade we never qualify, used when the screen has no displayable grade
// (e.g. empty top_windows) so the pure cut returns below_grade_cut, not a throw.
const NON_QUALIFYING: Grade = 'poor';

/** Trigger (a): fires after a successful save of a qualifying-grade moment.
 *  `isFirstEverSave` is read by the CALLER before recordFirstSaveDone(), so the
 *  first-ever save is correctly blocked here. */
export async function maybePromptAfterSave(input: {
  grade: string;
  isFirstEverSave: boolean;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const event: TriggerEvent = {
    kind: 'qualifying_save',
    grade: input.grade as Grade,
    isFirstEverSave: input.isFirstEverSave,
  };
  const decision = evaluateRatingEligibility({
    event, context: 'moment_detail', history: loadHistory(now), config: RATING_CONFIG, now,
  });
  if (decision.shouldAttempt) await attemptNativeReview(now);
}

/** Trigger (b): fires when viewing a qualifying-grade result on a return day.
 *  Idempotent per searchKey (EC10) so cache-hit remounts don't re-attempt. */
export async function maybePromptAfterView(input: {
  grade: string | undefined;
  noViable: boolean;
  searchKey: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  if (!oncePerKey('view-prompt', input.searchKey)) return;
  const context: RatingContext = input.noViable ? 'no_viable' : 'result_view';
  const event: TriggerEvent = {
    kind: 'qualifying_view',
    grade: (input.grade ?? NON_QUALIFYING) as Grade,
  };
  const decision = evaluateRatingEligibility({
    event, context, history: loadHistory(now), config: RATING_CONFIG, now,
  });
  if (decision.shouldAttempt) await attemptNativeReview(now);
}

/** Dev-only (Debug "Force rating eval"): evaluate the policy against current
 *  real history with a synthetic exceptional save; surfaces the reason. */
export function debugEvaluate(now: Date = new Date()): EligibilityDecision {
  return evaluateRatingEligibility({
    event: { kind: 'qualifying_save', grade: 'exceptional', isFirstEverSave: false },
    context: 'moment_detail',
    history: loadHistory(now),
    config: RATING_CONFIG,
    now,
  });
}
