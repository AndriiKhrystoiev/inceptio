import { describe, expect, it } from 'vitest';
import { lintPhrase } from '../daily-notes/lint';
import { BOUNDARY_FIXTURES } from './boundary-tests.golden';

describe('boundary tests — five tests + 3-day rule + surface asymmetry', () => {
  it.each(BOUNDARY_FIXTURES)(
    '$id ($expected) — $reason',
    ({ surface, phrase, today_offset_days, expected }) => {
      const result = lintPhrase({ surface, phrase, today_offset_days });
      if (expected === 'pass') {
        expect(result.ok).toBe(true);
      } else {
        expect(result.ok).toBe(false);
      }
    },
  );
});
