import { KNOWN_GRADES, type Grade } from '@inceptio/shared-types';

const KNOWN = new Set<string>(KNOWN_GRADES);

/**
 * Normalize a window's grade for display.
 *
 * A KNOWN grade (one of `KNOWN_GRADES`) is authoritative — it's the API's own
 * categorical judgment of the score, so we trust it. An unknown / missing /
 * odd-cased grade is RECOVERED from the score using CLAUDE.md's calibration,
 * so a high score never renders as a low grade.
 *
 * Why this exists: `GradeSchema` is permissive (`z.string()`), and the three
 * grade→label surfaces (MomentDetail `gradeToScorePill`, `StatusLine.gradeKey`,
 * `ResultsListView.gradeLabel`) each defaulted an unmapped grade to `'poor'` /
 * "NOT RECOMMENDED" — so a score-94 window whose grade wasn't in our enum showed
 * "NOT RECOMMENDED" next to the 94. Resolving the grade from the score here, at
 * the call site (where the score is available), makes every surface agree and
 * never contradict the number.
 *
 * With neither a known grade nor a usable score, fall to the neutral `'fair'`
 * (never the alarming `'poor'`). A known grade that grossly contradicts the
 * score would be an upstream data issue, intentionally out of scope here — we
 * don't override the API's own categorical.
 */
export function resolveGrade(grade: unknown, score?: number | null): Grade {
  if (typeof grade === 'string' && KNOWN.has(grade)) return grade as Grade;
  if (typeof score === 'number' && Number.isFinite(score)) {
    if (score >= 90) return 'exceptional';
    if (score >= 75) return 'strong';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'caution';
    return 'poor';
  }
  return 'fair';
}
