import { describe, it, expect } from 'vitest';
import {
  ApiEnvelopeSchema,
  ElectionalSearchRequestSchema,
  FactorIdSchema,
  GradeSchema,
  KNOWN_FACTOR_IDS,
  KNOWN_GRADES,
  KNOWN_REASON_IDS,
  ReasonIdSchema,
} from '@inceptio/shared-types';

const validRequest = {
  activity: 'wedding',
  start: '2026-06-01',
  end: '2026-06-30',
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
};

describe('ElectionalSearchRequestSchema', () => {
  it('accepts a valid request', () => {
    const r = ElectionalSearchRequestSchema.safeParse(validRequest);
    expect(r.success).toBe(true);
  });

  it('rejects unknown activities', () => {
    const r = ElectionalSearchRequestSchema.safeParse({
      ...validRequest,
      activity: 'surgery',
    });
    expect(r.success).toBe(false);
  });

  it('rejects out-of-range coordinates', () => {
    expect(
      ElectionalSearchRequestSchema.safeParse({ ...validRequest, lat: 100 })
        .success,
    ).toBe(false);
    expect(
      ElectionalSearchRequestSchema.safeParse({ ...validRequest, lng: -200 })
        .success,
    ).toBe(false);
  });

  it('rejects unknown fields (request is .strict() — our contract with mobile)', () => {
    const r = ElectionalSearchRequestSchema.safeParse({
      ...validRequest,
      extra: 'nope',
    });
    expect(r.success).toBe(false);
  });
});

describe('FactorIdSchema (permissive — see KNOWN_FACTOR_IDS)', () => {
  it('accepts every id in KNOWN_FACTOR_IDS', () => {
    for (const id of KNOWN_FACTOR_IDS) {
      expect(FactorIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('accepts unknown factor ids (translation falls back + logs)', () => {
    // Permissive policy: upstream has added new factor_ids without notice.
    // The translator handles unknowns via a generic phrasing + console.warn.
    expect(FactorIdSchema.safeParse('venus_combust').success).toBe(true);
    expect(FactorIdSchema.safeParse('totally_new_2027_factor').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(FactorIdSchema.safeParse('').success).toBe(false);
  });
});

describe('ReasonIdSchema (permissive — see KNOWN_REASON_IDS)', () => {
  it('accepts every id in KNOWN_REASON_IDS', () => {
    for (const id of KNOWN_REASON_IDS) {
      expect(ReasonIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('accepts unknown reason ids (translation falls back + logs)', () => {
    expect(ReasonIdSchema.safeParse('pluto_retrograde').success).toBe(true);
    expect(ReasonIdSchema.safeParse('totally_new_2027_reason').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(ReasonIdSchema.safeParse('').success).toBe(false);
  });
});

describe('GradeSchema (permissive — see KNOWN_GRADES)', () => {
  it('accepts every grade in KNOWN_GRADES', () => {
    for (const grade of KNOWN_GRADES) {
      expect(GradeSchema.safeParse(grade).success).toBe(true);
    }
  });

  it('accepts unknown grades (UI falls back to default)', () => {
    expect(GradeSchema.safeParse('legendary').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(GradeSchema.safeParse('').success).toBe(false);
  });
});

describe('ApiEnvelopeSchema (upstream response, passthrough)', () => {
  // Shape mirrors what real astrology-api.io v3 returns: envelope wrapping
  // { data, metadata, warnings, pagination }.
  const validResponse = {
    success: true,
    data: {
      activity: 'wedding',
      house_system: 'whole_sign',
      search_window: { echoed: 'whatever' },
      summary: {
        total_candidates_evaluated: 720,
        viable_windows_count: 2,
        excluded_ranges_count: 1,
        best_score: 72,
        best_grade: 'fair',
        no_viable_windows: false,
        quality_advisory: null,
      },
      heatmap: [
        {
          date: { year: 2026, month: 6, day: 1 },
          best_score: 65,
          best_grade: 'fair',
          best_window_start: '2026-06-01T14:00:00+00:00',
          viable_count: 1,
          blocked: false,
          blocked_reasons: [],
        },
        {
          date: { year: 2026, month: 6, day: 2 },
          best_score: 0,
          best_grade: 'poor',
          best_window_start: null,
          viable_count: 0,
          blocked: true,
          blocked_reasons: ['mercury_retrograde', 'moon_voc'],
        },
      ],
      top_windows: [
        {
          rank: 1,
          start: '2026-06-21T11:32:00+00:00',
          end: '2026-06-21T13:08:00+00:00',
          duration_minutes: 96,
          score: 72,
          grade: 'fair',
          factors: [
            {
              factor_id: 'venus_dignified_direct_well_aspected',
              category: 'electional',
              observation: 'Venus in Leo 9.8 (term, direct)',
              contribution: 15.58,
              weight_class: 'high',
              status: 'pass',
              score: 18,
              rationale_short: 'Venus is dignified and direct.',
              details: { sign: 'leo', degree: 9.8, dignity: 'term' },
            },
            {
              factor_id: 'moon_applying_to_benefic',
              category: 'electional',
              observation: 'No aspect formed in window.',
              contribution: 0,
              weight_class: 'medium',
              status: 'fail',
              score: 0,
              rationale_short: 'No applying aspect.',
              details: null,
            },
          ],
          cautions: [],
          rationale: 'Grade: WindowGrade.FAIR.',
          summary: null,
          chart_summary: null,
          natal_alignment: null,
          natal_modifier: null,
          personal_advisories: [],
        },
      ],
      excluded_ranges: [
        {
          from: '2026-06-15T00:00:00+00:00',
          to: '2026-06-18T00:00:00+00:00',
          reason_id: 'mercury_retrograde',
          severity: 'medium',
          label: 'Mercury retrograde — communication needs extra care.',
          applies_to_activity: true,
        },
      ],
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
    },
    warnings: null,
    pagination: null,
  };

  it('accepts a well-formed envelope', () => {
    const r = ApiEnvelopeSchema.safeParse(validResponse);
    if (!r.success) console.error(JSON.stringify(r.error.issues, null, 2));
    expect(r.success).toBe(true);
  });

  it('accepts unknown top-level fields (passthrough — upstream may add fields)', () => {
    const r = ApiEnvelopeSchema.safeParse({
      ...validResponse,
      future_field: 'should pass',
    });
    expect(r.success).toBe(true);
  });

  it('accepts unknown metadata fields (passthrough)', () => {
    const r = ApiEnvelopeSchema.safeParse({
      ...validResponse,
      metadata: { ...validResponse.metadata, new_field: 'ok' },
    });
    expect(r.success).toBe(true);
  });

  it('rejects score above 100', () => {
    const bad = JSON.parse(JSON.stringify(validResponse));
    bad.data.top_windows[0].score = 150;
    expect(ApiEnvelopeSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts no_viable_windows true with caution-grade windows present', () => {
    const data = JSON.parse(JSON.stringify(validResponse));
    data.data.summary.viable_windows_count = 0;
    data.data.summary.no_viable_windows = true;
    data.data.top_windows[0].grade = 'caution';
    const r = ApiEnvelopeSchema.safeParse(data);
    if (!r.success) console.error(JSON.stringify(r.error.issues, null, 2));
    expect(r.success).toBe(true);
  });

  it('accepts a factor with null details', () => {
    const data = JSON.parse(JSON.stringify(validResponse));
    // The second factor in the fixture already has details: null. Just verify
    // the whole envelope parses.
    expect(ApiEnvelopeSchema.safeParse(data).success).toBe(true);
  });

  it('accepts blocked_reasons as multiple ReasonIds', () => {
    const r = ApiEnvelopeSchema.safeParse(validResponse);
    expect(r.success).toBe(true);
  });
});
