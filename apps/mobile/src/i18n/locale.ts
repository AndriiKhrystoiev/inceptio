import { getLocales } from 'expo-localization';

export const SUPPORTED = ['en', 'de', 'fr', 'es-419', 'pt-BR'] as const;
export type Bundle = (typeof SUPPORTED)[number];

/**
 * Native language names (endonyms) for each supported bundle — shown in the
 * user-facing language selector (YouScreen → LanguageSheet). These are NOT
 * chrome strings: an endonym is identical in every locale (like a wordmark),
 * so they live here next to SUPPORTED as the single source of truth rather than
 * in the per-locale settings.json. No flags — es-419 and pt-BR are regional
 * variants and a flag would misrepresent them.
 */
export const LANGUAGE_LABELS: Record<Bundle, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  'es-419': 'Español (Latinoamérica)',
  'pt-BR': 'Português (Brasil)',
};

type DeviceLocale = { languageTag: string; languageCode: string | null };

/** Device preferences -> our bundle key. Explicit map; do NOT rely on i18next implicit matching. */
export function resolveLocale(locales: DeviceLocale[] = getLocales()): Bundle {
  for (const { languageTag, languageCode } of locales) {
    const primary = (languageCode ?? languageTag.split('-')[0] ?? '').toLowerCase();
    if (primary === 'es') return 'es-419'; // any Spanish -> Latam
    if (primary === 'pt') return 'pt-BR';  // any Portuguese -> Brazil
    if (primary === 'de') return 'de';
    if (primary === 'fr') return 'fr';
    if (primary === 'en') return 'en';
  }
  return 'en';
}

/** Bundle key -> Intl-valid locale arg. Hermes/ICU has no M49 `419` data. */
export function toIntlLocale(bundle: string): string {
  if (bundle === 'es-419') return 'es';
  if (bundle === 'pt-BR') return 'pt';
  return bundle;
}

let override: Bundle | null = null;
/**
 * Set the active bundle, overriding the device locale. This is the single
 * authority `activeBundle()` reads, so setting it steers every locale consumer
 * (date formatting, the X-Locale header, etc.). Two callers:
 *   1. The __DEV__ DevLocaleBar (App.js) — local-verification loop.
 *   2. The user-facing language selector (YouScreen) — paired with
 *      i18n.changeLanguage() to re-render and setPersistedLocale() to persist;
 *      re-applied on boot from storage (see lib/locale-preference.ts).
 */
export function __setLocaleOverride(b: Bundle | null) { override = b; }
export function activeBundle(): Bundle { return override ?? resolveLocale(); }
