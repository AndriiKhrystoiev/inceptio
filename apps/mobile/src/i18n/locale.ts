import { getLocales } from 'expo-localization';

export const SUPPORTED = ['en', 'de', 'fr', 'es-419', 'pt-BR'] as const;
export type Bundle = (typeof SUPPORTED)[number];

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
/** __DEV__ only: force a locale for the local-verification loop. */
export function __setLocaleOverride(b: Bundle | null) { override = b; }
export function activeBundle(): Bundle { return override ?? resolveLocale(); }
