import type { Factor } from '../api/factor';
import type { ExcludedRange } from '../api/excluded-range';
import type { Window, ApiEnvelope } from '../api/response';

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

export const validWindow: Window = {
  rank: 1,
  start: '2026-07-01T21:30:00+03:00',
  end: '2026-07-01T22:30:00+03:00',
  duration_minutes: 60,
  score: 65,
  grade: 'fair',
  factors: [validFactor],
  cautions: [],
  rationale: 'A tender day for beginnings.',
  summary: null,
  chart_summary: null,
  natal_alignment: null,
  natal_modifier: null,
  personal_advisories: [],
};

export const validEnvelope: ApiEnvelope = {
  success: true,
  data: {
    activity: 'wedding',
    house_system: 'placidus',
    search_window: {},
    summary: {
      total_candidates_evaluated: 100,
      viable_windows_count: 1,
      excluded_ranges_count: 1,
      best_score: 65,
      best_grade: 'fair',
      no_viable_windows: false,
      quality_advisory: null,
    },
    heatmap: [{
      date: { year: 2026, month: 7, day: 1 },
      best_score: 65,
      best_grade: 'fair',
      best_window_start: '2026-07-01T21:30:00+03:00',
      viable_count: 1,
      blocked: false,
      blocked_reasons: [],
    }],
    top_windows: [validWindow],
    excluded_ranges: [validExcludedRange],
  },
  metadata: {
    timestamp: '2026-07-01T00:00:00Z',
    calculation_time_ms: 8,
    api_version: 'v3',
    endpoint: '/electional/search',
    request_id: 'req-1',
    cache_hit: false,
    cache_age_seconds: null,
    credits_used: 5,
    server_location: null,
    calculation_method: null,
  },
  warnings: null,
  pagination: null,
};
