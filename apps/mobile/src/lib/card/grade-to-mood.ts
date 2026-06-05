// Single-source grade → mood-key mapping for the Moment Card. The app has NO
// canonical score→mood helper (ScorePill/StatusLine/daily-note each differ),
// so this is the one place the card derives its tier. RULES (spec §7a):
//   - good AND fair both land in the WIN tier → 'good' (violet halo). 60–74 is
//     a win in this product; the card must never print "Fair".
//   - never route through StatusLine (it hard-codes 'FAIR · GOOD WINDOW').
//   - consume the already-bucketed grade; on an unknown upstream value fall
//     back to a neutral 'mixed' rather than blanking the card (enum drift).
export type MoodKey = 'strong' | 'good' | 'mixed' | 'closed';

const GRADE_TO_MOOD: Record<string, MoodKey> = {
  exceptional: 'strong',
  strong: 'strong',
  good: 'good',
  fair: 'good',
  caution: 'mixed',
  poor: 'closed',
};

export function gradeToMood(grade: string | undefined | null): MoodKey {
  return (grade && GRADE_TO_MOOD[grade]) || 'mixed';
}
