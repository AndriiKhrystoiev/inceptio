import { describe, it, expect } from 'vitest';
import { KNOWN_FACTOR_IDS, KNOWN_REASON_IDS } from '@inceptio/shared-types';
import { FACTORS } from '../dictionary/factors';
import { EXCLUDED_REASONS } from '../dictionary/excluded-reasons';

describe('dictionary completeness vs KNOWN_* lists', () => {
  it('every KNOWN_FACTOR_ID has a dictionary entry', () => {
    const missing = KNOWN_FACTOR_IDS.filter((id) => !(id in FACTORS));
    expect(missing, `factors missing translations: ${missing.join(', ')}`).toEqual([]);
  });

  it('every KNOWN_REASON_ID has a dictionary entry', () => {
    const missing = KNOWN_REASON_IDS.filter((id) => !(id in EXCLUDED_REASONS));
    expect(missing, `reasons missing translations: ${missing.join(', ')}`).toEqual([]);
  });
});
