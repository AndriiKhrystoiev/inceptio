import type { DailyNoteEntry, KnownDailyNoteId } from '../types';

/**
 * The 21 daily-note library entries — see spec §3.3 for authoritative content.
 * Order matches the spec. Each entry is transcribed verbatim including any
 * post-hardening / post-audit revisions.
 *
 * IMPORTANT: entries 16 + 17 carry `pending_astrologer_ruling: true` per
 * spec §11.4 BLOCKING items. Task 17 of the implementation plan applies the
 * final ruling — until then they ship with their current draft phrasings.
 *
 * VOICE phase (i18n): each user-facing leaf (`headline`, `supporting_line`) is
 * now a per-locale `Record<Locale,string>` (`Localized`). en is authoritative
 * and unchanged. de/fr/es-419/pt-BR are register-correct DRAFTS pending
 * best-effort community review — de uses `du`, fr `tu` (provisional), es-419
 * voseo-neutral (no 2nd-person-singular verb forms), pt-BR `você`. Traditional
 * astrology terms follow docs/superpowers/glossary/i18n-termbase.md (e.g. the
 * warm void-of-course form "between signs", Mercury-sleeping LOCKED phrase, the
 * Latin "via combusta"). Structural metadata stays ABOVE each localized leaf.
 */
export const DAILY_NOTES: Record<KnownDailyNoteId, DailyNoteEntry> = {
  // ─── Strong (75+) ───

  'strong-sky-is-clear': {
    id: 'strong-sky-is-clear',
    quality_bucket: 'strong',
    headline: {
      en: 'A wide-open day — the sky is clear.',
      de: 'Ein weit offener Tag — der Himmel ist klar.',
      fr: 'Une journée grande ouverte — le ciel est dégagé.',
      'es-419': 'Un día de par en par — el cielo está despejado.',
      'pt-BR': 'Um dia escancarado — o céu está limpo.',
    },
    supporting_line: {
      en: "Good for big asks, launches, and decisions you've been holding. Few days like this in a season.",
      de: 'Gut für große Bitten, Starts und aufgeschobene Entscheidungen. Solche Tage gibt es selten in einer Saison.',
      fr: "Bon pour les grandes demandes, les lancements et les décisions en attente. Peu de jours comme celui-ci par saison.",
      'es-419': 'Bueno para grandes peticiones, lanzamientos y decisiones pendientes. Pocos días así por temporada.',
      'pt-BR': 'Bom para grandes pedidos, lançamentos e decisões adiadas. Poucos dias assim por temporada.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — >= 6 factors PASS, no factor FAIL, no excluded ranges',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'strong-venus-jupiter-pair': {
    id: 'strong-venus-jupiter-pair',
    quality_bucket: 'strong',
    headline: {
      en: 'A rare, full-handed day.',
      de: 'Ein seltener, reich gedeckter Tag.',
      fr: 'Une journée rare et bien remplie.',
      'es-419': 'Un día raro y bien servido.',
      'pt-BR': 'Um dia raro e farto.',
    },
    supporting_line: {
      en: 'Venus and Jupiter both in good standing — good for promises, partnerships, and starting things meant to last.',
      de: 'Venus und Jupiter stehen beide gut — gut für Versprechen, Partnerschaften und Dinge, die bleiben sollen.',
      fr: 'Vénus et Jupiter sont tous deux en bonne posture — bon pour les promesses, les partenariats et ce qui doit durer.',
      'es-419': 'Venus y Júpiter están bien situados — bueno para promesas, sociedades y empezar lo que debe durar.',
      'pt-BR': 'Vênus e Júpiter estão bem posicionados — bom para promessas, parcerias e começar o que deve durar.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS + jupiter_angular_or_aspecting PASS, both at weight_class >= high',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'strong-ruler-in-motion': {
    id: 'strong-ruler-in-motion',
    quality_bucket: 'strong',
    headline: {
      en: 'A bright day for setting things in motion.',
      de: 'Ein heller Tag, um Dinge in Gang zu bringen.',
      fr: 'Un jour lumineux pour lancer les choses.',
      'es-419': 'Un día luminoso para poner las cosas en marcha.',
      'pt-BR': 'Um dia luminoso para pôr as coisas em movimento.',
    },
    supporting_line: {
      en: "The kind of stretch worth using on something you've been waiting for. Good for nearly anything you've been putting off.",
      de: 'Die Art Tag, die sich für etwas lohnt, auf das du gewartet hast. Gut für fast alles Aufgeschobene.',
      fr: "Le genre de moment à consacrer à ce que tu attends. Bon pour presque tout ce que tu remets à plus tard.",
      'es-419': 'El tipo de momento ideal para algo esperado. Bueno para casi todo lo que se viene posponiendo.',
      'pt-BR': 'O tipo de momento certo para algo que você esperava. Bom para quase tudo o que vinha adiando.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — asc_ruler_strong PASS + house_ruler_dignified_well_placed PASS + jupiter_angular_or_aspecting PASS',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Good (60..74) ───

  'good-venus-warm': {
    id: 'good-venus-warm',
    quality_bucket: 'good',
    headline: {
      en: 'A tender day for beginnings.',
      de: 'Ein zarter Tag für Anfänge.',
      fr: 'Une journée tendre pour les commencements.',
      'es-419': 'Un día tierno para comenzar.',
      'pt-BR': 'Um dia terno para começos.',
    },
    supporting_line: {
      en: 'Venus is warm and dignified — good for soft conversations, small promises, and first steps. Hold the heaviest signings for clearer days.',
      de: 'Venus ist warm und in Würde — gut für sanfte Gespräche, kleine Versprechen und erste Schritte. Schwere Unterschriften für klarere Tage.',
      fr: "Vénus est chaleureuse et digne — bon pour les conversations douces, les petites promesses et les premiers pas. Gros contrats : plus tard.",
      'es-419': 'Venus está cálida y dignificada — bueno para conversaciones suaves, promesas pequeñas y primeros pasos. Firmas grandes: días más claros.',
      'pt-BR': 'Vênus está cálida e dignificada — bom para conversas suaves, pequenas promessas e primeiros passos. Assinaturas pesadas: dias mais claros.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-mercury-clear': {
    id: 'good-mercury-clear',
    quality_bucket: 'good',
    headline: {
      en: 'A clear day for plain words.',
      de: 'Ein klarer Tag für klare Worte.',
      fr: 'Une journée claire pour les mots simples.',
      'es-419': 'Un día claro para palabras simples.',
      'pt-BR': 'Um dia claro para palavras diretas.',
    },
    supporting_line: {
      en: 'Mercury runs clear — good for signing, sending, and saying what you mean. A workable stretch for paperwork.',
      de: 'Merkur läuft klar — gut zum Unterschreiben, Versenden und Klartext reden. Ein brauchbarer Tag für Papierkram.',
      fr: 'Mercure file clair — bon pour signer, envoyer et dire ce que tu penses. Un moment praticable pour la paperasse.',
      'es-419': 'Mercurio corre claro — bueno para firmar, enviar y decir lo que se piensa. Un momento práctico para el papeleo.',
      'pt-BR': 'Mercúrio corre claro — bom para assinar, enviar e dizer o que você pensa. Um momento prático para a papelada.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — mercury_dignified_direct_not_combust PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-steady': {
    id: 'good-moon-steady',
    quality_bucket: 'good',
    headline: {
      en: 'A steady day for what already exists.',
      de: 'Ein steter Tag für das, was schon besteht.',
      fr: "Une journée stable pour ce qui existe déjà.",
      'es-419': 'Un día estable para lo que ya existe.',
      'pt-BR': 'Um dia firme para o que já existe.',
    },
    supporting_line: {
      en: 'The Moon holds its shape — good for tending ongoing work, follow-ups, and keeping promises already made.',
      de: 'Der Mond hält seine Form — gut, um Laufendes zu pflegen, nachzuhaken und gegebene Versprechen zu halten.',
      fr: "La Lune garde sa forme — bon pour entretenir le travail en cours, relancer et tenir les promesses déjà faites.",
      'es-419': 'La Luna mantiene su forma — bueno para cuidar lo que está en curso, dar seguimiento y cumplir promesas ya hechas.',
      'pt-BR': 'A Lua mantém sua forma — bom para cuidar do que está em andamento, dar retorno e cumprir promessas já feitas.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_waxing_increasing_light PARTIAL or moon_and_asc_ruler_in_good_aspect PASS; no strong "beginnings" factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-jupiter-room-to-grow': {
    id: 'good-jupiter-room-to-grow',
    quality_bucket: 'good',
    headline: {
      en: 'A day with room to grow.',
      de: 'Ein Tag mit Raum zum Wachsen.',
      fr: 'Une journée avec de la place pour grandir.',
      'es-419': 'Un día con espacio para crecer.',
      'pt-BR': 'Um dia com espaço para crescer.',
    },
    supporting_line: {
      en: 'Jupiter is in view — good for asking for more than you usually would. Workable for launches, applications, and openings.',
      de: 'Jupiter ist in Sicht — gut, um mehr zu verlangen als sonst. Brauchbar für Starts, Bewerbungen und Eröffnungen.',
      fr: "Jupiter est en vue — bon pour demander plus que d'habitude. Praticable pour les lancements, candidatures et ouvertures.",
      'es-419': 'Júpiter está a la vista — bueno para pedir más de lo habitual. Práctico para lanzamientos, postulaciones y aperturas.',
      'pt-BR': 'Júpiter está à vista — bom para pedir mais do que o de costume. Prático para lançamentos, candidaturas e aberturas.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — jupiter_angular_or_aspecting PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-toward-benefic': {
    id: 'good-moon-toward-benefic',
    quality_bucket: 'good',
    headline: {
      en: 'A day for going further.',
      de: 'Ein Tag, um weiterzugehen.',
      fr: 'Une journée pour aller plus loin.',
      'es-419': 'Un día para ir más lejos.',
      'pt-BR': 'Um dia para ir mais longe.',
    },
    supporting_line: {
      en: 'The Moon moves toward a kind meeting — good for reaching out and conversations meant to land well.',
      de: 'Der Mond bewegt sich auf eine freundliche Begegnung zu — gut, um sich zu melden und Gespräche gut ankommen zu lassen.',
      fr: "La Lune s'approche d'une rencontre bienveillante — bon pour prendre contact et pour les conversations qui doivent bien passer.",
      'es-419': 'La Luna se aproxima a un encuentro amable — bueno para acercarse y para conversaciones que deben caer bien.',
      'pt-BR': 'A Lua se aproxima de um encontro gentil — bom para entrar em contato e para conversas que precisam soar bem.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_applying_to_benefic PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-asc-accord': {
    id: 'good-moon-asc-accord',
    quality_bucket: 'good',
    headline: {
      en: 'A day of quiet accord.',
      de: 'Ein Tag stiller Eintracht.',
      fr: "Une journée d'accord paisible.",
      'es-419': 'Un día de acuerdo tranquilo.',
      'pt-BR': 'Um dia de acordo tranquilo.',
    },
    supporting_line: {
      en: 'The Moon and the planet that stands for you are in good aspect — good for mutual decisions, joint paperwork, and meeting halfway.',
      de: 'Mond und dein Planet stehen im guten Aspekt — gut für gemeinsame Entscheidungen, geteilten Papierkram und Entgegenkommen.',
      fr: "La Lune et la planète qui te représente sont en bon aspect — bon pour les décisions communes, la paperasse partagée et les compromis.",
      'es-419': 'La Luna y el planeta que representa a uno están en buen aspecto — bueno para decisiones mutuas, papeleo conjunto y puntos medios.',
      'pt-BR': 'A Lua e o planeta que representa você estão em bom aspecto — bom para decisões mútuas, papelada conjunta e meio-termo.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_and_asc_ruler_in_good_aspect PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Mixed / Caution (40..59) ───

  'mixed-mercury-clear-jupiter-absent': {
    id: 'mixed-mercury-clear-jupiter-absent',
    quality_bucket: 'mixed',
    headline: {
      en: 'A day for plain words, not big asks.',
      de: 'Ein Tag für klare Worte, nicht große Bitten.',
      fr: 'Jour pour mots simples, pas pour gros enjeux.',
      'es-419': 'Día de palabras simples, no de grandes pedidos.',
      'pt-BR': 'Um dia de palavras diretas, não grandes pedidos.',
    },
    supporting_line: {
      en: 'Mercury runs clear, but Jupiter is absent — good for short messages and follow-ups; hold the big proposals for clearer days.',
      de: 'Merkur läuft klar, aber Jupiter fehlt — gut für kurze Nachrichten und Nachfassen; große Vorschläge für klarere Tage.',
      fr: "Mercure file clair, mais Jupiter est absent — bon pour les messages courts et les relances ; grandes propositions : jours plus clairs.",
      'es-419': 'Mercurio corre claro, pero Júpiter está ausente — bueno para mensajes breves y seguimientos; las grandes propuestas, para días más claros.',
      'pt-BR': 'Mercúrio corre claro, mas Júpiter está ausente — bom para mensagens curtas e retornos; deixe as grandes propostas para dias mais claros.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — mercury_dignified_direct_not_combust PASS + jupiter_angular_or_aspecting FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-venus-gentle-saturn-near': {
    id: 'mixed-venus-gentle-saturn-near',
    quality_bucket: 'mixed',
    headline: {
      en: 'Workable, with patience.',
      de: 'Machbar, mit Geduld.',
      fr: 'Praticable, avec de la patience.',
      'es-419': 'Llevadero, con paciencia.',
      'pt-BR': 'Viável, com paciência.',
    },
    supporting_line: {
      en: "Venus is gentle but Saturn is nearby — good for finishing what's started; hold off on starting anything new today.",
      de: 'Venus ist sanft, aber Saturn ist nah — gut, um Begonnenes zu beenden; fang heute nichts Neues an.',
      fr: "Vénus est douce mais Saturne est proche — bon pour finir ce qui est commencé ; évite de commencer du neuf aujourd'hui.",
      'es-419': 'Venus está suave pero Saturno está cerca — bueno para terminar lo empezado; mejor no iniciar nada nuevo hoy.',
      'pt-BR': 'Vênus está suave, mas Saturno está perto — bom para terminar o que começou; evite iniciar algo novo hoje.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PARTIAL + house_free_of_malefic PARTIAL or FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-moon-void-until-noon': {
    id: 'mixed-moon-void-until-noon',
    quality_bucket: 'mixed',
    headline: {
      en: 'A quieter morning, clearer after noon.',
      de: 'Ein stillerer Morgen, klarer nach Mittag.',
      fr: 'Une matinée plus calme, plus claire après midi.',
      'es-419': 'Mañana más calma, más clara tras el mediodía.',
      'pt-BR': 'Manhã mais quieta, mais clara após o meio-dia.',
    },
    supporting_line: {
      en: 'The Moon is between aspects until midday — time important calls for the afternoon.',
      de: 'Der Mond steht bis Mittag zwischen den Aspekten — leg wichtige Anrufe auf den Nachmittag.',
      fr: "La Lune est entre les aspects jusqu'à midi — programme les appels importants pour l'après-midi.",
      'es-419': 'La Luna está entre aspectos hasta el mediodía — conviene dejar las llamadas importantes para la tarde.',
      'pt-BR': 'A Lua está entre os aspectos até o meio-dia — deixe as ligações importantes para a tarde.',
    },
    horizon_class: 'intraday',
    dominant_factors_hint:
      'PROVISIONAL — intraday moon-void or moon-via-combusta ending before today\'s evening; the picker MUST verify intraday timing exists for today specifically',
    surface: 'daily-note',
    needs_vague_fallback: true,
  },

  'mixed-moon-steady-sky-thin': {
    id: 'mixed-moon-steady-sky-thin',
    quality_bucket: 'mixed',
    headline: {
      en: 'A day for tending, not building.',
      de: 'Ein Tag zum Pflegen, nicht zum Bauen.',
      fr: 'Une journée pour entretenir, pas pour bâtir.',
      'es-419': 'Un día para cuidar, no para construir.',
      'pt-BR': 'Um dia para cuidar, não para construir.',
    },
    supporting_line: {
      en: 'The Moon is steady but the sky is thin — good for follow-ups, edits, and small corrections. Save the launches for stronger days.',
      de: 'Der Mond ist stet, aber der Himmel ist dünn — gut für Nachfassen, Korrekturen und kleine Ausbesserungen. Starts für stärkere Tage.',
      fr: "La Lune est stable mais le ciel est pauvre — bon pour les relances, retouches et petites corrections. Lancements : jours plus forts.",
      'es-419': 'La Luna está estable pero el cielo está pobre — bueno para seguimientos, retoques y correcciones pequeñas. Lanzamientos: días más fuertes.',
      'pt-BR': 'A Lua está firme, mas o céu está fraco — bom para retornos, ajustes e pequenas correções. Deixe os lançamentos para dias mais fortes.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — moon_waxing_increasing_light PASS but most other dominant factors FAIL or PARTIAL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-venus-bright-mercury-dim': {
    id: 'mixed-venus-bright-mercury-dim',
    quality_bucket: 'mixed',
    headline: {
      en: 'A mixed day — choose carefully.',
      de: 'Ein gemischter Tag — wähle mit Bedacht.',
      fr: 'Une journée mitigée — choisis avec soin.',
      'es-419': 'Un día mixto — conviene elegir con cuidado.',
      'pt-BR': 'Um dia misto — escolha com cuidado.',
    },
    supporting_line: {
      en: 'Venus is bright but Mercury is dim — good for soft conversations; hold the signed paperwork.',
      de: 'Venus ist hell, aber Merkur ist matt — gut für sanfte Gespräche; halt unterschriebenen Papierkram zurück.',
      fr: "Vénus est lumineuse mais Mercure est terne — bon pour les conversations douces ; garde la paperasse signée pour plus tard.",
      'es-419': 'Venus está brillante pero Mercurio está apagado — bueno para conversaciones suaves; mejor esperar con los papeles firmados.',
      'pt-BR': 'Vênus está brilhante, mas Mercúrio está apagado — bom para conversas suaves; segure a papelada assinada.',
    },
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS + mercury_dignified_direct_not_combust FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Closed-by-exclusion ───

  'closed-moon-voc': {
    id: 'closed-moon-voc',
    quality_bucket: 'closed',
    // Warm void-of-course form — glossary "between signs" image (pt-BR technical
    // term is "Lua Fora de Curso"; we keep the warm "entre os signos" here).
    headline: {
      en: 'The Moon is between signs today.',
      de: 'Der Mond steht heute zwischen den Zeichen.',
      fr: "La Lune est entre les signes aujourd'hui.",
      'es-419': 'La Luna está entre signos hoy.',
      'pt-BR': 'A Lua está entre os signos hoje.',
    },
    supporting_line: {
      en: "A stretch where new starts don't take root — good for finishing, sorting, and waiting. Better days are nearby.",
      de: 'Eine Phase, in der neue Anfänge nicht Wurzeln schlagen — gut zum Abschließen, Ordnen und Warten. Bessere Tage sind nah.',
      fr: "Une période où les nouveaux départs ne prennent pas racine — bon pour finir, trier et attendre. De meilleurs jours sont proches.",
      'es-419': 'Una etapa en que los nuevos comienzos no echan raíz — bueno para terminar, ordenar y esperar. Días mejores están cerca.',
      'pt-BR': 'Uma fase em que os novos começos não criam raiz — bom para terminar, organizar e esperar. Dias melhores estão por perto.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'moon_voc' covering today's daylight hours",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // provisional — matches pending EN; re-translate if ruling changes.
  // (pending_astrologer_ruling: Mercury-rx group — keeps the LOCKED warm
  // "Mercury is sleeping" image in every locale per the glossary.)
  'closed-mercury-retrograde': {
    id: 'closed-mercury-retrograde',
    quality_bucket: 'closed',
    headline: {
      en: 'Mercury is sleeping.',
      de: 'Merkur schläft.',
      fr: 'Mercure dort.',
      'es-419': 'Mercurio duerme.',
      'pt-BR': 'Mercúrio está dormindo.',
    },
    supporting_line: {
      en: 'Words need extra care until Thursday — good for re-reading and editing; hold the heavy signing for clearer days.',
      de: 'Worte brauchen bis Donnerstag mehr Sorgfalt — gut zum Nachlesen und Überarbeiten; schwere Unterschriften für klarere Tage.',
      fr: "Les mots demandent un soin particulier jusqu'à jeudi — bon pour relire et corriger ; signatures lourdes : jours plus clairs.",
      'es-419': 'Las palabras piden cuidado extra hasta el jueves — bueno para releer y corregir; las firmas pesadas, para días más claros.',
      'pt-BR': 'As palavras pedem cuidado extra até quinta — bom para reler e revisar; deixe as assinaturas pesadas para dias mais claros.',
    },
    horizon_class: 'concrete-date',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'mercury_retrograde' AND Mercury direct-station date is <= 3 days away",
    surface: 'daily-note',
    needs_vague_fallback: true,
    pending_astrologer_ruling: true,
  },

  // provisional — matches pending EN; re-translate if ruling changes.
  // (pending_astrologer_ruling: Venus-rx group — keeps the warm "Venus is
  // resting" image per the glossary.)
  'closed-venus-retrograde': {
    id: 'closed-venus-retrograde',
    quality_bucket: 'closed',
    headline: {
      en: 'Venus is resting.',
      de: 'Venus ruht.',
      fr: 'Vénus se repose.',
      'es-419': 'Venus descansa.',
      'pt-BR': 'Vênus está descansando.',
    },
    supporting_line: {
      en: 'A long quiet stretch for matters of the heart — good for tending what already exists; new commitments can wait.',
      de: 'Eine lange stille Phase für Herzensdinge — gut, um Bestehendes zu pflegen; neue Bindungen können warten.',
      fr: "Une longue période tranquille pour le cœur — bon pour entretenir ce qui existe déjà ; les nouveaux engagements peuvent attendre.",
      'es-419': 'Una etapa larga y tranquila para los asuntos del corazón — bueno para cuidar lo que ya existe; los nuevos compromisos pueden esperar.',
      'pt-BR': 'Uma fase longa e quieta para os assuntos do coração — bom para cuidar do que já existe; os novos compromissos podem esperar.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'venus_retrograde' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
    pending_astrologer_ruling: true,
  },

  'closed-eclipse-window': {
    id: 'closed-eclipse-window',
    quality_bucket: 'closed',
    headline: {
      en: 'An eclipse week — the sky asks for stillness.',
      de: 'Finsternis-Woche — der Himmel bittet um Stille.',
      fr: "Semaine d'éclipse — le ciel demande du calme.",
      'es-419': 'Una semana de eclipse — el cielo pide quietud.',
      'pt-BR': 'Uma semana de eclipse — o céu pede quietude.',
    },
    supporting_line: {
      en: 'Hold off on starts and big decisions while the eclipse passes. Better days are within reach.',
      de: 'Warte mit Anfängen und großen Entscheidungen, bis die Finsternis vorbei ist. Bessere Tage sind in Reichweite.',
      fr: "Diffère les débuts et les grandes décisions le temps que l'éclipse passe. De meilleurs jours sont à portée.",
      'es-419': 'Conviene posponer comienzos y grandes decisiones mientras pasa el eclipse. Días mejores están al alcance.',
      'pt-BR': 'Adie começos e grandes decisões enquanto o eclipse passa. Dias melhores estão ao alcance.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'eclipse_window' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-malefic-on-angle': {
    id: 'closed-malefic-on-angle',
    quality_bucket: 'closed',
    headline: {
      en: 'A difficult planet sits on the angles today.',
      de: 'Ein schwieriger Planet steht an den Achsen.',
      fr: "Une planète difficile est sur les angles.",
      'es-419': 'Un planeta difícil está sobre los ángulos hoy.',
      'pt-BR': 'Um planeta difícil está sobre os ângulos hoje.',
    },
    supporting_line: {
      en: 'A charged stretch — better used for closing things than starting them. Tomorrow opens cleaner.',
      de: 'Eine aufgeladene Phase — besser zum Abschließen als zum Anfangen. Morgen öffnet sich klarer.',
      fr: "Une période chargée — mieux vaut clore que commencer. Demain s'ouvre plus net.",
      'es-419': 'Una etapa cargada — mejor para cerrar cosas que para empezarlas. Mañana abre más limpio.',
      'pt-BR': 'Uma fase carregada — melhor para fechar do que para começar. Amanhã abre mais limpo.',
    },
    horizon_class: 'concrete-date',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'malefic_on_angle' covering today AND the malefic moves off the angle by tomorrow",
    surface: 'daily-note',
    needs_vague_fallback: true,
  },

  'closed-long-quiet-stretch': {
    id: 'closed-long-quiet-stretch',
    quality_bucket: 'closed',
    headline: {
      en: 'A long quiet stretch in the sky.',
      de: 'Eine lange stille Phase am Himmel.',
      fr: 'Une longue période calme dans le ciel.',
      'es-419': 'Una etapa larga y tranquila en el cielo.',
      'pt-BR': 'Uma fase longa e quieta no céu.',
    },
    supporting_line: {
      en: 'Not a day for new starts — good for sorting, naming, and getting your list straight before clearer days arrive.',
      de: 'Kein Tag für neue Anfänge — gut zum Ordnen, Benennen und deine Liste zu klären, bevor klarere Tage kommen.',
      fr: "Pas un jour pour de nouveaux départs — bon pour trier, nommer et mettre ta liste au clair avant des jours plus dégagés.",
      'es-419': 'No es día para nuevos comienzos — bueno para ordenar, nombrar y poner la lista en claro antes de que lleguen días más despejados.',
      'pt-BR': 'Não é dia para novos começos — bom para organizar, nomear e acertar sua lista antes que cheguem dias mais claros.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — extended period of multiple overlapping excluded ranges or persistently low scores; the default closed-by-exclusion fallback when no single named reason dominates',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-moon-via-combusta': {
    id: 'closed-moon-via-combusta',
    quality_bucket: 'closed',
    headline: {
      en: 'A more difficult Moon today.',
      de: 'Ein schwierigerer Mond heute.',
      fr: "Une Lune plus difficile aujourd'hui.",
      'es-419': 'Una Luna más difícil hoy.',
      'pt-BR': 'Uma Lua mais difícil hoje.',
    },
    // Keep the Latin "via combusta" per glossary; translate only the verb.
    supporting_line: {
      en: 'The Moon walks the via combusta — good for closing things, sorting, and waiting. Better days are nearby.',
      de: 'Der Mond wandert über die Via Combusta — gut zum Abschließen, Ordnen und Warten. Bessere Tage sind nah.',
      fr: "La Lune chemine sur la via combusta — bon pour clore, trier et attendre. De meilleurs jours sont proches.",
      'es-419': 'La Luna recorre la vía combusta — bueno para cerrar cosas, ordenar y esperar. Días mejores están cerca.',
      'pt-BR': 'A Lua percorre a Via Combusta — bom para fechar coisas, organizar e esperar. Dias melhores estão por perto.',
    },
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'moon_via_combusta' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },
};
