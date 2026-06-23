import type { Activity } from '@inceptio/shared-types';
import type { HeadlineOverrides, Localized, Locale } from '../types';

// VOICE phase, D-headlines (the de/fr/es-419/pt-BR VALUES). Each user-facing
// leaf is an explicit per-locale Record. `en` is authoritative and unchanged;
// the four others are register-correct DRAFTS pending best-effort community
// review (de=du, fr=tu, es-419 voseo-neutral, pt-BR você), glossary-guided for
// any astrology term. These render on the FIXED share-image card, so each
// translation is kept as short as possible — aim within the English length.
// Conventions per the termbase: o céu / el cielo / le ciel / der Himmel for
// "the sky"; planets named directly in their everyday/established forms.

// Sentence-style top-of-screen headlines. Sparse on purpose — only the
// (activity, factor, status) tuples where a custom line carries more meaning
// than the generic stem.
//
// Anything not listed here falls through to GENERIC_HEADLINE_STEMS, which
// wraps the factor's phrase_short in a calm activity-shaped frame.
export const HEADLINES: HeadlineOverrides = {
  wedding: {
    venus_dignified_direct_well_aspected: {
      pass: {
        en: 'A tender day for beginnings.',
        de: 'Ein zarter Tag für den Anfang.',
        fr: 'Un jour tendre pour commencer.',
        'es-419': 'Un día tierno para comenzar.',
        'pt-BR': 'Um dia terno para começar.',
      },
    },
    moon_waxing_increasing_light: {
      pass: {
        en: 'A day that holds its shape.',
        de: 'Ein Tag, der seine Form hält.',
        fr: 'Un jour qui garde sa forme.',
        'es-419': 'Un día que guarda su forma.',
        'pt-BR': 'Um dia que mantém a forma.',
      },
    },
    moon_and_asc_ruler_in_good_aspect: {
      pass: {
        en: 'A day in quiet accord.',
        de: 'Ein Tag in stillem Einklang.',
        fr: 'Un jour en doux accord.',
        'es-419': 'Un día en quieto acuerdo.',
        'pt-BR': 'Um dia em quieto acordo.',
      },
    },
  },

  contracts: {
    mercury_dignified_direct_not_combust: {
      pass: {
        en: 'A clear day for plain words.',
        de: 'Ein klarer Tag für klare Worte.',
        fr: 'Un jour clair pour des mots clairs.',
        'es-419': 'Un día claro para palabras claras.',
        'pt-BR': 'Um dia claro para palavras claras.',
      },
    },
    venus_dignified_direct_well_aspected: {
      pass: {
        en: 'A day for good-faith dealing.',
        de: 'Ein Tag für redliches Handeln.',
        fr: 'Un jour pour traiter de bonne foi.',
        'es-419': 'Un día para tratar de buena fe.',
        'pt-BR': 'Um dia para tratar de boa-fé.',
      },
    },
  },

  business_launch: {
    jupiter_angular_or_aspecting: {
      pass: {
        en: 'A day with room to grow.',
        de: 'Ein Tag mit Raum zum Wachsen.',
        fr: 'Un jour avec de la place pour croître.',
        'es-419': 'Un día con espacio para crecer.',
        'pt-BR': 'Um dia com espaço para crescer.',
      },
    },
    asc_ruler_strong: {
      pass: {
        en: 'A day of steady ground.',
        de: 'Ein Tag auf festem Boden.',
        fr: 'Un jour de terrain sûr.',
        'es-419': 'Un día de suelo firme.',
        'pt-BR': 'Um dia de chão firme.',
      },
    },
  },

  travel: {
    moon_applying_to_benefic: {
      pass: {
        en: 'A day for an easy departure.',
        de: 'Ein Tag für eine leichte Abreise.',
        fr: 'Un jour pour un départ facile.',
        'es-419': 'Un día para una partida fácil.',
        'pt-BR': 'Um dia para uma partida fácil.',
      },
    },
    jupiter_angular_or_aspecting: {
      pass: {
        en: 'A day for going further.',
        de: 'Ein Tag, um weiter zu gehen.',
        fr: 'Un jour pour aller plus loin.',
        'es-419': 'Un día para ir más lejos.',
        'pt-BR': 'Um dia para ir mais longe.',
      },
    },
    mercury_dignified_direct_not_combust: {
      pass: {
        en: 'A day for smooth passage.',
        de: 'Ein Tag für sanfte Fahrt.',
        fr: 'Un jour pour un trajet sans heurts.',
        'es-419': 'Un día para un viaje sin tropiezos.',
        'pt-BR': 'Um dia para uma travessia tranquila.',
      },
    },
  },
};

// Generic activity-shaped stems. Each stem is a per-locale TEMPLATE carrying a
// `{lead}` interpolation slot (the factor's phrase_short, already localized).
//
// MECHANISM CHANGE (VOICE spec §5.1): `lowerFirst` is GONE. The old English
// stem lowercased the lead's first letter mid-sentence; that corrupts German
// (nouns stay capitalized) — the same class as the date-lowercase bug. A
// locale-authored template owns its own casing and frame, so the lead is
// substituted VERBATIM. The non-en templates are D-headlines' job; en-filled
// here. NOTE: the en templates preserve the prior wording but NO LONGER
// lowercase the lead — the lead now renders with its natural casing (e.g.
// "A tender day — Venus brings warmth." rather than "...venus brings warmth.").
export const GENERIC_HEADLINE_STEMS: Record<Activity, Localized> = {
  // The lead is the factor's phrase_short, substituted VERBATIM (German lead
  // casing preserved; en/fr/es-419/pt-BR lead lowercased by applyStem). Each
  // frame is authored so the lead reads naturally after the em-dash.
  wedding: {
    en: 'A tender day — {lead}.',
    de: 'Ein zarter Tag — {lead}.',
    fr: 'Un jour tendre — {lead}.',
    'es-419': 'Un día tierno — {lead}.',
    'pt-BR': 'Um dia terno — {lead}.',
  },
  contracts: {
    en: 'A steady day — {lead}.',
    de: 'Ein ruhiger Tag — {lead}.',
    fr: 'Un jour posé — {lead}.',
    'es-419': 'Un día firme — {lead}.',
    'pt-BR': 'Um dia firme — {lead}.',
  },
  business_launch: {
    en: 'A clear day — {lead}.',
    de: 'Ein klarer Tag — {lead}.',
    fr: 'Un jour clair — {lead}.',
    'es-419': 'Un día claro — {lead}.',
    'pt-BR': 'Um dia claro — {lead}.',
  },
  travel: {
    en: 'An open day — {lead}.',
    de: 'Ein offener Tag — {lead}.',
    fr: 'Un jour ouvert — {lead}.',
    'es-419': 'Un día abierto — {lead}.',
    'pt-BR': 'Um dia aberto — {lead}.',
  },
};

/**
 * Planet/luminary proper nouns that START a factor lead, per locale. DERIVED
 * from the actual translated phrase_shorts (enumerated in apply-stem.test.ts) —
 * only these three occur as lead-initial across the dictionary; no Mars/Saturn/
 * Moon/Sun, sign, or node ever begins a lead (those are article-initial, e.g.
 * "The Moon …"). A lead that begins with one of these keeps its capital when
 * embedded mid-sentence in en/fr/es-419/pt-BR (proper nouns are not lowercased).
 * apply-stem.test.ts asserts this set stays complete against the real leads, so
 * a future bare-proper-noun lead fails loudly until it's added here.
 */
export const LEAD_PROPER_NOUNS: Record<Locale, ReadonlySet<string>> = {
  en: new Set(['Venus', 'Mercury', 'Jupiter']),
  fr: new Set(['Vénus', 'Mercure', 'Jupiter']),
  'es-419': new Set(['Venus', 'Mercurio', 'Júpiter']),
  'pt-BR': new Set(['Vênus', 'Mercúrio', 'Júpiter']),
  de: new Set(), // de is never lowercased (applyStem preserves it); guard moot.
};

function lowerFirstForLead(lead: string, locale: Locale): string {
  // Match the FIRST TOKEN (up to space / hyphen / apostrophe) so a possessive
  // or hyphenated proper-noun prefix ("Venus's hour", "Mars-ruled") is caught,
  // not just a standalone first word.
  const firstToken = lead.split(/[\s'’-]/, 1)[0] ?? '';
  if (LEAD_PROPER_NOUNS[locale].has(firstToken)) return lead;
  return lead.charAt(0).toLowerCase() + lead.slice(1);
}

/**
 * Apply a localized stem template to a (localized) lead, substituting `{lead}`.
 *
 * LEAD CASING is LOCALE-AWARE (VOICE spec §5.1, same class as the date-casing
 * `casedForBundle` fix). The lead is a shared factor `phrase_short`, authored
 * standalone-capitalized (it renders capitalized on cards / factor rows). Mid-
 * sentence after the stem frame ("A tender day — {lead}.") it must read
 * naturally:
 *   - en / fr / es-419 / pt-BR → lowercase the lead's first letter UNLESS the
 *     lead begins with a proper noun (planet/luminary), which stays capitalized:
 *       common/article-initial → "A clear day — the room is clear."
 *       proper-noun-initial    → "A tender day — Venus brings warmth." (NOT "venus")
 *   - de → PRESERVE as authored. German mid-sentence casing is word-type-
 *     dependent (noun capitalized, article lowercase), so the German D-task
 *     authors each lead's correct embedded form; the runtime must NOT blanket-
 *     lowercase (that would corrupt German nouns — the old `lowerFirst` bug).
 */
export function applyStem(
  template: string,
  lead: string,
  locale: Locale,
): string {
  const cased = locale === 'de' ? lead : lowerFirstForLead(lead, locale);
  return template.replace('{lead}', cased);
}

// Used when summary.no_viable_windows is true. Range-agnostic phrasing —
// a 7-day, 30-day, and 6-month search all read sensibly.
export const NO_VIABLE_HEADLINES: Record<Activity, Localized> = {
  // "the sky" rendered per the termbase: der Himmel / le ciel / el cielo / o céu.
  wedding: {
    en: 'These days ask for patience — the sky is between rooms.',
    de: 'Diese Tage brauchen Geduld — der Himmel ist zwischen Räumen.',
    fr: 'Ces jours demandent de la patience — le ciel est entre deux pièces.',
    'es-419': 'Estos días piden paciencia — el cielo está entre cuartos.',
    'pt-BR': 'Estes dias pedem paciência — o céu está entre salas.',
  },
  contracts: {
    en: 'A quieter stretch for paper. Better moments are nearby.',
    de: 'Eine ruhigere Zeit für Papier. Bessere Momente sind nah.',
    fr: 'Une période plus calme pour les papiers. De meilleurs moments sont proches.',
    'es-419': 'Un tramo más calmo para los papeles. Hay mejores momentos cerca.',
    'pt-BR': 'Um trecho mais calmo para papéis. Momentos melhores estão perto.',
  },
  business_launch: {
    en: 'The sky is gathering — not the window for a launch.',
    de: 'Der Himmel sammelt sich — nicht das Fenster für einen Start.',
    fr: 'Le ciel se rassemble — pas la fenêtre pour un lancement.',
    'es-419': 'El cielo se está juntando — no es la ventana para lanzar.',
    'pt-BR': 'O céu está se juntando — não é a janela para lançar.',
  },
  travel: {
    en: 'The roads are waiting for a softer stretch.',
    de: 'Die Wege warten auf eine sanftere Zeit.',
    fr: 'Les routes attendent une période plus douce.',
    'es-419': 'Los caminos esperan un tramo más suave.',
    'pt-BR': 'As estradas esperam um trecho mais suave.',
  },
};
