import { storage } from './storage';
import { SUPPORTED, type Bundle } from '../i18n/locale';

// User's explicitly-chosen app language. Distinct from the device locale: once
// the user picks a language in Settings we persist it here and re-apply it on
// every boot (App.js), so the choice survives a restart and outranks the OS
// language. Absent → no explicit choice yet → fall back to the device locale
// (resolveLocale). Backed by the same AsyncStorage wrapper as the other prefs.
const KEY_LOCALE = 'inceptio.locale';

const isBundle = (v: string | undefined): v is Bundle =>
  v !== undefined && (SUPPORTED as readonly string[]).includes(v);

/**
 * The persisted language choice, or null if none has been set (or the stored
 * value is no longer a supported bundle — e.g. a locale removed in a future
 * release). Synchronous: assumes hydrateStorage() has run (App boot).
 */
export function getPersistedLocale(): Bundle | null {
  const raw = storage.getString(KEY_LOCALE);
  return isBundle(raw) ? raw : null;
}

/** Persist the user's language choice. Pair with __setLocaleOverride() +
 *  i18n.changeLanguage() at the call site to apply it to the running app. */
export function setPersistedLocale(bundle: Bundle): void {
  storage.set(KEY_LOCALE, bundle);
}
