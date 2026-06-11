import { describe, it, expect } from 'vitest';
import { VersionPolicySchema } from '../api/version-policy';

const valid = {
  forceEnabled: true,
  ios: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://apps.apple.com/app/id1' },
  android: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://play.google.com/store/apps/details?id=x' },
};

describe('VersionPolicySchema', () => {
  it('accepts a valid doc', () => {
    expect(VersionPolicySchema.safeParse(valid).success).toBe(true);
  });
  it('accepts a doc with only one platform (other → fail-open downstream)', () => {
    const { android, ...iosOnly } = valid;
    expect(VersionPolicySchema.safeParse(iosOnly).success).toBe(true);
  });
  it('rejects a missing forceEnabled', () => {
    const { forceEnabled, ...rest } = valid;
    expect(VersionPolicySchema.safeParse(rest).success).toBe(false);
  });
  it('rejects a non-string version', () => {
    const bad = { ...valid, ios: { ...valid.ios, minVersion: 2 } };
    expect(VersionPolicySchema.safeParse(bad).success).toBe(false);
  });
  it('rejects a non-url storeUrl', () => {
    const bad = { ...valid, ios: { ...valid.ios, storeUrl: 'not-a-url' } };
    expect(VersionPolicySchema.safeParse(bad).success).toBe(false);
  });
});
