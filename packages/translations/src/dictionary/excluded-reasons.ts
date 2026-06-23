import type { ReasonId } from '@inceptio/shared-types';
import type { Localized } from '../types';

// Phrasings are LOCKED (en) — sourced verbatim from CLAUDE.md
// "Verified excluded range reason IDs". Do not paraphrase the EN. The
// astrologer review (per CLAUDE.md, ~2h before launch) has already touched
// these. "Mercury is sleeping" in particular is a project-wide locked phrase.
//
// VOICE phase: each `phrase` leaf is now a per-locale Record<Locale,string>
// (de/fr/es-419/pt-BR added; en unchanged + authoritative). de=du, fr=tu
// (provisional), es-419 voseo-neutral, pt-BR você. Astrology terms follow the
// termbase (void of course → pt-BR "Lua Fora de Curso"; combust → "Combustão";
// via combusta kept Latin; per-planet retrógrado/retrógrada agreements).
// Translations are register-correct DRAFTS pending best-effort community review.
//
// The map's value type widens `phrase` to `Localized` so the Record literals
// type-check; the read site (translate.ts) resolves via `localize()`.
export const EXCLUDED_REASONS: Record<ReasonId, { phrase: Localized }> = {
  moon_voc: {
    // void of course → warm form "the Moon is between signs" (termbase);
    // pt-BR technical term is "Lua Fora de Curso" — kept the between-signs image.
    phrase: {
      en: "The Moon is between signs — efforts begun now don't take root the way they do on other days.",
      de: 'Der Mond steht zwischen den Zeichen — was du jetzt beginnst, fasst nicht so Wurzel wie an anderen Tagen.',
      fr: "La Lune est entre les signes — ce que tu commences maintenant ne prend pas racine comme les autres jours.",
      'es-419':
        'La Luna está entre signos — lo que se empieza ahora no echa raíces como en otros días.',
      'pt-BR':
        'A Lua está entre os signos — o que se começa agora não cria raízes como em outros dias.',
    },
  },
  mercury_retrograde: {
    // "Mercury is sleeping" — project-wide LOCKED warm phrase; keep the sleep image.
    phrase: {
      en: 'Mercury is sleeping — communication needs extra care this week.',
      de: 'Merkur schläft — die Verständigung braucht diese Woche besondere Sorgfalt.',
      fr: 'Mercure dort — la communication demande un soin particulier cette semaine.',
      'es-419':
        'Mercurio duerme — la comunicación necesita cuidado adicional esta semana.',
      'pt-BR':
        'Mercúrio está dormindo — a comunicação pede um cuidado extra esta semana.',
    },
  },
  // provisional — matches pending EN; re-translate if ruling changes.
  // TODO(astrologer-review): phrase below is a draft for mercury_combust
  // (added by upstream mid-2026 — Mercury within ~8° of Sun, hidden/weakened,
  // distinct from retrograde). Confirm or refine in the next astrologer pass.
  // Warm form of *combust* (pt-BR technical: "Combustão"); keep the hidden-light image.
  mercury_combust: {
    phrase: {
      en: "Mercury is hidden by the Sun's light — words don't carry far this stretch.",
      de: 'Merkur ist vom Sonnenlicht verdeckt — Worte tragen in dieser Zeit nicht weit.',
      fr: "Mercure est caché par la lumière du Soleil — les mots ne portent pas loin en ce moment.",
      'es-419':
        'Mercurio está oculto por la luz del Sol — las palabras no llegan lejos en este tramo.',
      'pt-BR':
        'Mercúrio está oculto pela luz do Sol — as palavras não vão longe neste período.',
    },
  },
  venus_retrograde: {
    // "Venus is resting" — warm form; ES/PT take feminine agreement (Venus/Vênus).
    phrase: {
      en: 'Venus is resting — not a season for new commitments.',
      de: 'Venus ruht — keine Zeit für neue Bindungen.',
      fr: 'Vénus se repose — ce n’est pas une saison pour de nouveaux engagements.',
      'es-419':
        'Venus descansa — no es temporada para nuevos compromisos.',
      'pt-BR':
        'Vênus está descansando — não é época para novos compromissos.',
    },
  },
  // provisional — matches pending EN; re-translate if ruling changes.
  // TODO(astrologer-review): draft phrasing for mars_retrograde (added by
  // upstream mid-2026 — action and initiative delayed; classical "review,
  // don't begin"). Confirm or refine in the next astrologer pass.
  // "Mars is hesitating" — warm form; Marte está retrógrado underlies it.
  mars_retrograde: {
    phrase: {
      en: "Mars is hesitating — bold moves don't carry the same force right now.",
      de: 'Mars zögert — kühne Schritte haben gerade nicht dieselbe Kraft.',
      fr: "Mars hésite — les gestes audacieux n’ont pas la même force en ce moment.",
      'es-419':
        'Marte vacila — los movimientos audaces no tienen la misma fuerza ahora.',
      'pt-BR':
        'Marte está hesitando — os passos ousados não têm a mesma força agora.',
    },
  },
  // provisional — matches pending EN; re-translate if ruling changes.
  // TODO(astrologer-review): draft phrasing for jupiter_retrograde (added
  // by upstream mid-2026 — expansion and growth turning inward; refine in
  // the next astrologer pass).
  // "Jupiter is turning inward" — warm form; mirror the Saturn phrasing.
  jupiter_retrograde: {
    phrase: {
      en: 'Jupiter is turning inward — growth needs patience this stretch.',
      de: 'Jupiter wendet sich nach innen — Wachstum braucht in dieser Zeit Geduld.',
      fr: "Jupiter se tourne vers l'intérieur — la croissance demande de la patience en ce moment.",
      'es-419':
        'Júpiter se vuelve hacia adentro — el crecimiento necesita paciencia en este tramo.',
      'pt-BR':
        'Júpiter está se voltando para dentro — o crescimento pede paciência neste período.',
    },
  },
  saturn_retrograde: {
    // "Saturn is turning inward" — confirmed (not pending); mirrors Jupiter phrasing.
    phrase: {
      en: 'Saturn is turning inward — foundations need patience.',
      de: 'Saturn wendet sich nach innen — Fundamente brauchen Geduld.',
      fr: "Saturne se tourne vers l'intérieur — les fondations demandent de la patience.",
      'es-419':
        'Saturno se vuelve hacia adentro — los cimientos necesitan paciencia.',
      'pt-BR':
        'Saturno está se voltando para dentro — os alicerces pedem paciência.',
    },
  },
  eclipse_window: {
    // eclipse → DE "Finsternis" (everyday, warm) per termbase.
    phrase: {
      en: 'An eclipse window — the sky asks for stillness, not new beginnings.',
      de: 'Eine Finsternis — der Himmel bittet um Ruhe, nicht um neue Anfänge.',
      fr: "Une fenêtre d'éclipse — le ciel demande du calme, pas de nouveaux commencements.",
      'es-419':
        'Una ventana de eclipse — el cielo pide quietud, no comienzos nuevos.',
      'pt-BR':
        'Uma janela de eclipse — o céu pede quietude, não novos começos.',
    },
  },
  moon_via_combusta: {
    // Keep the Latin "via combusta"; translate only the "walks/wanders" verb (termbase).
    phrase: {
      en: 'The Moon walks the via combusta — a charged stretch worth waiting out.',
      de: 'Der Mond wandert über die Via Combusta — eine aufgeladene Strecke, die man besser abwartet.',
      fr: 'La Lune chemine sur la via combusta — un passage chargé qu’il vaut mieux laisser passer.',
      'es-419':
        'La Luna recorre la vía combusta — un tramo cargado que conviene dejar pasar.',
      'pt-BR':
        'A Lua percorre a Via Combusta — um trecho carregado que vale a pena esperar passar.',
    },
  },
  malefic_on_angle: {
    // "A difficult planet is on the angles" — warm form of malefic on angle (termbase).
    phrase: {
      en: 'A difficult planet is on the angles — better to wait.',
      de: 'Ein schwieriger Planet steht an den Achsen — besser zu warten.',
      fr: 'Une planète difficile est sur les angles — mieux vaut attendre.',
      'es-419':
        'Un planeta difícil está sobre los ángulos — mejor esperar.',
      'pt-BR':
        'Um planeta difícil está sobre os ângulos — melhor esperar.',
    },
  },
  fixed_star_on_angle: {
    // fixed star → established calque (DE Fixstern, FR étoile fixe, etc.); angle = axis.
    phrase: {
      en: 'A fixed star rests on the angles — a powerful but particular moment.',
      de: 'Ein Fixstern ruht an den Achsen — ein machtvoller, aber eigenwilliger Moment.',
      fr: 'Une étoile fixe repose sur les angles — un moment puissant mais particulier.',
      'es-419':
        'Una estrella fija reposa sobre los ángulos — un momento poderoso pero particular.',
      'pt-BR':
        'Uma estrela fixa repousa sobre os ângulos — um momento poderoso, mas particular.',
    },
  },
};
