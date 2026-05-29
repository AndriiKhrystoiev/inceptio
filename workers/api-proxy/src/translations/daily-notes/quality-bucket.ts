import type { QualityBucket } from '../types';

/**
 * Map a top-window score (0-100) + presence-of-named-exclusion to a daily-note
 * quality bucket — see spec §3.2 and the §4.5 branch-1-wins precedence rule
 * (named exclusion beats raw-score weakness; this is NOT provisional).
 *
 * Bucket thresholds:
 *  - strong: 75+         (rare in real data)
 *  - good:   60..74      (the realistic win; design's emotional target)
 *  - mixed:  0..59       (collapses raw "poor" 0-39 into mixed for copy register)
 *  - closed: any score with an active excluded range covering today
 */
export function assignBucket(
  topScore: number,
  hasNamedExclusion: boolean,
): QualityBucket {
  if (hasNamedExclusion) return 'closed';
  if (topScore >= 75) return 'strong';
  if (topScore >= 60) return 'good';
  return 'mixed';
}
