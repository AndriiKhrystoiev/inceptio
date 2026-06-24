import { describe, it, expect } from 'vitest';
import { parseSemver, compareSemver } from '../semver';

describe('parseSemver', () => {
  const ok: Array<[string, [number, number, number]]> = [
    ['1.2.3', [1, 2, 3]],
    ['v1.2.3', [1, 2, 3]],
    [' 1.2.3 ', [1, 2, 3]],
    ['1.2.3-beta.1', [1, 2, 3]],
    ['1.2.3+42', [1, 2, 3]],
    ['0.0.0', [0, 0, 0]],
  ];
  it.each(ok)('parses %s', (input, [major, minor, patch]) => {
    expect(parseSemver(input)).toEqual({ major, minor, patch });
  });
  const bad = ['1.2', '1', '', 'abc', '1.2.x', '1.2.3.4'];
  it.each(bad)('rejects %s → null', (input) => {
    expect(parseSemver(input)).toBeNull();
  });
  it.each([null, undefined, 2, {}])('rejects non-string %s → null', (input) => {
    expect(parseSemver(input as unknown)).toBeNull();
  });
  it('rejects a component that parses past Number.MAX_SAFE_INTEGER → null', () => {
    // Matches the regex (three digit groups) but the major overflows a safe
    // integer, exercising the Number.isSafeInteger guard (semver.ts:17-19).
    expect(parseSemver('99999999999999999999.0.0')).toBeNull();
  });
});

describe('compareSemver', () => {
  const v = (s: string) => parseSemver(s)!;
  it('orders major', () => { expect(compareSemver(v('2.0.0'), v('1.9.9'))).toBe(1); });
  it('orders minor', () => { expect(compareSemver(v('1.2.0'), v('1.3.0'))).toBe(-1); });
  it('orders patch', () => { expect(compareSemver(v('1.2.3'), v('1.2.4'))).toBe(-1); });
  it('equal', () => { expect(compareSemver(v('1.2.3'), v('1.2.3'))).toBe(0); });
});
