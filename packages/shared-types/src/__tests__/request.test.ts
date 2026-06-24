import { describe, it, expect } from 'vitest';
import { ActivitySchema, ElectionalSearchRequestSchema } from '../api/request';

const valid = {
  activity: 'wedding', start: '2026-07-01', end: '2026-07-31',
  lat: 50.45, lng: 30.52, timezone: 'Europe/Kyiv', city: 'Kyiv',
};

describe('ActivitySchema', () => {
  it('accepts the four MVP activities', () => {
    for (const a of ['wedding', 'contracts', 'business_launch', 'travel']) {
      expect(ActivitySchema.safeParse(a).success).toBe(true);
    }
  });
  it('rejects a deferred activity', () => {
    expect(ActivitySchema.safeParse('surgery').success).toBe(false);
  });
});

describe('ElectionalSearchRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(ElectionalSearchRequestSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects an out-of-range lat', () => {
    expect(ElectionalSearchRequestSchema.safeParse({ ...valid, lat: 91 }).success).toBe(false);
  });
  it('rejects a too-short start date', () => {
    expect(ElectionalSearchRequestSchema.safeParse({ ...valid, start: '2026' }).success).toBe(false);
  });
  it('rejects unknown extra keys (.strict)', () => {
    expect(ElectionalSearchRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });
});
