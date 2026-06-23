import type { DailyNoteEntry, KnownDailyNoteId } from '../types';

/**
 * Vague-variant fallbacks for daily-note entries with
 * `needs_vague_fallback: true` — see spec §3.1 and §5.
 *
 * The picker chooses the primary entry when its horizon is verifiable
 * (intraday timing exists / concrete day is <= 3 days away). When the
 * horizon FAILS to verify, the picker falls through to the matching fallback
 * here. Fallbacks share the same `dominant_factors_hint` and `quality_bucket`
 * as their primary — only the phrasing changes (concrete → vague).
 */
export const DAILY_NOTE_FALLBACKS: Partial<Record<KnownDailyNoteId, DailyNoteEntry>> = {
  // Fallback for entry 12 (`mixed-moon-void-until-noon`) when intraday
  // timing of the void cannot be computed cheaply.
  'mixed-moon-void-until-noon': {
    id: 'mixed-moon-void-until-noon-vague',
    quality_bucket: 'mixed',
    headline: {
      en: 'A quieter stretch in the sky.',
      de: 'Eine stillere Strecke am Himmel.',
      fr: 'Un passage plus calme dans le ciel.',
      'es-419': 'Un tramo más tranquilo en el cielo.',
      'pt-BR': 'Um trecho mais quieto no céu.',
    },
    supporting_line: {
      en: 'The Moon is between aspects today — time important calls for when the sky settles.',
      de: 'Der Mond steht heute zwischen den Aspekten — lege wichtige Gespräche auf später, wenn der Himmel zur Ruhe kommt.',
      fr: 'La Lune est entre les aspects aujourd’hui — réserve les appels importants pour quand le ciel s’apaise.',
      'es-419':
        'La Luna está entre aspectos hoy — conviene dejar las llamadas importantes para cuando el cielo se calme.',
      'pt-BR':
        'A Lua está entre os aspectos hoje — deixe as conversas importantes para quando o céu se acalmar.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'mixed-moon-void-until-noon', applied when intraday timing not available",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // Fallback for entry 16 (`closed-mercury-retrograde`) when Mercury direct
  // station is > 3 days away — drops the "until Thursday" concrete promise.
  // provisional — matches pending EN; re-translate if ruling changes
  // ("Mercury is sleeping." is a project-wide LOCKED phrase per CLAUDE.md —
  // keep the sleep image in every locale).
  'closed-mercury-retrograde': {
    id: 'closed-mercury-retrograde-vague',
    quality_bucket: 'closed',
    headline: {
      en: 'Mercury is sleeping.',
      de: 'Merkur schläft.',
      fr: 'Mercure dort.',
      'es-419': 'Mercurio duerme.',
      'pt-BR': 'Mercúrio está dormindo.',
    },
    supporting_line: {
      en: 'Words need extra care for now — good for re-reading and editing; hold the heavy signing for clearer days.',
      de: 'Worte brauchen jetzt mehr Sorgfalt — gut zum Nochmal-Lesen und Überarbeiten; heb die großen Unterschriften für klarere Tage auf.',
      fr: 'Les mots demandent plus de soin pour l’instant — idéal pour relire et corriger ; garde les signatures importantes pour des jours plus clairs.',
      'es-419':
        'Las palabras piden más cuidado por ahora — buen momento para releer y editar; mejor dejar las firmas importantes para días más claros.',
      'pt-BR':
        'As palavras pedem mais cuidado por agora — bom para reler e revisar; deixe as assinaturas importantes para dias mais claros.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'closed-mercury-retrograde', applied when Mercury direct station > 3 days away",
    surface: 'daily-note',
    needs_vague_fallback: false,
    pending_astrologer_ruling: true,
  },

  // Fallback for entry 19 (`closed-malefic-on-angle`) when the malefic does
  // NOT move off the angle by tomorrow — drops the "Tomorrow opens cleaner" promise.
  'closed-malefic-on-angle': {
    id: 'closed-malefic-on-angle-vague',
    quality_bucket: 'closed',
    headline: {
      en: 'A difficult planet sits on the angles today.',
      de: 'Ein schwieriger Planet steht heute an den Achsen.',
      fr: 'Une planète difficile est sur les angles aujourd’hui.',
      'es-419': 'Un planeta difícil está sobre los ángulos hoy.',
      'pt-BR': 'Um planeta difícil está sobre os ângulos hoje.',
    },
    supporting_line: {
      en: 'A charged stretch — better used for closing things than starting them. Clearer days are within reach.',
      de: 'Eine aufgeladene Strecke — besser zum Abschließen als zum Beginnen. Klarere Tage sind in Reichweite.',
      fr: 'Un passage chargé — mieux vaut clore les choses que les commencer. Des jours plus clairs sont à portée.',
      'es-419':
        'Un tramo cargado — mejor para cerrar asuntos que para empezarlos. Hay días más claros al alcance.',
      'pt-BR':
        'Um trecho carregado — melhor para encerrar coisas do que para começá-las. Dias mais claros estão ao alcance.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'closed-malefic-on-angle', applied when malefic remains on the angle past tomorrow",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },
};
