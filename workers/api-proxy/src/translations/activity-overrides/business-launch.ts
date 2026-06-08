import type { ActivityOverrides } from '../types';

// Business-launch tone — clear footing, room to grow, things that hold their
// shape under load. Jupiter and the rising-sign ruler are central.
const businessLaunch: ActivityOverrides = {
  jupiter_angular_or_aspecting: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Jupiter gives the launch room',
          de: 'Jupiter gibt dem Start Raum',
          fr: 'Jupiter donne du large au lancement',
          'es-419': 'Júpiter le da espacio al lanzamiento',
          'pt-BR': 'Júpiter dá espaço ao lançamento',
        },
        phrase_full: {
          en: 'Jupiter is angular today — the planet of room to grow sits in view. A sky that supports something built to scale.',
          de: 'Jupiter steht heute an einer Achse — der Planet des Wachstumsraums ist in Sicht. Ein Himmel, der etwas trägt, das auf Wachstum gebaut ist.',
          fr: "Jupiter est angulaire aujourd'hui — la planète de la place pour grandir est en vue. Un ciel qui soutient ce qui est bâti pour passer à l'échelle.",
          'es-419': 'Júpiter está angular hoy — el planeta del espacio para crecer está a la vista. Un cielo que sostiene algo hecho para escalar.',
          'pt-BR': 'Júpiter está angular hoje — o planeta do espaço para crescer está à vista. Um céu que sustenta algo feito para escalar.',
        },
      },
    },
  },

  asc_ruler_strong: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Your ground is steady',
          de: 'Dein Boden ist fest',
          fr: 'Ton terrain est ferme',
          'es-419': 'El terreno está firme',
          'pt-BR': 'Seu terreno está firme',
        },
        phrase_full: {
          en: 'The planet that stands for you and your venture is strong today — sure-footed, well-placed, in good company.',
          de: 'Der Planet, der für dich und dein Vorhaben steht, ist heute stark — trittsicher, gut platziert, in guter Gesellschaft.',
          fr: "La planète qui te représente, toi et ton entreprise, est forte aujourd'hui — sûre de son pas, bien placée, en bonne compagnie.",
          'es-419': 'El planeta que representa a la persona y a su proyecto está fuerte hoy — de paso seguro, bien ubicado, en buena compañía.',
          'pt-BR': 'O planeta que representa você e seu empreendimento está forte hoje — de passo seguro, bem posicionado, em boa companhia.',
        },
      },
      partial: {
        phrase_short: {
          en: 'Your ground is workable',
          de: 'Dein Boden ist tragfähig',
          fr: 'Ton terrain est praticable',
          'es-419': 'El terreno es manejable',
          'pt-BR': 'Seu terreno é viável',
        },
        phrase_full: {
          en: 'The planet that stands for the venture is in fair standing — not flying, not stumbling. A day for steady choices.',
          de: 'Der Planet, der für das Vorhaben steht, ist in passabler Verfassung — nicht im Flug, nicht im Straucheln. Ein Tag für besonnene Entscheidungen.',
          fr: "La planète qui représente l'entreprise est en position correcte — ni en vol, ni en train de trébucher. Un jour pour des choix posés.",
          'es-419': 'El planeta que representa al proyecto está en posición aceptable — ni volando, ni tropezando. Un día para decisiones serenas.',
          'pt-BR': 'O planeta que representa o empreendimento está em posição razoável — nem voando, nem tropeçando. Um dia para escolhas serenas.',
        },
      },
    },
  },

  moon_waxing_increasing_light: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The Moon is growing',
          de: 'Der Mond wächst',
          fr: 'La Lune grandit',
          'es-419': 'La Luna crece',
          'pt-BR': 'A Lua está crescendo',
        },
        phrase_full: {
          en: 'The Moon is waxing toward fullness. The sky favors a beginning that needs to compound over time.',
          de: 'Der Mond ist zunehmend und wächst zur Fülle. Der Himmel begünstigt einen Anfang, der sich mit der Zeit verstärken soll.',
          fr: "La Lune est croissante vers la plénitude. Le ciel favorise un début qui doit s'accumuler au fil du temps.",
          'es-419': 'La Luna está creciente hacia la plenitud. El cielo favorece un comienzo que necesita acumularse con el tiempo.',
          'pt-BR': 'A Lua está crescente rumo à plenitude. O céu favorece um começo que precisa se compor ao longo do tempo.',
        },
      },
    },
  },

  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Venus brings reception',
          de: 'Venus bringt Resonanz',
          fr: 'Vénus apporte un bon accueil',
          'es-419': 'Venus trae buena acogida',
          'pt-BR': 'Vênus traz boa acolhida',
        },
        phrase_full: {
          en: 'Venus is dignified and direct — the venture meets a warm reception, the kind that turns into early supporters.',
          de: 'Venus ist in Würde und direktläufig — das Vorhaben trifft auf eine warme Resonanz, die Art, aus der frühe Unterstützer werden.',
          fr: "Vénus est en dignité et directe — l'entreprise rencontre un accueil chaleureux, de ceux qui se changent en premiers soutiens.",
          'es-419': 'Venus está en dignidad y directa — el proyecto encuentra una acogida cálida, de esas que se vuelven en los primeros apoyos.',
          'pt-BR': 'Vênus está em dignidade e direta — o empreendimento encontra uma acolhida calorosa, do tipo que se transforma nos primeiros apoiadores.',
        },
      },
    },
  },
};

export default businessLaunch;
