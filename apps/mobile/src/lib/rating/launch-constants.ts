// Launch-swappable constants for the rating feature. Everything here is either
// a store-account-dependent placeholder (swap at launch) or the email-subject
// plumbing constant (owner decision 2026-06-09: NOT a chrome key).

import { activeBundle } from '../../i18n/locale';

// TODO(launch): real App Store ID. Until set, StoreReview.storeUrl() returns
// null and Row 2 falls through to this, then to the web URL. Two-string swap;
// no logic change. See spec §7 D8 Row 2 + library audit.
export const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id000000000';

// TODO(launch): real Play package name (applicationId).
export const ANDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=app.inceptio.placeholder';

// Final browser fallback — always openable, so Row 2 never dead-ends.
export const WEB_STORE_URL = 'https://inceptio.app';

// TODO(launch): owner-supplied support address. NOT store-gated — can be a real
// inbox now for testing. Placeholder until owner supplies the real value.
export const SUPPORT_EMAIL = 'support@inceptio.app';

// emailSubject strategy (a) — plumbing constant: English + resolved-app-locale
// tag (e.g. "Inceptio feedback (de)") for solo-dev inbox triage. Deliberately
// NOT a chrome key — the user never sees it as UI, only as a mail subject.
export function buildEmailSubject(): string {
  return `Inceptio feedback (${activeBundle()})`;
}
