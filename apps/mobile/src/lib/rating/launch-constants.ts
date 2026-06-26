// Launch-swappable constants for the rating + legal/support surfaces. Everything
// here is either a store-account-dependent link, the support inbox, or the
// email-subject plumbing constant (owner decision 2026-06-09: NOT a chrome key).

import { activeBundle } from '../../i18n/locale';

// Live App Store listing (app id 6783891298). StoreReview.storeUrl() may still
// return null until ios.appStoreUrl is set, so Row 2 falls through to this.
export const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id6783891298';

// Live Play listing (applicationId io.inceptio.app).
export const ANDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=io.inceptio.app';

// Final browser fallback — always openable, so Row 2 never dead-ends.
export const WEB_STORE_URL = 'https://inceptio.app';

// Owner-supplied support inbox (Play production checklist contact).
export const SUPPORT_EMAIL = 'andriikhr@procoders.tech';

// Privacy policy hosted on GitHub Pages (inceptio-legal repo). The app collects
// only location; this page is the same one linked from the App/Play listings.
export const PRIVACY_POLICY_URL =
  'https://andriikhrystoiev.github.io/inceptio-legal/privacy.html';

// emailSubject strategy (a) — plumbing constant: English + resolved-app-locale
// tag (e.g. "Inceptio feedback (de)") for solo-dev inbox triage. Deliberately
// NOT a chrome key — the user never sees it as UI, only as a mail subject.
export function buildEmailSubject(): string {
  return `Inceptio feedback (${activeBundle()})`;
}
