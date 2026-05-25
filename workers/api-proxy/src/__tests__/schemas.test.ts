import { describe, it, expect } from 'vitest';
import {
  ElectionalSearchRequestSchema,
  ElectionalSearchResponseSchema,
  FactorIdSchema,
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

  it('rejects unknown fields (strict)', () => {
    const r = ElectionalSearchRequestSchema.safeParse({
      ...validRequest,
      extra: 'nope',
    });
    expect(r.success).toBe(false);
  });
});

describe('FactorIdSchema', () => {
  it('accepts all 15 verified factor ids', () => {
    const ids = [
      'venus_dignified_direct_well_aspected',
      'moon_waxing_increasing_light',
      'moon_applying_to_benefic',
      'house_ruler_dignified_well_placed',
      'asc_and_house_ruler_in_reception_or_aspect',
      'jupiter_angular_or_aspecting',
      'planetary_hour_match',
      'fixed_star_conjunction',
      'house_free_of_malefic',
      'mercury_dignified_direct_not_combust',
      'asc_ruler_strong',
      'jupiter_aspecting_mercury_or_moon',
      'no_malefic_on_angle',
      'part_of_fortune_in_good_house',
      'moon_and_asc_ruler_in_good_aspect',
    ];
    for (const id of ids) {
      expect(FactorIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('rejects unknown factor ids', () => {
    expect(FactorIdSchema.safeParse('venus_combust').success).toBe(false);
  });
});

describe('ReasonIdSchema', () => {
  it('accepts all 8 verified reason ids', () => {
    const ids = [
      'moon_voc',
      'mercury_retrograde',
      'venus_retrograde',
      'saturn_retrograde',
      'eclipse_window',
      'moon_via_combusta',
      'malefic_on_angle',
      'fixed_star_on_angle',
    ];
    for (const id of ids) {
      expect(ReasonIdSchema.safeParse(id).success).toBe(true);
    }
  });
});

describe('ElectionalSearchResponseSchema', () => {
  const validResponse = {
    metadata: {
      cache_hit: false,
      calculation_time_ms: 1234,
      api_version: 'v3',
    },
    summary: {
      viable_windows_count: 2,
      no_viable_windows: false,
      days_blocked_count: 7,
      days_total: 30,
    },
    top_windows: [
      {
        start: '2026-06-21T11:32:00+00:00',
        end: '2026-06-21T13:08:00+00:00',
        duration_minutes: 96,
        score: 72,
        grade: 'fair',
        factors: [
          {
            factor_id: 'venus_dignified_direct_well_aspected',
            weight_class: 'high',
            status: 'pass',
            observation: 'Venus in Leo 9.8 (term, direct)',
          },
        ],
      },
    ],
    heatmap: [
      {
        date: '2026-06-01',
        best_score: 65,
        blocked: false,
        blocked_reason_id: null,
      },
      {
        date: '2026-06-02',
        best_score: null,
        blocked: true,
        blocked_reason_id: 'mercury_retrograde',
      },
    ],
    excluded_ranges: [
      {
        start: '2026-06-15T00:00:00+00:00',
        end: '2026-06-18T00:00:00+00:00',
        reason_id: 'mercury_retrograde',
        label: 'Mercury retrograde — communication needs extra care.',
      },
    ],
  };

  it('accepts a well-formed response', () => {
    const r = ElectionalSearchResponseSchema.safeParse(validResponse);
    if (!r.success) console.error(r.error.format());
    expect(r.success).toBe(true);
  });

  it('rejects unknown top-level fields (strict)', () => {
    const r = ElectionalSearchResponseSchema.safeParse({
      ...validResponse,
      mystery: 1,
    });
    expect(r.success).toBe(false);
  });

  it('rejects score above 100', () => {
    const bad = JSON.parse(JSON.stringify(validResponse));
    bad.top_windows[0].score = 150;
    expect(ElectionalSearchResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('allows no_viable_windows true with caution-grade windows present', () => {
    const data = JSON.parse(JSON.stringify(validResponse));
    data.summary.viable_windows_count = 0;
    data.summary.no_viable_windows = true;
    data.top_windows[0].grade = 'caution';
    expect(ElectionalSearchResponseSchema.safeParse(data).success).toBe(true);
  });
});
