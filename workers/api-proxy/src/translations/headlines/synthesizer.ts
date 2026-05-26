import type {
  Activity,
  Factor,
  FactorId,
  FactorStatus,
  WeightClass,
  Window,
} from '@inceptio/shared-types';
import { translateFactor } from '../translate';
import {
  GENERIC_HEADLINE_STEMS,
  HEADLINES,
  NO_VIABLE_HEADLINES,
} from './headlines';

// weight_class is primary. Comparator returns negative when `a` outranks `b`,
// so we want higher weight first.
const WEIGHT_RANK: Record<WeightClass, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

// Within (weight_class, contribution) tier, pass beats partial beats fail.
// Fail is never selected as the lead (see `rankFactors` filter).
const STATUS_RANK: Record<FactorStatus, number> = {
  fail: 0,
  partial: 1,
  pass: 2,
};

/**
 * Comparator implementing decisions 4a/4b/4c from
 * `docs/translation-layer-design.md`:
 *
 *   weight_class desc → contribution desc → status desc → API order
 *
 * Stable sort preserves API order for ties.
 */
export function compareFactors(a: Factor, b: Factor): number {
  const w = WEIGHT_RANK[b.weight_class] - WEIGHT_RANK[a.weight_class];
  if (w !== 0) return w;
  const c = b.contribution - a.contribution;
  if (c !== 0) return c;
  return STATUS_RANK[b.status] - STATUS_RANK[a.status];
}

/** Ranked factors with `fail` removed — the candidate pool for the lead. */
export function rankFactors(factors: readonly Factor[]): Factor[] {
  return [...factors]
    .sort(compareFactors)
    .filter((f) => f.status !== 'fail');
}

export interface SynthesizeOpts {
  topWindow: Window;
  activity: Activity;
  noViableWindows: boolean;
}

/**
 * Produce the headline string for the L1 surface.
 *
 * When `noViableWindows` is true, returns the stock per-activity headline
 * directly — we never synthesize from `fail` factors (decision 8).
 */
export function synthesizeHeadline({
  topWindow,
  activity,
  noViableWindows,
}: SynthesizeOpts): string {
  if (noViableWindows) {
    return NO_VIABLE_HEADLINES[activity];
  }

  const candidates = rankFactors(topWindow.factors);
  const lead = candidates[0];
  if (!lead) {
    // Every factor failed despite no_viable_windows being false. Defensive.
    return NO_VIABLE_HEADLINES[activity];
  }

  // `lead.factor_id` is `string` (permissive schema); the HEADLINES table is
  // keyed by KNOWN_FACTOR_IDS. An unknown id simply misses the lookup and
  // falls through to the generic stem below.
  const hand = HEADLINES[activity]?.[lead.factor_id as FactorId]?.[lead.status];
  if (hand) return hand;

  const phrasing = translateFactor(lead.factor_id, lead.status, activity);
  return GENERIC_HEADLINE_STEMS[activity](phrasing.phrase_short);
}
