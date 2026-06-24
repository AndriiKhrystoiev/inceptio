import { describe, it, expect } from 'vitest';
import { FactorSchema, FactorIdSchema, WeightClassSchema, KNOWN_FACTOR_IDS } from '../api/factor';
import { validFactor } from './fixtures';

describe('FactorSchema', () => {
  it('accepts a valid factor', () => {
    expect(FactorSchema.safeParse(validFactor).success).toBe(true);
  });
  it('passes through unknown extra fields', () => {
    const r = FactorSchema.safeParse({ ...validFactor, brand_new_field: 42 });
    expect(r.success).toBe(true);
  });
  it('accepts an unknown factor_id (permissive enum)', () => {
    expect(FactorIdSchema.safeParse('some_new_upstream_id').success).toBe(true);
  });
  it('rejects an empty factor_id', () => {
    expect(FactorIdSchema.safeParse('').success).toBe(false);
  });
  it('rejects an unknown weight_class', () => {
    expect(WeightClassSchema.safeParse('catastrophic').success).toBe(false);
  });
  it('has 15 known factor ids', () => {
    expect(KNOWN_FACTOR_IDS).toHaveLength(15);
  });
});
