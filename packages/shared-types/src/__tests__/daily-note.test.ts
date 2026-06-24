import { describe, it, expect } from 'vitest';
import {
  DailyNoteOutputSchema, DailyNoteResponseSchema, QualityBucketSchema,
  MoonPhaseSchema, PartOfDayCutoffsSchema,
} from '../api/daily-note';

const validNote = {
  mood: 'good', moon_phase: 'waxing-crescent', date: '2026-07-01',
  headline: 'A tender day.', supporting: 'Venus brings warmth.',
  entry_id: 'e1', used_fallback: false,
};

const validResponse = {
  daily_note: validNote,
  saved_searches: [],
  total_saved_count: 0,
  library_version: '1.0.0',
  part_of_day_cutoffs: { morning_end_hour: 12, afternoon_end_hour: 17, evening_end_hour: 21 },
  cache_hit: false,
};

describe('DailyNoteOutputSchema', () => {
  it('accepts a valid note', () => {
    expect(DailyNoteOutputSchema.safeParse(validNote).success).toBe(true);
  });
  it('rejects a headline over 48 chars', () => {
    expect(DailyNoteOutputSchema.safeParse({ ...validNote, headline: 'x'.repeat(49) }).success).toBe(false);
  });
  it('rejects a non-ISO date', () => {
    expect(DailyNoteOutputSchema.safeParse({ ...validNote, date: '07/01/2026' }).success).toBe(false);
  });
  it('rejects an unknown mood', () => {
    expect(QualityBucketSchema.safeParse('radiant').success).toBe(false);
  });
  it('rejects an unknown moon phase', () => {
    expect(MoonPhaseSchema.safeParse('blue-moon').success).toBe(false);
  });
});

describe('PartOfDayCutoffsSchema', () => {
  it('bounds hours 0..24', () => {
    expect(PartOfDayCutoffsSchema.safeParse({ morning_end_hour: 25, afternoon_end_hour: 17, evening_end_hour: 21 }).success).toBe(false);
  });
});

describe('DailyNoteResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(DailyNoteResponseSchema.safeParse(validResponse).success).toBe(true);
  });
  it('accepts a response without the optional cache_hit', () => {
    const { cache_hit, ...rest } = validResponse;
    expect(DailyNoteResponseSchema.safeParse(rest).success).toBe(true);
  });
});
