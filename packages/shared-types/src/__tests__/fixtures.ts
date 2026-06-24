import type { Factor } from '../api/factor';
import type { ExcludedRange } from '../api/excluded-range';

export const validFactor: Factor = {
  factor_id: 'venus_dignified_direct_well_aspected',
  category: 'electional',
  observation: 'Venus in Leo 9.8° (term, direct)',
  contribution: 15.58,
  weight_class: 'high',
  status: 'pass',
  score: 80,
  rationale_short: 'Venus is strong.',
  details: null,
};

export const validExcludedRange: ExcludedRange = {
  from: '2026-10-01T00:00:00+03:00',
  to: '2026-11-15T00:00:00+03:00',
  reason_id: 'venus_retrograde',
  severity: 'hard_stop',
  label: 'Venus retrograde — not a season for new commitments.',
  applies_to_activity: true,
};
