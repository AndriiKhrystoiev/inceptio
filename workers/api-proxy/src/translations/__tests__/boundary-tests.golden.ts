import type { Surface } from '../types';

/**
 * Boundary-test fixtures — see spec §5.4 and §2.1.
 *
 * The `phrase` strings in must-fail fixtures are NEGATIVE EXAMPLES showing
 * what the lint must reject. They are NOT current §3.3 library entries.
 * Several mirror pre-hardening versions of current entries to guard against
 * regression to the §3.4-removed phrasings.
 *
 * `today_offset_days` is the day-distance from "today" to the named day
 * referenced in `phrase` (where applicable). null when not applicable.
 */
export interface BoundaryFixture {
  id: string;
  surface: Surface;
  phrase: string;
  today_offset_days: number | null;
  expected: 'pass' | 'fail';
  reason: string;
}

export const BOUNDARY_FIXTURES: BoundaryFixture[] = [
  // ─── Must-PASS fixtures ───
  {
    id: 'lint-pass-statusline-5day-named-day',
    surface: 'status-line',
    phrase: 'Wedding window — Tuesday.',
    today_offset_days: 5,
    expected: 'pass',
    reason:
      'Status lines are user-opted-in; the 3-day rule applies only to the daily-note surface.',
  },
  {
    id: 'lint-pass-dailynote-2day-named-day',
    surface: 'daily-note',
    phrase:
      'Words need extra care until Thursday — hold the heavy signing for clearer days.',
    today_offset_days: 2,
    expected: 'pass',
    reason: 'Concrete horizon <= 3 days; allowed.',
  },
  {
    id: 'lint-pass-dailynote-vague-fallback',
    surface: 'daily-note',
    phrase:
      'Words need extra care for now — hold the heavy signing for clearer days.',
    today_offset_days: null,
    expected: 'pass',
    reason: 'Vague horizon; always allowed.',
  },
  {
    id: 'lint-pass-statusline-late-month',
    surface: 'status-line',
    phrase: 'Wedding window — late November.',
    today_offset_days: 180,
    expected: 'pass',
    reason: 'Status-line surface exempt from 3-day rule.',
  },

  // ─── Must-FAIL fixtures ───
  // NEGATIVE EXAMPLES — see comment in spec §5.4.
  {
    id: 'lint-fail-dailynote-5day-named-day',
    surface: 'daily-note',
    phrase:
      'Words need extra care until Tuesday — hold the heavy signing for clearer days.',
    today_offset_days: 5,
    expected: 'fail',
    reason: 'Concrete horizon > 3 days on daily-note surface; must render vague fallback.',
  },
  {
    id: 'lint-fail-dailynote-next-week',
    surface: 'daily-note',
    phrase: 'Hold the big proposals for next week.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden phrase 'next week' on daily-note surface.",
  },
  {
    id: 'lint-fail-dailynote-this-season',
    surface: 'daily-note',
    phrase: 'Venus is resting this season.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden phrase 'this season' on daily-note surface.",
  },
  {
    id: 'lint-fail-dailynote-imperative-inner-state',
    surface: 'daily-note',
    phrase: "Embrace today's quiet — be present with what is.",
    today_offset_days: null,
    expected: 'fail',
    reason: 'Imperatives about inner state fail the subject test (§2.1).',
  },
  {
    id: 'lint-fail-dailynote-forbidden-universe',
    surface: 'daily-note',
    phrase: 'The universe wants you to begin today.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden subject 'the universe' (§2.1 test 1).",
  },
  {
    id: 'lint-fail-dailynote-forbidden-luck',
    surface: 'daily-note',
    phrase: 'Luck is on your side today.',
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden word 'luck' (§2.1 test 5).",
  },
  {
    id: 'lint-fail-dailynote-mood-prediction',
    surface: 'daily-note',
    phrase: "You'll feel confident today.",
    today_offset_days: null,
    expected: 'fail',
    reason: "Forbidden mood-prediction construction 'you'll feel' (§2.1 test 5).",
  },
];
