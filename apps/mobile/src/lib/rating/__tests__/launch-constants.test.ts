import { describe, it, expect } from 'vitest';
import {
  IOS_APP_STORE_URL, ANDROID_PLAY_STORE_URL, WEB_STORE_URL, SUPPORT_EMAIL, buildEmailSubject,
} from '../launch-constants';

describe('launch constants', () => {
  it('exposes openable store/web/support strings', () => {
    expect(IOS_APP_STORE_URL).toMatch(/^https:\/\/apps\.apple\.com\//);
    expect(ANDROID_PLAY_STORE_URL).toMatch(/^https:\/\/play\.google\.com\//);
    expect(WEB_STORE_URL).toMatch(/^https:\/\//);
    expect(SUPPORT_EMAIL).toContain('@');
  });
  it('builds a locale-tagged email subject', () => {
    // i18next not initialized → activeBundle() resolves the default bundle.
    expect(buildEmailSubject()).toMatch(/^Inceptio feedback \([a-z-]+\)$/);
  });
});
