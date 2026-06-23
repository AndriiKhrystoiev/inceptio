import type {
  ApiEnvelope,
  ExcludedRange,
  Factor,
  HeatmapDay,
  Window,
} from '@inceptio/shared-types';

export const factor = (overrides: Partial<Factor> = {}): Factor => ({
  factor_id: 'venus_dignified_direct_well_aspected',
  category: 'electional',
  observation: 'Venus in Leo 9.8 (term, direct)',
  contribution: 15.58,
  weight_class: 'high',
  status: 'pass',
  score: 18,
  rationale_short: 'Venus is dignified and direct.',
  details: { sign: 'leo', degree: 9.8, dignity: 'term', retrograde: false },
  ...overrides,
});

export const window_ = (overrides: Partial<Window> = {}): Window => ({
  rank: 1,
  start: '2026-06-21T11:32:00+00:00',
  end: '2026-06-21T13:08:00+00:00',
  duration_minutes: 96,
  score: 72,
  grade: 'fair',
  factors: [factor()],
  cautions: [],
  rationale: 'Grade: WindowGrade.FAIR.',
  summary: null,
  chart_summary: null,
  natal_alignment: null,
  natal_modifier: null,
  personal_advisories: [],
  ...overrides,
});

export const heatmapDay = (overrides: Partial<HeatmapDay> = {}): HeatmapDay => ({
  date: { year: 2026, month: 6, day: 1 },
  best_score: 65,
  best_grade: 'fair',
  best_window_start: '2026-06-01T14:00:00+00:00',
  viable_count: 1,
  blocked: false,
  blocked_reasons: [],
  ...overrides,
});

export const excludedRange = (
  overrides: Partial<ExcludedRange> = {},
): ExcludedRange => ({
  from: '2026-06-15T00:00:00+00:00',
  to: '2026-06-18T00:00:00+00:00',
  reason_id: 'mercury_retrograde',
  severity: 'medium',
  label: 'Mercury retrograde — communication needs extra care.',
  applies_to_activity: true,
  ...overrides,
});

/**
 * Wrap data fields in the v3 envelope. Defaults represent a viable wedding
 * search in Kyiv with a Venus-led top window.
 */
export const envelope = (
  data: Partial<ApiEnvelope['data']> = {},
  metaOverrides: Partial<ApiEnvelope['metadata']> = {},
): ApiEnvelope => ({
  success: true,
  data: {
    activity: 'wedding',
    house_system: 'whole_sign',
    search_window: {},
    summary: {
      total_candidates_evaluated: 720,
      viable_windows_count: 2,
      excluded_ranges_count: 1,
      best_score: 72,
      best_grade: 'fair',
      no_viable_windows: false,
      quality_advisory: null,
    },
    heatmap: [heatmapDay()],
    top_windows: [
      window_({
        factors: [
          factor({
            factor_id: 'venus_dignified_direct_well_aspected',
            weight_class: 'high',
            status: 'pass',
            contribution: 15.58,
          }),
          factor({
            factor_id: 'moon_waxing_increasing_light',
            weight_class: 'medium',
            status: 'pass',
            contribution: 9.4,
            details: null,
          }),
          factor({
            factor_id: 'mercury_dignified_direct_not_combust',
            weight_class: 'low',
            status: 'fail',
            contribution: 1.2,
            observation: 'Mercury combust',
            details: { combust: true, retrograde: false },
          }),
        ],
      }),
    ],
    excluded_ranges: [excludedRange()],
    ...data,
  },
  metadata: {
    timestamp: '2026-05-25T18:00:00Z',
    calculation_time_ms: 1234,
    api_version: 'v3',
    endpoint: '/electional/search',
    request_id: 'req_test_abc',
    cache_hit: false,
    cache_age_seconds: null,
    credits_used: 5,
    server_location: 'iad1',
    calculation_method: 'pass-1+pass-2',
    ...metaOverrides,
  },
  warnings: null,
  pagination: null,
});

/** Backwards-compat aliases for callsites that use the prior fixture names. */
export const viableResponse = (
  overrides: Partial<ApiEnvelope['data']> = {},
): ApiEnvelope => envelope(overrides);

export const noViableResponse = (): ApiEnvelope =>
  envelope({
    summary: {
      total_candidates_evaluated: 168,
      viable_windows_count: 0,
      excluded_ranges_count: 0,
      best_score: 42,
      best_grade: 'caution',
      no_viable_windows: true,
      quality_advisory: null,
    },
    top_windows: [
      window_({
        rank: 1,
        grade: 'caution',
        score: 42,
        factors: [
          factor({
            status: 'partial',
            weight_class: 'medium',
            contribution: 6.1,
          }),
        ],
      }),
    ],
    heatmap: [],
    excluded_ranges: [],
  });
