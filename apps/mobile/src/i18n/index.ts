import './polyfills';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { activeBundle, SUPPORTED } from './locale';

// EAGER static imports — every namespace × every locale, resolved at init().
// The full NS list is known from the partition map, so this file is authored ONCE
// here in Task 0. Each extraction task fills only its own pre-created JSON skeleton
// (Step 8) — no task edits index.ts, no runtime addResourceBundle, no load-order
// fragility (a t() call before a lazy register would silently return the key and
// the build-time coverage guard could not catch it).

// --- en (authoritative) ---
import en_common from '../locales/en/common.json';
import en_nav from '../locales/en/nav.json';
import en_onboarding from '../locales/en/onboarding.json';
import en_activity from '../locales/en/activity.json';
import en_daterange from '../locales/en/daterange.json';
import en_location from '../locales/en/location.json';
import en_loading from '../locales/en/loading.json';
import en_calendar from '../locales/en/calendar.json';
import en_moment from '../locales/en/moment.json';
import en_noviable from '../locales/en/noviable.json';
import en_moments from '../locales/en/moments.json';
import en_settings from '../locales/en/settings.json';
import en_paywall from '../locales/en/paywall.json';
import en_today from '../locales/en/today.json';
import en_card from '../locales/en/card.json';
import en_errors from '../locales/en/errors.json';

// --- de ---
import de_common from '../locales/de/common.json';
import de_nav from '../locales/de/nav.json';
import de_onboarding from '../locales/de/onboarding.json';
import de_activity from '../locales/de/activity.json';
import de_daterange from '../locales/de/daterange.json';
import de_location from '../locales/de/location.json';
import de_loading from '../locales/de/loading.json';
import de_calendar from '../locales/de/calendar.json';
import de_moment from '../locales/de/moment.json';
import de_noviable from '../locales/de/noviable.json';
import de_moments from '../locales/de/moments.json';
import de_settings from '../locales/de/settings.json';
import de_paywall from '../locales/de/paywall.json';
import de_today from '../locales/de/today.json';
import de_card from '../locales/de/card.json';
import de_errors from '../locales/de/errors.json';

// --- fr ---
import fr_common from '../locales/fr/common.json';
import fr_nav from '../locales/fr/nav.json';
import fr_onboarding from '../locales/fr/onboarding.json';
import fr_activity from '../locales/fr/activity.json';
import fr_daterange from '../locales/fr/daterange.json';
import fr_location from '../locales/fr/location.json';
import fr_loading from '../locales/fr/loading.json';
import fr_calendar from '../locales/fr/calendar.json';
import fr_moment from '../locales/fr/moment.json';
import fr_noviable from '../locales/fr/noviable.json';
import fr_moments from '../locales/fr/moments.json';
import fr_settings from '../locales/fr/settings.json';
import fr_paywall from '../locales/fr/paywall.json';
import fr_today from '../locales/fr/today.json';
import fr_card from '../locales/fr/card.json';
import fr_errors from '../locales/fr/errors.json';

// --- es-419 ---
import es419_common from '../locales/es-419/common.json';
import es419_nav from '../locales/es-419/nav.json';
import es419_onboarding from '../locales/es-419/onboarding.json';
import es419_activity from '../locales/es-419/activity.json';
import es419_daterange from '../locales/es-419/daterange.json';
import es419_location from '../locales/es-419/location.json';
import es419_loading from '../locales/es-419/loading.json';
import es419_calendar from '../locales/es-419/calendar.json';
import es419_moment from '../locales/es-419/moment.json';
import es419_noviable from '../locales/es-419/noviable.json';
import es419_moments from '../locales/es-419/moments.json';
import es419_settings from '../locales/es-419/settings.json';
import es419_paywall from '../locales/es-419/paywall.json';
import es419_today from '../locales/es-419/today.json';
import es419_card from '../locales/es-419/card.json';
import es419_errors from '../locales/es-419/errors.json';

// --- pt-BR ---
import ptBR_common from '../locales/pt-BR/common.json';
import ptBR_nav from '../locales/pt-BR/nav.json';
import ptBR_onboarding from '../locales/pt-BR/onboarding.json';
import ptBR_activity from '../locales/pt-BR/activity.json';
import ptBR_daterange from '../locales/pt-BR/daterange.json';
import ptBR_location from '../locales/pt-BR/location.json';
import ptBR_loading from '../locales/pt-BR/loading.json';
import ptBR_calendar from '../locales/pt-BR/calendar.json';
import ptBR_moment from '../locales/pt-BR/moment.json';
import ptBR_noviable from '../locales/pt-BR/noviable.json';
import ptBR_moments from '../locales/pt-BR/moments.json';
import ptBR_settings from '../locales/pt-BR/settings.json';
import ptBR_paywall from '../locales/pt-BR/paywall.json';
import ptBR_today from '../locales/pt-BR/today.json';
import ptBR_card from '../locales/pt-BR/card.json';
import ptBR_errors from '../locales/pt-BR/errors.json';

// --- VOICE (en only, by design — no de/fr/es-419/pt-BR voice entries) ---
import en_voice_card from '../locales/en/voice/card.json';
import en_voice_reason from '../locales/en/voice/reason.json';
import en_voice_calendar from '../locales/en/voice/calendar.json';
import en_voice_moment from '../locales/en/voice/moment.json';
import en_voice_moments from '../locales/en/voice/moments.json';

type Json = Record<string, unknown>;

const bundle = (
  common: Json, nav: Json, onboarding: Json, activity: Json, daterange: Json,
  location: Json, loading: Json, calendar: Json, moment: Json, noviable: Json,
  moments: Json, settings: Json, paywall: Json, today: Json, card: Json, errors: Json,
) => ({
  common, nav, onboarding, activity, daterange, location, loading, calendar,
  moment, noviable, moments, settings, paywall, today, card, errors,
});

const resources = {
  en: bundle(
    en_common, en_nav, en_onboarding, en_activity, en_daterange, en_location,
    en_loading, en_calendar, en_moment, en_noviable, en_moments, en_settings,
    en_paywall, en_today, en_card, en_errors,
  ),
  de: bundle(
    de_common, de_nav, de_onboarding, de_activity, de_daterange, de_location,
    de_loading, de_calendar, de_moment, de_noviable, de_moments, de_settings,
    de_paywall, de_today, de_card, de_errors,
  ),
  fr: bundle(
    fr_common, fr_nav, fr_onboarding, fr_activity, fr_daterange, fr_location,
    fr_loading, fr_calendar, fr_moment, fr_noviable, fr_moments, fr_settings,
    fr_paywall, fr_today, fr_card, fr_errors,
  ),
  'es-419': bundle(
    es419_common, es419_nav, es419_onboarding, es419_activity, es419_daterange,
    es419_location, es419_loading, es419_calendar, es419_moment, es419_noviable,
    es419_moments, es419_settings, es419_paywall, es419_today, es419_card, es419_errors,
  ),
  'pt-BR': bundle(
    ptBR_common, ptBR_nav, ptBR_onboarding, ptBR_activity, ptBR_daterange,
    ptBR_location, ptBR_loading, ptBR_calendar, ptBR_moment, ptBR_noviable,
    ptBR_moments, ptBR_settings, ptBR_paywall, ptBR_today, ptBR_card, ptBR_errors,
  ),
};

// VOICE namespace is en-only by design (no de/fr/es-419/pt-BR entries):
(resources.en as Record<string, Json>).voice = {
  card: en_voice_card,
  reason: en_voice_reason,
  calendar: en_voice_calendar,
  moment: en_voice_moment,
  moments: en_voice_moments,
};

export function initI18n() {
  if (i18n.isInitialized) return i18n;
  i18n.use(initReactI18next).init({
    resources,
    lng: activeBundle(),
    supportedLngs: SUPPORTED,
    fallbackLng: { 'es-419': ['en'], 'pt-BR': ['en'], de: ['en'], fr: ['en'], default: ['en'] },
    load: 'currentOnly',
    keySeparator: false,
    nsSeparator: ':',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnNull: false,
  });
  return i18n;
}

export default i18n;
