// Hermes (RN 0.83 / Expo SDK 55) ships no Intl.PluralRules; i18next v4 plurals
// derive from it. Force-load FormatJS PluralRules + the 5 locales' data.
import '@formatjs/intl-locale/polyfill-force';
import '@formatjs/intl-pluralrules/polyfill-force';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/de';
import '@formatjs/intl-pluralrules/locale-data/fr';
import '@formatjs/intl-pluralrules/locale-data/es';
import '@formatjs/intl-pluralrules/locale-data/pt';
