import { describe, it, expect } from 'vitest';
import { resolveGrade } from '../grade';

describe('resolveGrade', () => {
  it('passes through each known grade (the API categorical is authoritative)', () => {
    for (const g of ['poor', 'caution', 'fair', 'good', 'strong', 'exceptional'] as const) {
      expect(resolveGrade(g, 50)).toBe(g);
    }
  });

  it('recovers an UNKNOWN grade from the score — the "94 → NOT RECOMMENDED" bug', () => {
    // grade not in KNOWN_GRADES + score 94 must resolve to exceptional, never
    // 'poor'/"NOT RECOMMENDED". Covers case-variants, new upstream buckets, and
    // a missing grade.
    expect(resolveGrade('Exceptional', 94)).toBe('exceptional'); // odd-cased
    expect(resolveGrade('weird_new_bucket', 94)).toBe('exceptional'); // new upstream value
    expect(resolveGrade(undefined, 94)).toBe('exceptional'); // missing
  });

  it('maps an unknown grade through the score → bucket calibration', () => {
    expect(resolveGrade('?', 80)).toBe('strong');
    expect(resolveGrade('?', 65)).toBe('fair');
    expect(resolveGrade('?', 50)).toBe('caution');
    expect(resolveGrade('?', 20)).toBe('poor');
  });

  it('honors the exact CLAUDE.md calibration boundaries', () => {
    expect(resolveGrade('?', 90)).toBe('exceptional');
    expect(resolveGrade('?', 89)).toBe('strong');
    expect(resolveGrade('?', 75)).toBe('strong');
    expect(resolveGrade('?', 74)).toBe('fair');
    expect(resolveGrade('?', 60)).toBe('fair');
    expect(resolveGrade('?', 59)).toBe('caution');
    expect(resolveGrade('?', 40)).toBe('caution');
    expect(resolveGrade('?', 39)).toBe('poor');
  });

  it('falls to neutral fair when the grade is unknown AND no usable score', () => {
    expect(resolveGrade(undefined, undefined)).toBe('fair');
    expect(resolveGrade('?', null)).toBe('fair');
    expect(resolveGrade('?', NaN)).toBe('fair');
  });
});
