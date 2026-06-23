import type { ActivityOverrides } from '../types';

// Contracts tone — clarity, good faith, words that hold. Mercury is the headline
// planet; Venus reads as good faith between parties, not warmth.
const contracts: ActivityOverrides = {
  mercury_dignified_direct_not_combust: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Mercury runs clear',
          de: 'Merkur läuft klar',
          fr: 'Mercure est limpide',
          'es-419': 'Mercurio va claro',
          'pt-BR': 'Mercúrio corre claro',
        },
        phrase_full: {
          en: 'Mercury is direct and well-placed today. The hour favors plain words, signed names, and agreements that mean what they say.',
          de: 'Merkur ist heute direktläufig und gut platziert. Die Stunde begünstigt klare Worte, unterschriebene Namen und Vereinbarungen, die meinen, was sie sagen.',
          fr: "Mercure est direct et bien placé aujourd'hui. L'heure favorise les mots clairs, les noms signés et les accords qui veulent dire ce qu'ils disent.",
          'es-419': 'Mercurio está directo y bien ubicado hoy. La hora favorece las palabras claras, los nombres firmados y los acuerdos que dicen lo que significan.',
          'pt-BR': 'Mercúrio está direto e bem posicionado hoje. A hora favorece palavras claras, nomes assinados e acordos que dizem o que significam.',
        },
      },
      partial: {
        phrase_short: {
          en: 'Mercury holds up',
          de: 'Merkur hält stand',
          fr: 'Mercure tient bon',
          'es-419': 'Mercurio se sostiene',
          'pt-BR': 'Mercúrio se sustenta',
        },
        phrase_full: {
          en: 'Mercury is workable but not at full strength. Read twice; sign once; clarify the small print.',
          de: 'Merkur ist brauchbar, aber nicht in voller Kraft. Lies zweimal; unterschreibe einmal; kläre das Kleingedruckte.',
          fr: "Mercure est praticable mais pas à pleine puissance. Lis deux fois ; signe une fois ; clarifie les petits caractères.",
          'es-419': 'Mercurio es manejable pero no está en plena fuerza. Conviene leer dos veces, firmar una sola vez y aclarar la letra chica.',
          'pt-BR': 'Mercúrio está utilizável, mas não em plena força. Leia duas vezes; assine uma vez; esclareça as letras miúdas.',
        },
      },
      fail: {
        phrase_short: {
          en: 'Mercury is dim',
          de: 'Merkur ist matt',
          fr: 'Mercure est terne',
          'es-419': 'Mercurio está apagado',
          'pt-BR': 'Mercúrio está apagado',
        },
        phrase_full: {
          en: 'Mercury is retrograde, hidden, or otherwise weakened. A day for reviewing terms, not committing to them.',
          de: 'Merkur ist rückläufig, verdeckt oder anderweitig geschwächt. Ein Tag, um Bedingungen zu prüfen, nicht um sich auf sie festzulegen.',
          fr: "Mercure est rétrograde, caché ou autrement affaibli. Un jour pour revoir les termes, pas pour s'y engager.",
          'es-419': 'Mercurio está retrógrado, oculto o de otro modo debilitado. Un día para revisar los términos, no para comprometerse con ellos.',
          'pt-BR': 'Mercúrio está retrógrado, oculto ou de outro modo enfraquecido. Um dia para revisar os termos, não para se comprometer com eles.',
        },
      },
    },
  },

  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Good faith holds',
          de: 'Treu und Glauben halten',
          fr: 'La bonne foi tient',
          'es-419': 'La buena fe se sostiene',
          'pt-BR': 'A boa-fé se sustenta',
        },
        phrase_full: {
          en: 'Venus is dignified and direct — a sky that favors agreements made in good faith and kept that way.',
          de: 'Venus ist in Würde und direktläufig — ein Himmel, der Vereinbarungen begünstigt, die in gutem Glauben geschlossen und so gehalten werden.',
          fr: "Vénus est en dignité et directe — un ciel qui favorise les accords conclus de bonne foi et tenus ainsi.",
          'es-419': 'Venus está en dignidad y directa — un cielo que favorece los acuerdos hechos de buena fe y mantenidos así.',
          'pt-BR': 'Vênus está em dignidade e direta — um céu que favorece acordos feitos de boa-fé e mantidos assim.',
        },
      },
      partial: {
        phrase_short: {
          en: 'Goodwill is present',
          de: 'Wohlwollen ist da',
          fr: 'La bonne volonté est présente',
          'es-419': 'La buena voluntad está presente',
          'pt-BR': 'A boa vontade está presente',
        },
        phrase_full: {
          en: 'Venus is around but not at her brightest. The good faith is workable; expect to ask for it explicitly.',
          de: 'Venus ist da, aber nicht in ihrem hellsten Licht. Treu und Glauben sind brauchbar; rechne damit, ausdrücklich darum zu bitten.',
          fr: "Vénus est présente mais pas à son plus éclatant. La bonne foi est praticable ; attends-toi à devoir la demander explicitement.",
          'es-419': 'Venus está presente pero no en su mayor brillo. La buena fe es manejable; conviene pedirla de manera explícita.',
          'pt-BR': 'Vênus está por perto, mas não em seu maior brilho. A boa-fé é utilizável; espere ter de pedi-la de forma explícita.',
        },
      },
    },
  },

  jupiter_aspecting_mercury_or_moon: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Jupiter widens the terms',
          de: 'Jupiter weitet die Bedingungen',
          fr: 'Jupiter élargit les termes',
          'es-419': 'Júpiter amplía los términos',
          'pt-BR': 'Júpiter amplia os termos',
        },
        phrase_full: {
          en: 'Jupiter is in conversation with Mercury — generous language, room to negotiate, terms that read fairly to both sides.',
          de: 'Jupiter ist im Gespräch mit Merkur — großzügige Sprache, Spielraum zum Verhandeln, Bedingungen, die für beide Seiten fair klingen.',
          fr: "Jupiter est en conversation avec Mercure — un langage généreux, de la place pour négocier, des termes qui paraissent justes des deux côtés.",
          'es-419': 'Júpiter está en conversación con Mercurio — lenguaje generoso, espacio para negociar, términos que resultan justos para ambas partes.',
          'pt-BR': 'Júpiter está em conversa com Mercúrio — linguagem generosa, espaço para negociar, termos que soam justos para os dois lados.',
        },
      },
    },
  },
};

export default contracts;
