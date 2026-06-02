import { describe, it, expect } from 'vitest';
import { ACTIVITY_NOUNS as MOBILE_NOUNS } from '../lib/activities';
import { ACTIVITY_NOUNS as WORKER_NOUNS } from '../../../../workers/api-proxy/src/translations/dictionary/status-lines';

describe('worker-mirror parity (verify-in-sync contract)', () => {
  it('ACTIVITY_NOUNS in mobile and Worker dictionaries are identical', () => {
    expect(MOBILE_NOUNS).toEqual(WORKER_NOUNS);
  });
});
