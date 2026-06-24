import { describe, it, expect } from 'vitest';
import { ExcludedRangeSchema, ReasonIdSchema, SeveritySchema, KNOWN_REASON_IDS } from '../api/excluded-range';
import { validExcludedRange } from './fixtures';

describe('ExcludedRangeSchema', () => {
  it('accepts a valid range', () => {
    expect(ExcludedRangeSchema.safeParse(validExcludedRange).success).toBe(true);
  });
  it('accepts an unknown reason_id (permissive)', () => {
    expect(ReasonIdSchema.safeParse('brand_new_reason').success).toBe(true);
  });
  it('rejects an empty reason_id', () => {
    expect(ReasonIdSchema.safeParse('').success).toBe(false);
  });
  it('rejects an unknown severity', () => {
    expect(SeveritySchema.safeParse('mild').success).toBe(false);
  });
  it('includes the mid-2026 upstream reason additions', () => {
    for (const id of ['mercury_combust', 'mars_retrograde', 'jupiter_retrograde']) {
      expect(KNOWN_REASON_IDS).toContain(id);
    }
  });
});
