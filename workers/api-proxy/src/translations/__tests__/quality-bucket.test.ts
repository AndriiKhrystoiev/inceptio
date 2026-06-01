import { describe, expect, it } from 'vitest';
import { assignBucket } from '../daily-notes/quality-bucket';

describe('assignBucket', () => {
  describe('no_viable_windows: true — authoritative closed signal', () => {
    it('returns "closed" regardless of score or exclusion presence', () => {
      // The upstream told us the whole day is unworkable. Trust it.
      expect(assignBucket(0, true, false)).toBe('closed');
      expect(assignBucket(0, true, true)).toBe('closed');
      expect(assignBucket(72, true, false)).toBe('closed');
      expect(assignBucket(85, true, true)).toBe('closed');
    });
  });

  describe('no_viable_windows: false, no exclusion — score-band buckets', () => {
    it('returns "strong" for scores >= 75', () => {
      expect(assignBucket(75, false, false)).toBe('strong');
      expect(assignBucket(89, false, false)).toBe('strong');
      expect(assignBucket(100, false, false)).toBe('strong');
    });
    it('returns "good" for 60..74', () => {
      expect(assignBucket(60, false, false)).toBe('good');
      expect(assignBucket(72, false, false)).toBe('good');
      expect(assignBucket(74, false, false)).toBe('good');
    });
    it('returns "mixed" for 40..59', () => {
      expect(assignBucket(40, false, false)).toBe('mixed');
      expect(assignBucket(59, false, false)).toBe('mixed');
    });
    it('returns "mixed" for raw scores below 40 when no exclusion (per spec §3.2)', () => {
      expect(assignBucket(0, false, false)).toBe('mixed');
      expect(assignBucket(39, false, false)).toBe('mixed');
    });
  });

  describe('no_viable_windows: false, named exclusion present — partial-day exclusion routes to mixed', () => {
    // This is the empirical-batch fix (June 2026). A morning Moon-void with
    // a 94-scoring afternoon window is a "positive factors with a caveat"
    // day, not a closed day. Route to mixed regardless of how high the
    // score is, so the §3.3 mixed-bucket entries get to speak.
    it('returns "mixed" when an exclusion is active but top windows remain viable', () => {
      expect(assignBucket(94, false, true)).toBe('mixed');
      expect(assignBucket(72, false, true)).toBe('mixed');
      expect(assignBucket(45, false, true)).toBe('mixed');
      expect(assignBucket(0, false, true)).toBe('mixed');
    });
  });
});
