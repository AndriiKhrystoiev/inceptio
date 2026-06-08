import type { ActivityOverrides } from '../types';

// Wedding tone — emphasize tenderness, mutual care, the steady arrival of warmth.
// Venus is the headline planet of this activity; Moon-related factors tilt toward
// "steadiness for what you are promising," not "growth."
const wedding: ActivityOverrides = {
  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Venus brings tenderness',
          de: 'Venus bringt Zärtlichkeit',
          fr: 'Vénus apporte de la tendresse',
          'es-419': 'Venus trae ternura',
          'pt-BR': 'Vênus traz ternura',
        },
        phrase_full: {
          en: 'Venus is dignified and direct today — a steady, tender presence in the sky. The hour favors promises made with care.',
          de: 'Venus ist heute in Würde und direktläufig — eine stetige, zärtliche Gegenwart am Himmel. Die Stunde begünstigt Versprechen, die mit Sorgfalt gegeben werden.',
          fr: "Vénus est en dignité et directe aujourd'hui — une présence stable et tendre dans le ciel. L'heure favorise les promesses faites avec soin.",
          'es-419': 'Venus está en dignidad y directa hoy — una presencia estable y tierna en el cielo. La hora favorece las promesas hechas con cuidado.',
          'pt-BR': 'Vênus está em dignidade e direta hoje — uma presença estável e terna no céu. A hora favorece promessas feitas com cuidado.',
        },
      },
    },
  },

  moon_waxing_increasing_light: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The Moon is gathering',
          de: 'Der Mond sammelt sich',
          fr: 'La Lune se rassemble',
          'es-419': 'La Luna se reúne',
          'pt-BR': 'A Lua está se reunindo',
        },
        phrase_full: {
          en: 'The Moon is waxing toward fullness. A sky that holds steady for promises meant to grow together over time.',
          de: 'Der Mond ist zunehmend und wächst zur Fülle. Ein Himmel, der für Versprechen Bestand hat, die mit der Zeit zusammen wachsen sollen.',
          fr: "La Lune est croissante vers la plénitude. Un ciel qui tient bon pour les promesses destinées à grandir ensemble au fil du temps.",
          'es-419': 'La Luna está creciente hacia la plenitud. Un cielo que se mantiene firme para las promesas destinadas a crecer juntas con el tiempo.',
          'pt-BR': 'A Lua está crescente rumo à plenitude. Um céu que se mantém firme para promessas feitas para crescer juntas ao longo do tempo.',
        },
      },
    },
  },

  moon_and_asc_ruler_in_good_aspect: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'You and the Moon are in step',
          de: 'Du und der Mond geht ihr im Gleichschritt',
          fr: 'La Lune et toi êtes au même pas',
          'es-419': 'La Luna y vos van al mismo paso',
          'pt-BR': 'Você e a Lua estão no mesmo passo',
        },
        phrase_full: {
          en: 'The Moon and the planet that stands for you agree — body, feeling, and the hour itself in quiet accord.',
          de: 'Der Mond und der Planet, der für dich steht, sind sich einig — Körper, Gefühl und die Stunde selbst in stillem Einklang.',
          fr: "La Lune et la planète qui te représente s'accordent — le corps, le sentiment et l'heure elle-même en accord tranquille.",
          'es-419': 'La Luna y el planeta que te representa concuerdan — el cuerpo, el sentir y la hora misma en sereno acuerdo.',
          'pt-BR': 'A Lua e o planeta que representa você concordam — o corpo, o sentimento e a própria hora em sereno acordo.',
        },
      },
    },
  },
};

export default wedding;
