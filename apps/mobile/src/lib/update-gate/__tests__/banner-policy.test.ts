import { describe, it, expect } from 'vitest';
import { shouldShowSoftBanner, SOFT_BANNER_CONFIG } from '../banner-policy';
import type { UpdateState } from '../decision';

const NOW = new Date('2026-06-11T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

const call = (state: UpdateState, latestVersion: string, dismissedForVersion: string | null, dismissedAt: string | null) =>
  shouldShowSoftBanner({ state, latestVersion, suppression: { dismissedForVersion, dismissedAt }, config: SOFT_BANNER_CONFIG, now: NOW });

describe('shouldShowSoftBanner (cooldownDays=7)', () => {
  it('soft + never dismissed → true', () => { expect(call('soft', '1.5.0', null, null)).toBe(true); });
  it('soft + same version dismissed 1d ago → false (sticky)', () => { expect(call('soft', '1.5.0', '1.5.0', daysAgo(1))).toBe(false); });
  it('soft + same version dismissed 100d ago → false (sticky forever)', () => { expect(call('soft', '1.5.0', '1.5.0', daysAgo(100))).toBe(false); });
  it('soft + old version dismissed 2d ago, new latest → false (floor)', () => { expect(call('soft', '1.6.0', '1.5.0', daysAgo(2))).toBe(false); });
  it('soft + old version dismissed 30d ago, new latest → true', () => { expect(call('soft', '1.6.0', '1.5.0', daysAgo(30))).toBe(true); });
  it('soft + dismissed EXACTLY 7d ago, new latest → true (< boundary)', () => { expect(call('soft', '1.6.0', '1.5.0', daysAgo(7))).toBe(true); });
  it('soft + future dismissedAt (clock skew) → false', () => { expect(call('soft', '1.6.0', '1.5.0', inDays(3))).toBe(false); });
  it('force → false', () => { expect(call('force', '1.5.0', null, null)).toBe(false); });
  it('none → false', () => { expect(call('none', '1.5.0', null, null)).toBe(false); });
});
