import { describe, it, expect } from 'vitest';
import {
  ApiEnvelopeSchema, ApiDataSchema, WindowSchema, ScoreSchema, GradeSchema, KNOWN_GRADES,
} from '../api/response';
import { validEnvelope, validWindow } from './fixtures';

describe('ApiEnvelopeSchema', () => {
  it('accepts a full valid envelope', () => {
    expect(ApiEnvelopeSchema.safeParse(validEnvelope).success).toBe(true);
  });
  it('passes through unknown top-level fields', () => {
    expect(ApiEnvelopeSchema.safeParse({ ...validEnvelope, extra: 1 }).success).toBe(true);
  });
  it('rejects when data is missing', () => {
    const { data, ...rest } = validEnvelope;
    expect(ApiEnvelopeSchema.safeParse(rest).success).toBe(false);
  });
});

describe('ApiDataSchema', () => {
  it('rejects a deferred activity', () => {
    expect(ApiDataSchema.safeParse({ ...validEnvelope.data, activity: 'surgery' }).success).toBe(false);
  });
});

describe('WindowSchema', () => {
  it('accepts a valid window', () => {
    expect(WindowSchema.safeParse(validWindow).success).toBe(true);
  });
  it('rejects duration_minutes < 1', () => {
    expect(WindowSchema.safeParse({ ...validWindow, duration_minutes: 0 }).success).toBe(false);
  });
});

describe('ScoreSchema + GradeSchema', () => {
  it('bounds score to 0..100 ints', () => {
    expect(ScoreSchema.safeParse(72).success).toBe(true);
    expect(ScoreSchema.safeParse(101).success).toBe(false);
    expect(ScoreSchema.safeParse(50.5).success).toBe(false);
  });
  it('accepts an unknown grade (permissive) and lists the known grades', () => {
    expect(GradeSchema.safeParse('mythic').success).toBe(true);
    expect(KNOWN_GRADES).toContain('good');
  });
});
