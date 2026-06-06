import { describe, it, expect, vi } from 'vitest';

// react-native isn't parseable in the node test env (transitive import via
// error-messages.ts → ./api → src/config/api.ts → Platform.OS). Same escape
// hatch as post-alert-ack.test.ts.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

// __DEV__ is an RN-injected global config/api.ts reads at module-eval time, so
// it must exist before any import resolves. vi.hoisted runs before the imports.
vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

// device-id pulls in MMKV/expo-modules-core (unparseable in node); mock it.
vi.mock('../device-id', () => ({
  getDeviceId: vi.fn(async () => 'test-device-id-abc'),
}));

import { friendlyMessage } from '../error-messages';
import {
  RateLimitError,
  UpstreamQuotaError,
  NetworkError,
} from '../api';

describe('friendlyMessage — capped state', () => {
  const msg = friendlyMessage(new RateLimitError(1_700_000_000, 5, 5));

  it('names "searches" so it is not mistaken for "no windows"', () => {
    expect(msg.toLowerCase()).toContain('search');
  });
  it('never contains the overloaded noun "moment"', () => {
    expect(msg.toLowerCase()).not.toContain('moment');
  });
  it('anchors to midnight, not a bare relative "tomorrow"', () => {
    expect(msg.toLowerCase()).toContain('midnight');
  });
  // App-Store-sensitive forbidden-scan — same discipline as moment-card.
  // Lock ALL THREE properties, not just "moment":
  it('count-free: contains no digit at all', () => {
    expect(msg).not.toMatch(/\d/);
  });
  it('monetization-free: no paywall vocabulary', () => {
    const lower = msg.toLowerCase();
    for (const word of [
      'free', 'upgrade', 'pay', 'unlock', 'premium',
      'subscription', 'subscribe', 'pro', 'purchase', 'plan',
    ]) {
      expect(lower).not.toContain(word);
    }
  });
  it('is distinct from the upstream-quota message', () => {
    expect(msg).not.toBe(friendlyMessage(new UpstreamQuotaError('x')));
  });
  it('still maps other errors (sanity)', () => {
    expect(friendlyMessage(new NetworkError(new Error('x')))).toMatch(/connection/i);
  });
});
