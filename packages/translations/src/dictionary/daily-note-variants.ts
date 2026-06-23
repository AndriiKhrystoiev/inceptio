import type { DailyNoteVariantPool, KnownDailyNoteId } from '../types';

/**
 * Sibling variants for long-running excluded-reason entries. The picker
 * rotates among `[primary] ++ variants` using a date-seeded deterministic
 * hash so the same UTC date always shows the same variant for the same
 * location.
 *
 * Variants stay within the same voice and same astrological claim — only
 * the phrasing rotates. Astrologer review (§11.4) should confirm each
 * variant is faithful to the primary's meaning.
 *
 * VOICE phase: each user-facing leaf (`headline`, `supporting_line`) is a
 * `Localized` Record { en, de, fr, 'es-419', 'pt-BR' }. en is authoritative;
 * the four others are register-correct DRAFTS pending best-effort community
 * review (de=du, fr=tu provisional, es-419 voseo-neutral, pt-BR você).
 * Glossary-guided per docs/superpowers/glossary/i18n-termbase.md.
 */
export const DAILY_NOTE_VARIANT_POOLS: Partial<
  Record<KnownDailyNoteId, DailyNoteVariantPool>
> = {
  // RULING-PENDING group (closed-mercury-retrograde): Mercury rx school
  // differences matter; translated provisionally to match the current EN
  // meaning — re-translate if the astrologer ruling changes the English.
  'closed-mercury-retrograde': {
    primary_entry_id: 'closed-mercury-retrograde',
    variants: [
      {
        headline: {
          en: 'Mercury is walking back.',
          de: 'Merkur geht zurück.',
          fr: 'Mercure revient sur ses pas.',
          'es-419': 'Mercurio anda hacia atrás.',
          'pt-BR': 'Mercúrio está voltando atrás.',
        },
        supporting_line: {
          en: 'A stretch for revisiting and re-reading — good for editing and double-checking; hold the heavy signing for clearer days.',
          de: 'Eine Zeit zum Wiederlesen und Überarbeiten — gut zum Korrigieren und Prüfen; das große Unterschreiben hebst du dir für klarere Tage auf.',
          fr: 'Une période pour revenir sur les choses et relire — idéale pour corriger et vérifier ; garde les signatures importantes pour des jours plus clairs.',
          'es-419': 'Un tramo para revisar y releer — bueno para editar y comprobar; mejor dejar las firmas importantes para días más claros.',
          'pt-BR': 'Um período para revisitar e reler — bom para editar e conferir; deixe as assinaturas importantes para dias mais claros.',
        },
      },
      {
        headline: {
          en: 'A week of careful words.',
          de: 'Eine Woche der sorgsamen Worte.',
          fr: 'Une semaine de mots prudents.',
          'es-419': 'Una semana de palabras cuidadosas.',
          'pt-BR': 'Uma semana de palavras cuidadosas.',
        },
        supporting_line: {
          en: 'Mercury is reversed — good for going over what already exists; hold off on new agreements for now.',
          de: 'Merkur läuft rückwärts — gut, um Bestehendes durchzugehen; mit neuen Vereinbarungen wartest du vorerst.',
          fr: 'Mercure est à rebours — idéal pour revoir ce qui existe déjà ; attends encore avant de nouveaux accords.',
          'es-419': 'Mercurio va en reversa — bueno para repasar lo que ya existe; mejor esperar con los nuevos acuerdos por ahora.',
          'pt-BR': 'Mercúrio está em marcha à ré — bom para revisar o que já existe; segure os novos acordos por enquanto.',
        },
      },
    ],
  },

  // RULING-PENDING group (closed-venus-retrograde): Venus rx school
  // differences matter; translated provisionally to match the current EN
  // meaning — re-translate if the astrologer ruling changes the English.
  'closed-venus-retrograde': {
    primary_entry_id: 'closed-venus-retrograde',
    variants: [
      {
        headline: {
          en: 'Venus is looking back.',
          de: 'Venus blickt zurück.',
          fr: 'Vénus regarde en arrière.',
          'es-419': 'Venus mira hacia atrás.',
          'pt-BR': 'Vênus está olhando para trás.',
        },
        supporting_line: {
          en: 'A long quiet stretch for matters of the heart — good for revisiting what was started; new commitments can wait.',
          de: 'Eine lange stille Zeit für Herzensdinge — gut, um Begonnenes wieder aufzugreifen; neue Bindungen können warten.',
          fr: 'Une longue période calme pour les affaires de cœur — idéale pour revenir sur ce qui a été commencé ; les nouveaux engagements peuvent attendre.',
          'es-419': 'Un tramo largo y tranquilo para los asuntos del corazón — bueno para retomar lo empezado; los compromisos nuevos pueden esperar.',
          'pt-BR': 'Um longo período tranquilo para as questões do coração — bom para retomar o que foi começado; os novos compromissos podem esperar.',
        },
      },
      {
        headline: {
          en: 'A stretch for tending, not promising.',
          de: 'Eine Zeit zum Pflegen, nicht zum Versprechen.',
          fr: 'Une période pour entretenir, pas pour promettre.',
          'es-419': 'Un tramo para cuidar, no para prometer.',
          'pt-BR': 'Um período para cuidar, não para prometer.',
        },
        supporting_line: {
          en: 'Venus is in review — good for honouring what already exists; hold the new vows for later.',
          de: 'Venus schaut zurück — gut, um zu würdigen, was schon da ist; neue Versprechen hebst du dir für später auf.',
          fr: 'Vénus est en révision — idéale pour honorer ce qui existe déjà ; garde les nouvelles promesses pour plus tard.',
          'es-419': 'Venus está en revisión — bueno para honrar lo que ya existe; mejor dejar las nuevas promesas para después.',
          'pt-BR': 'Vênus está em revisão — bom para honrar o que já existe; deixe os novos votos para depois.',
        },
      },
    ],
  },

  // Added 2026-06-01 after the June empirical batch showed moon_voc
  // firing 19 days/month (pre-fix) with zero phrasing variation. After
  // the no_viable_windows classification fix, day-dominating moon_voc
  // still fires ~10 days/month — rotation is MVP-blocking.
  //
  // Astrologer pre-review NOT required: Moon void of course is
  // uncontroversial across traditional schools (Lilly, Bonatti, Brennan
  // all converge). Unlike Mercury/Venus rx where school differences
  // matter, the meaning of "Moon between signs" is stable. The pool
  // sticks to "between signs / between aspects / between-time"
  // phrasings — the same astrological claim, three voices.
  'closed-moon-voc': {
    primary_entry_id: 'closed-moon-voc',
    variants: [
      {
        headline: {
          en: 'The Moon is wandering between signs.',
          de: 'Der Mond wandert zwischen den Zeichen.',
          fr: 'La Lune erre entre les signes.',
          'es-419': 'La Luna vaga entre signos.',
          'pt-BR': 'A Lua vagueia entre os signos.',
        },
        supporting_line: {
          en: "Today's beginnings are slow to take root — gentle for closing tabs and tying loose ends; bigger starts can wait.",
          de: 'Was heute beginnt, fasst nur langsam Fuß — sanft, um Offenes zu schließen und Lose zu binden; größere Anfänge können warten.',
          fr: "Ce qui commence aujourd'hui prend racine lentement — doux pour clore ce qui traîne et nouer les fils ; les grands débuts peuvent attendre.",
          'es-419': 'Lo que empieza hoy tarda en echar raíces — suave para cerrar pendientes y atar cabos; los comienzos grandes pueden esperar.',
          'pt-BR': 'O que começa hoje demora a criar raízes — suave para fechar pendências e amarrar pontas soltas; os grandes começos podem esperar.',
        },
      },
      {
        headline: {
          en: 'A quiet day in the Moon’s between-time.',
          de: 'Ein stiller Tag in der Zwischenzeit des Mondes.',
          fr: "Un jour calme dans l'entre-temps de la Lune.",
          'es-419': 'Un día tranquilo en el tiempo intermedio de la Luna.',
          'pt-BR': 'Um dia tranquilo no entretempo da Lua.',
        },
        supporting_line: {
          en: 'New things begun now drift — good for sorting and tending; the sky opens again soon.',
          de: 'Was jetzt neu beginnt, treibt davon — gut zum Ordnen und Pflegen; der Himmel öffnet sich bald wieder.',
          fr: "Ce qu'on commence maintenant dérive — bon pour ranger et entretenir ; le ciel se rouvre bientôt.",
          'es-419': 'Lo que se empieza ahora se dispersa — bueno para ordenar y cuidar; el cielo vuelve a abrirse pronto.',
          'pt-BR': 'O que se começa agora se dispersa — bom para organizar e cuidar; o céu se abre de novo em breve.',
        },
      },
      {
        headline: {
          en: 'The Moon is between aspects today.',
          de: 'Der Mond steht heute zwischen den Aspekten.',
          fr: "La Lune est entre les aspects aujourd'hui.",
          'es-419': 'Hoy la Luna está entre aspectos.',
          'pt-BR': 'Hoje a Lua está entre os aspectos.',
        },
        supporting_line: {
          en: "A day where beginnings feel weightless — better used for finishing what's already in motion. Clearer days are close.",
          de: 'Ein Tag, an dem Anfänge schwerelos wirken — besser genutzt, um Laufendes zu beenden. Klarere Tage sind nah.',
          fr: 'Un jour où les débuts semblent sans poids — mieux vaut achever ce qui est déjà en cours. Des jours plus clairs sont proches.',
          'es-419': 'Un día en que los comienzos se sienten sin peso — mejor para terminar lo que ya está en marcha. Los días más claros están cerca.',
          'pt-BR': 'Um dia em que os começos parecem sem peso — melhor para terminar o que já está em andamento. Dias mais claros estão perto.',
        },
      },
    ],
  },

  // Eclipse windows hit 2-3x/year for 7-14 days each. Without rotation,
  // the same headline would dominate the daily note for a stretch most
  // likely to feel ominous to users — variant rotation softens that
  // without contradicting tradition's "wait this out" reading.
  //
  // Astrologer pre-review NOT required: eclipse-as-stillness-prompt is
  // uncontroversial across Hellenistic, medieval, and modern schools.
  'closed-eclipse-window': {
    primary_entry_id: 'closed-eclipse-window',
    variants: [
      {
        headline: {
          en: 'A stretch held by an eclipse.',
          de: 'Eine Zeit, gehalten von einer Finsternis.',
          fr: 'Une période tenue par une éclipse.',
          'es-419': 'Un tramo sostenido por un eclipse.',
          'pt-BR': 'Um período sustentado por um eclipse.',
        },
        supporting_line: {
          en: 'Not a season for new starts — a time for waiting things out. Clearer days come soon after.',
          de: 'Keine Zeit für neue Anfänge — eine Zeit zum Abwarten. Klarere Tage folgen bald darauf.',
          fr: 'Pas une saison pour de nouveaux départs — un temps pour laisser passer. Des jours plus clairs viennent peu après.',
          'es-419': 'No es temporada de comienzos nuevos — un tiempo para dejar pasar. Los días más claros llegan poco después.',
          'pt-BR': 'Não é época de novos começos — um tempo para deixar passar. Dias mais claros vêm logo depois.',
        },
      },
      {
        headline: {
          en: 'The sky is hushed by an eclipse.',
          de: 'Der Himmel ist von einer Finsternis still geworden.',
          fr: 'Le ciel est apaisé par une éclipse.',
          'es-419': 'El cielo se ha aquietado por un eclipse.',
          'pt-BR': 'O céu se aquietou por um eclipse.',
        },
        supporting_line: {
          en: 'Hold the big decisions through this window — what passes through eclipse light rarely settles cleanly. Better days are within reach.',
          de: 'Halte die großen Entscheidungen durch dieses Fenster zurück — was durch Finsternislicht geht, setzt sich selten sauber. Bessere Tage sind in Reichweite.',
          fr: "Garde les grandes décisions pendant cette fenêtre — ce qui traverse la lumière d'éclipse se pose rarement nettement. Des jours meilleurs sont à portée.",
          'es-419': 'Mejor retener las grandes decisiones durante esta ventana — lo que pasa por la luz del eclipse rara vez se asienta limpio. Hay días mejores al alcance.',
          'pt-BR': 'Segure as grandes decisões durante esta janela — o que passa pela luz do eclipse raramente se assenta com clareza. Dias melhores estão ao alcance.',
        },
      },
      {
        headline: {
          en: 'An eclipse stretch — stillness over starting.',
          de: 'Eine Finsternis-Zeit — Stille statt Aufbruch.',
          fr: "Une période d'éclipse — l'immobilité plutôt que le départ.",
          'es-419': 'Un tramo de eclipse — quietud antes que comienzo.',
          'pt-BR': 'Um período de eclipse — quietude em vez de começo.',
        },
        supporting_line: {
          en: 'A week the sky asks you to wait. Hold off on launches and signings; what waits through eclipse usually starts more cleanly after.',
          de: 'Eine Woche, in der der Himmel dich ums Warten bittet. Verschiebe Starts und Unterschriften; was die Finsternis abwartet, beginnt danach meist sauberer.',
          fr: 'Une semaine où le ciel te demande d’attendre. Diffère les lancements et les signatures ; ce qui attend la fin de l’éclipse démarre souvent plus nettement après.',
          'es-419': 'Una semana en que el cielo pide esperar. Mejor postergar lanzamientos y firmas; lo que aguarda hasta pasar el eclipse suele empezar más limpio después.',
          'pt-BR': 'Uma semana em que o céu pede que você espere. Adie lançamentos e assinaturas; o que aguarda o eclipse passar costuma começar mais limpo depois.',
        },
      },
    ],
  },

  // Added 2026-06-01 after the post-fix June batch surfaced the same
  // retention-risk pattern in mixed-bucket that closed-bucket had pre-fix:
  // 17 of 30 days fired this single entry because the picker's mixed
  // selection logic (picker.ts:pickByDominantFactor) has only 3 branches
  // and every partial-void day with non-venus/non-mercury PASS factors
  // falls through here. Selection-logic refinement is deferred to the
  // astrologer brief (BLOCKING #3 in §11.4); rotation is the immediate
  // diffusion fix.
  //
  // Astrologer pre-review NOT required: "steady but thin → small moves"
  // is uncontroversial across schools. The claim under all three siblings
  // is the same — positive enough for tending and follow-up, not strong
  // enough for new launches.
  'mixed-moon-steady-sky-thin': {
    primary_entry_id: 'mixed-moon-steady-sky-thin',
    variants: [
      {
        headline: {
          en: 'A day for steady hands, not big swings.',
          de: 'Ein Tag für ruhige Hände, nicht für große Sprünge.',
          fr: 'Un jour pour des mains posées, pas pour de grands écarts.',
          'es-419': 'Un día para manos firmes, no para grandes saltos.',
          'pt-BR': 'Um dia para mãos firmes, não para grandes saltos.',
        },
        supporting_line: {
          en: "The sky is workable but thin — good for tending what's already in motion; save the bigger asks for clearer days.",
          de: 'Der Himmel trägt, aber dünn — gut, um Laufendes zu pflegen; die größeren Vorhaben hebst du dir für klarere Tage auf.',
          fr: "Le ciel est praticable mais mince — bon pour entretenir ce qui est déjà en cours ; garde les plus grandes demandes pour des jours plus clairs.",
          'es-419': 'El cielo es manejable pero delgado — bueno para cuidar lo que ya está en marcha; mejor guardar los pedidos mayores para días más claros.',
          'pt-BR': 'O céu é viável, mas fino — bom para cuidar do que já está em andamento; guarde os pedidos maiores para dias mais claros.',
        },
      },
      {
        headline: {
          en: 'Workable, but small.',
          de: 'Machbar, aber klein.',
          fr: 'Praticable, mais modeste.',
          'es-419': 'Manejable, pero pequeño.',
          'pt-BR': 'Viável, mas pequeno.',
        },
        supporting_line: {
          en: "The Moon is steady; the rest of the sky is quiet — good for follow-ups and finishing what's started, not for new launches.",
          de: 'Der Mond ist ruhig; der übrige Himmel ist still — gut für Nachfassen und das Beenden von Begonnenem, nicht für neue Starts.',
          fr: "La Lune est stable ; le reste du ciel est calme — bon pour les suivis et pour achever ce qui est commencé, pas pour de nouveaux lancements.",
          'es-419': 'La Luna está estable; el resto del cielo está tranquilo — bueno para seguimientos y para terminar lo empezado, no para nuevos lanzamientos.',
          'pt-BR': 'A Lua está firme; o resto do céu está quieto — bom para acompanhamentos e para terminar o que foi começado, não para novos lançamentos.',
        },
      },
      {
        headline: {
          en: 'A measured day — small moves first.',
          de: 'Ein maßvoller Tag — erst die kleinen Schritte.',
          fr: "Un jour mesuré — d'abord les petits pas.",
          'es-419': 'Un día mesurado — primero los pasos pequeños.',
          'pt-BR': 'Um dia comedido — primeiro os passos pequenos.',
        },
        supporting_line: {
          en: 'The sky carries you for tending and follow-up; hold the bigger asks for stronger days.',
          de: 'Der Himmel trägt dich fürs Pflegen und Nachfassen; die größeren Vorhaben hebst du dir für stärkere Tage auf.',
          fr: 'Le ciel te porte pour entretenir et faire le suivi ; garde les plus grandes demandes pour des jours plus forts.',
          'es-419': 'El cielo acompaña para cuidar y dar seguimiento; mejor guardar los pedidos mayores para días más fuertes.',
          'pt-BR': 'O céu acompanha você para cuidar e acompanhar; guarde os pedidos maiores para dias mais fortes.',
        },
      },
      // Variants 4 & 5 added 2026-06-01 after diffusion simulation showed
      // the 4-sibling pool's max-per-variant (6/30) still crossed the >4×
      // retention threshold for this entry's high firing volume (17/30).
      // Per §11.4 "Variant pool sizing — calibration rule", else-fallthrough
      // entries need pools sized to their empirical catch rate, not to the
      // abstract 4× threshold used for specific-pattern entries. Both fill
      // a distinct semantic angle while preserving the uncontroversial
      // "positive enough for tending, not strong enough for launches" claim:
      //   v4 — continuation/maintenance ("what's already in motion")
      //   v5 — light productive lift ("finishing edges")
      {
        headline: {
          en: "A day for what's already in motion.",
          de: 'Ein Tag für das, was schon in Bewegung ist.',
          fr: "Un jour pour ce qui est déjà en mouvement.",
          'es-419': 'Un día para lo que ya está en marcha.',
          'pt-BR': 'Um dia para o que já está em movimento.',
        },
        supporting_line: {
          en: 'The sky favors follow-through, not fresh starts — good for keeping projects on track; the bigger asks deserve clearer days.',
          de: 'Der Himmel begünstigt das Dranbleiben, nicht den Neustart — gut, um Projekte auf Kurs zu halten; die größeren Vorhaben verdienen klarere Tage.',
          fr: 'Le ciel favorise la persévérance, pas les nouveaux départs — bon pour garder les projets sur les rails ; les plus grandes demandes méritent des jours plus clairs.',
          'es-419': 'El cielo favorece la constancia, no los comienzos nuevos — bueno para mantener los proyectos en marcha; los pedidos mayores merecen días más claros.',
          'pt-BR': 'O céu favorece a continuidade, não os começos novos — bom para manter os projetos no rumo; os pedidos maiores merecem dias mais claros.',
        },
      },
      {
        headline: {
          en: 'A day for finishing edges.',
          de: 'Ein Tag, um Kanten zu glätten.',
          fr: 'Un jour pour finir les bords.',
          'es-419': 'Un día para rematar detalles.',
          'pt-BR': 'Um dia para arrematar pontas.',
        },
        supporting_line: {
          en: "The sky is right for closing out what's almost done — good for the small finishing work; bigger starts can wait for stronger days.",
          de: 'Der Himmel passt, um fast Fertiges abzuschließen — gut für die kleine Feinarbeit; größere Anfänge können auf stärkere Tage warten.',
          fr: "Le ciel est propice à boucler ce qui est presque fini — bon pour les petites finitions ; les plus grands débuts peuvent attendre des jours plus forts.",
          'es-419': 'El cielo es propicio para cerrar lo que está casi listo — bueno para los remates pequeños; los comienzos grandes pueden esperar días más fuertes.',
          'pt-BR': 'O céu é propício para fechar o que está quase pronto — bom para os pequenos arremates; os grandes começos podem esperar dias mais fortes.',
        },
      },
    ],
  },

  // Added 2026-06-01 alongside mixed-moon-steady-sky-thin for the same
  // reason: 6 firings in 30 days crossed the §11.4 IMPORTANT #9
  // retention threshold. Strong-bucket selection has 3 branches (6+ PASS,
  // venus+jupiter pair, else); the else-fallthrough is this entry, and
  // most strong days in real upstream data don't hit the two specific
  // branches.
  //
  // Astrologer pre-review NOT required: "the ruler is dignified and the
  // sky carries action well" is uncontroversial across schools. All three
  // siblings carry the same claim — bright supportive sky worth using.
  'strong-ruler-in-motion': {
    primary_entry_id: 'strong-ruler-in-motion',
    variants: [
      {
        headline: {
          en: "A stretch for what you've been waiting on.",
          de: 'Eine Zeit für das, worauf du gewartet hast.',
          fr: "Une période pour ce que tu attendais.",
          'es-419': 'Un tramo para aquello que se venía esperando.',
          'pt-BR': 'Um período para aquilo que você esperava.',
        },
        supporting_line: {
          en: 'The sky carries this kind of day well — good for taking the thing off the list, signing the thing, starting the thing.',
          de: 'Der Himmel trägt einen solchen Tag gut — gut, um die Sache von der Liste zu nehmen, sie zu unterschreiben, sie anzufangen.',
          fr: "Le ciel porte bien ce genre de jour — bon pour rayer la chose de la liste, la signer, la lancer.",
          'es-419': 'El cielo lleva bien este tipo de día — bueno para tachar el asunto de la lista, firmarlo, comenzarlo.',
          'pt-BR': 'O céu sustenta bem um dia assim — bom para tirar a coisa da lista, assiná-la, começá-la.',
        },
      },
      {
        headline: {
          en: 'A clear day — worth using.',
          de: 'Ein klarer Tag — wert, ihn zu nutzen.',
          fr: 'Un jour clair — qui vaut la peine.',
          'es-419': 'Un día claro — vale la pena usarlo.',
          'pt-BR': 'Um dia claro — vale a pena usá-lo.',
        },
        supporting_line: {
          en: "Conditions favor action — good for the launches and decisions you've been putting off; the sky won't be like this every day.",
          de: 'Die Lage begünstigt Handeln — gut für die Starts und Entscheidungen, die du aufgeschoben hast; so ist der Himmel nicht an jedem Tag.',
          fr: "Les conditions favorisent l'action — bon pour les lancements et décisions que tu remettais ; le ciel ne sera pas ainsi tous les jours.",
          'es-419': 'Las condiciones favorecen la acción — bueno para los lanzamientos y decisiones que se venían postergando; el cielo no estará así todos los días.',
          'pt-BR': 'As condições favorecem a ação — bom para os lançamentos e decisões que você vinha adiando; o céu não estará assim todo dia.',
        },
      },
      {
        headline: {
          en: 'A day with momentum behind it.',
          de: 'Ein Tag mit Schwung im Rücken.',
          fr: 'Un jour porté par un élan.',
          'es-419': 'Un día con impulso de respaldo.',
          'pt-BR': 'Um dia com impulso por trás.',
        },
        supporting_line: {
          en: "The sky is on side — good for setting things in motion, making the call, asking the thing. Use it for what's been waiting.",
          de: 'Der Himmel ist auf deiner Seite — gut, um Dinge in Gang zu bringen, anzurufen, die Sache zu erbitten. Nutze ihn für das, was gewartet hat.',
          fr: "Le ciel est de ton côté — bon pour mettre les choses en branle, passer l'appel, demander la chose. Profites-en pour ce qui attendait.",
          'es-419': 'El cielo está a favor — bueno para poner cosas en marcha, hacer la llamada, pedir lo que hace falta. Aprovecharlo para lo que estaba esperando.',
          'pt-BR': 'O céu está a favor — bom para colocar as coisas em movimento, fazer a ligação, pedir a coisa. Use-o para o que estava esperando.',
        },
      },
    ],
  },
};
