import { describe, it, expect } from 'vitest';
import { FEATURES } from '../features';

describe('FEATURES', () => {
  it('defaults the card share provider to native-share', () => {
    expect(FEATURES.MOMENT_CARD_SHARE_PROVIDER).toBe('native-share');
  });
  it('keeps the paywall disabled in MVP', () => {
    expect(FEATURES.PAYWALL_ENABLED).toBe(false);
  });
});
