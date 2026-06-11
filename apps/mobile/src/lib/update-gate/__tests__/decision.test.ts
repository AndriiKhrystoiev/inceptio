import { describe, it, expect } from 'vitest';
import { evaluateUpdateState } from '../decision';
import type { VersionPolicy } from '@inceptio/shared-types';

const url = 'https://apps.apple.com/app/id1';
const policy = (over: Partial<VersionPolicy['ios']> & { forceEnabled?: boolean; bothPlatforms?: boolean } = {}): VersionPolicy => ({
  forceEnabled: over.forceEnabled ?? true,
  ios: { minVersion: over.minVersion ?? '1.2.0', latestVersion: over.latestVersion ?? '1.5.0', storeUrl: url },
});

type Row = [string, unknown, Partial<Parameters<typeof policy>[0]>, 'ios' | 'android', string, string];
const rows: Row[] = [
  ['force',                  '1.0.0', {}, 'ios', 'force', 'force'],
  ['soft band',              '1.3.0', {}, 'ios', 'soft', 'soft'],
  ['up to date (equal)',     '1.5.0', {}, 'ios', 'none', 'up_to_date'],
  ['up to date (newer)',     '1.6.0', {}, 'ios', 'none', 'up_to_date'],
  ['boundary == min',        '1.2.0', {}, 'ios', 'soft', 'soft'],
  ['force disabled',         '1.0.0', { forceEnabled: false }, 'ios', 'soft', 'force_disabled'],
  ['min>latest, below',      '1.0.0', { minVersion: '1.5.0', latestVersion: '1.2.0' }, 'ios', 'soft', 'min_exceeds_latest'],
  ['min>latest, mid',        '1.3.0', { minVersion: '1.5.0', latestVersion: '1.2.0' }, 'ios', 'none', 'min_exceeds_latest'],
  ['unparseable installed',  'abc',   {}, 'ios', 'none', 'unparseable_installed'],
  ['null installed',         null,    {}, 'ios', 'none', 'unparseable_installed'],
  ['unparseable policy min', '1.0.0', { minVersion: 'x' }, 'ios', 'none', 'unparseable_policy'],
  ['missing platform',       '1.0.0', {}, 'android', 'none', 'missing_platform'],
];

describe('evaluateUpdateState', () => {
  it.each(rows)('%s', (_label, installed, over, platform, state, reason) => {
    const result = evaluateUpdateState(installed, policy(over), platform);
    expect(result).toEqual({ state, reason });
  });
  it('never throws on a wildly malformed policy', () => {
    // Intentional garbage cast — exercises the total/fail-open contract at runtime.
    expect(() => evaluateUpdateState('1.0.0', {} as unknown as VersionPolicy, 'ios')).not.toThrow();
  });
});
