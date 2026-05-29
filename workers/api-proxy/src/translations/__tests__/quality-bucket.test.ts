import { describe, expect, it } from 'vitest';
import { assignBucket } from '../daily-notes/quality-bucket';

describe('assignBucket', () => {
  describe('without excluded ranges', () => {
    it('returns "strong" for scores >= 75', () => {
      expect(assignBucket(75, false)).toBe('strong');
      expect(assignBucket(89, false)).toBe('strong');
      expect(assignBucket(100, false)).toBe('strong');
    });
    it('returns "good" for 60..74', () => {
      expect(assignBucket(60, false)).toBe('good');
      expect(assignBucket(72, false)).toBe('good');
      expect(assignBucket(74, false)).toBe('good');
    });
    it('returns "mixed" for 40..59', () => {
      expect(assignBucket(40, false)).toBe('mixed');
      expect(assignBucket(59, false)).toBe('mixed');
    });
    it('returns "mixed" for raw scores below 40 when no exclusion (per spec §3.2, the "poor" 0-39 band almost never appears without an exclusion; if it does, mixed is the safer copy register)', () => {
      expect(assignBucket(0, false)).toBe('mixed');
      expect(assignBucket(39, false)).toBe('mixed');
    });
  });

  describe('with excluded ranges — precedence rule (spec §4.5 branch 1)', () => {
    it('returns "closed" regardless of raw score when has_named_exclusion is true', () => {
      expect(assignBucket(72, true)).toBe('closed');
      expect(assignBucket(85, true)).toBe('closed');
      expect(assignBucket(0, true)).toBe('closed');
    });
  });
});
