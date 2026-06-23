import type { QualityBucket } from '../types';

/**
 * Map a top-window score + presence-of-named-exclusion + upstream's
 * `summary.no_viable_windows` flag to a daily-note quality bucket.
 *
 * The `no_viable_windows` flag is the AUTHORITATIVE closed signal — it
 * means upstream determined no viable elections exist anywhere in today.
 * Named exclusions ALONE no longer force closed: an active exclusion with
 * `no_viable_windows: false` means a partial-day exclusion (e.g. morning
 * Moon-void with viable afternoon windows). For those days we route through
 * the mixed bucket, whose voice-spec entries (§3.3 #10-14) are designed for
 * "positive factors with a caveat" — structurally what a partial-exclusion
 * day IS.
 *
 * Bucket thresholds (when no_viable_windows is false AND no exclusion):
 *  - strong: 75+         (rare in real data)
 *  - good:   60..74      (the realistic win; design's emotional target)
 *  - mixed:  0..59       (collapses raw "poor" 0-39 into mixed for copy register)
 *
 * History: the original spec §4.5 branch 1 ("any named exclusion → closed")
 * assumed all exclusions were day-dominating. Empirical batch (June 2026, 30
 * Kyiv dates) showed partial-day Moon-VoC is the majority case — 9/19
 * moon_voc-marked days had viable top_windows scoring 80-94 outside the
 * void period. Routing those through the closed bucket misclassified
 * good/excellent days as closed and concentrated the daily note on a single
 * repeated headline ("The Moon is between signs today"). See voice spec's
 * "Post-MVP empirical discoveries" section.
 */
export function assignBucket(
  topScore: number,
  noViableWindows: boolean,
  hasNamedExclusion: boolean,
): QualityBucket {
  if (noViableWindows) return 'closed';
  if (hasNamedExclusion) return 'mixed';
  if (topScore >= 75) return 'strong';
  if (topScore >= 60) return 'good';
  return 'mixed';
}
