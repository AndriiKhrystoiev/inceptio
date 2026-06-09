// Thin wrapper over the native review API + the manual store/feedback links.
// The ONLY file that imports expo-store-review. Fire-and-forget, read-only
// against the OS (no outcome detection). Native module → needs a dev-client
// rebuild (LG4); does nothing meaningful in plain Expo Go / sideloaded Android.

import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { activeBundle } from '../../i18n/locale';
import { recordAttempt } from './rating-store';
import {
  SUPPORT_EMAIL, IOS_APP_STORE_URL, ANDROID_PLAY_STORE_URL, WEB_STORE_URL,
  buildEmailSubject,
} from './launch-constants';

/**
 * Best-effort native review card. Records our attempt ONLY when we actually
 * call requestReview — when the store is unavailable we no-op and burn no
 * attempt slot (EC1). Never inspects whether the card showed or was acted on.
 */
export async function attemptNativeReview(now: Date = new Date()): Promise<void> {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;            // EC1 — degrade to the Settings link only
    recordAttempt(now);                // count OUR call (bookkeeping, not outcome)
    await StoreReview.requestReview();
  } catch {
    // EC8 — swallow; if we recorded an attempt it stands (we did attempt).
  }
}

/** iOS deep-links to the write-review sheet; storeUrl() returns the plain
 *  listing, so append the action param (domain audit refinement). */
function withWriteReview(url: string): string {
  if (Platform.OS !== 'ios') return url;
  return url.includes('?') ? `${url}&action=write-review` : `${url}?action=write-review`;
}

/**
 * User-initiated "Rate Inceptio". Opens the store LISTING — never calls
 * requestReview (Apple forbids button-triggered requestReview). Layered
 * fallback: SDK storeUrl() → hardcoded native URL → web URL. storeUrl() is null
 * until the owner sets ios.appStoreUrl / android.playStoreUrl (library audit),
 * so the fallback chain is required, not optional.
 */
export async function openStoreListing(): Promise<void> {
  const sdkUrl = StoreReview.storeUrl(); // string | null
  const native = Platform.OS === 'ios' ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL;
  const candidates = [
    sdkUrl ? withWriteReview(sdkUrl) : null,
    withWriteReview(native),
    WEB_STORE_URL,
  ].filter((u): u is string => typeof u === 'string');

  for (const url of candidates) {
    try {
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    } catch { /* try the next candidate */ }
  }
  // All candidates failed (extremely unlikely — web URL is always openable):
  // soft no-op, never throw.
}

function diagnosticFooter(): string {
  // Non-sensitive only: app version / OS / resolved app-locale. No IDs, no
  // saved-moment data (spec §7 D8 Row 1).
  const v = Constants.expoConfig?.version ?? '0.0.0';
  return `\n\n—\nApp ${v} · ${Platform.OS} ${String(Platform.Version)} · ${activeBundle()}`;
}

/**
 * "Send feedback". Opens the mail composer; if no mail client, copies the
 * address to the clipboard (the valve must stay usable). Probe a BARE mailto:
 * for the capability check — iOS canOpenURL false-negatives on full mailto URLs
 * with spaces/quotes (library audit M4). NOTE: the caller writes the frustration
 * cooldown on the tap (action-only); this function does not read sentiment.
 */
export async function openFeedback(opts: {
  onCopied: () => void;
  onError?: () => void;
}): Promise<void> {
  const subject = encodeURIComponent(buildEmailSubject());
  const body = encodeURIComponent(diagnosticFooter());
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  let canMail = false;
  try { canMail = await Linking.canOpenURL('mailto:'); } catch { canMail = false; }
  if (canMail) {
    try { await Linking.openURL(mailto); return; } catch { /* fall through to copy */ }
  }
  try { await Clipboard.setStringAsync(SUPPORT_EMAIL); opts.onCopied(); }
  catch { opts.onError?.(); }
}

/** Dev-only (Debug "Force requestReview"): bypasses ALL eligibility. Must be
 *  compiled out of production builds (it lives behind __DEV__ at the call site;
 *  verified absent on a prod build per LG9). */
export async function debugForceRequestReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
  } catch { /* swallow */ }
}
