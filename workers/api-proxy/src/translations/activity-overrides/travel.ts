import type { ActivityOverrides } from '../types';

// Travel tone — safe passage, smooth communication, doors that open. The Moon
// (as the body that crosses the sky) and Mercury (as the messenger) take the
// lead; Jupiter is the patron of long journeys.
const travel: ActivityOverrides = {
  moon_applying_to_benefic: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The Moon travels toward kindness',
          de: 'Der Mond reist auf Freundliches zu',
          fr: 'La Lune voyage vers la douceur',
          'es-419': 'La Luna viaja hacia lo amable',
          'pt-BR': 'A Lua viaja em direção à gentileza',
        },
        phrase_full: {
          en: 'The Moon is moving toward Venus or Jupiter. What is set in motion now arrives at a friendly door.',
          de: 'Der Mond bewegt sich auf Venus oder Jupiter zu. Was jetzt in Gang gesetzt wird, kommt an einer freundlichen Tür an.',
          fr: "La Lune se dirige vers Vénus ou Jupiter. Ce qui se met en route maintenant arrive à une porte accueillante.",
          'es-419': 'La Luna se dirige hacia Venus o Júpiter. Lo que se pone en marcha ahora llega a una puerta amable.',
          'pt-BR': 'A Lua se dirige a Vênus ou Júpiter. O que se põe em movimento agora chega a uma porta acolhedora.',
        },
      },
    },
  },

  mercury_dignified_direct_not_combust: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Mercury moves easily',
          de: 'Merkur bewegt sich leicht',
          fr: 'Mercure circule sans peine',
          'es-419': 'Mercurio se mueve con soltura',
          'pt-BR': 'Mercúrio se move com facilidade',
        },
        phrase_full: {
          en: 'Mercury is direct and well-placed today — schedules hold, messages arrive, the small mechanics of travel cooperate.',
          de: 'Merkur ist heute direktläufig und gut platziert — Zeitpläne halten, Nachrichten kommen an, die kleine Mechanik des Reisens spielt mit.',
          fr: "Mercure est direct et bien placé aujourd'hui — les horaires tiennent, les messages arrivent, la petite mécanique du voyage coopère.",
          'es-419': 'Mercurio está directo y bien ubicado hoy — los horarios se cumplen, los mensajes llegan, la pequeña mecánica del viaje coopera.',
          'pt-BR': 'Mercúrio está direto e bem posicionado hoje — os horários se mantêm, as mensagens chegam, a pequena mecânica da viagem coopera.',
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
          en: 'Mercury is retrograde or otherwise weakened. Build slack into the schedule; double-check the booking.',
          de: 'Merkur ist rückläufig oder anderweitig geschwächt. Plane Puffer in den Zeitplan ein; prüfe die Buchung doppelt.',
          fr: "Mercure est rétrograde ou autrement affaibli. Prévois de la marge dans l'horaire ; revérifie la réservation.",
          'es-419': 'Mercurio está retrógrado o de otro modo debilitado. Conviene dejar margen en el horario y revisar dos veces la reserva.',
          'pt-BR': 'Mercúrio está retrógrado ou de outro modo enfraquecido. Reserve folga no horário; confira a reserva duas vezes.',
        },
      },
    },
  },

  jupiter_angular_or_aspecting: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Jupiter opens the road',
          de: 'Jupiter öffnet den Weg',
          fr: 'Jupiter ouvre la route',
          'es-419': 'Júpiter abre el camino',
          'pt-BR': 'Júpiter abre a estrada',
        },
        phrase_full: {
          en: 'Jupiter — the traditional patron of journeys — is angular or aspecting. A sky that favors going further than planned.',
          de: 'Jupiter — der traditionelle Schutzherr der Reisen — steht an einer Achse oder im Aspekt. Ein Himmel, der begünstigt, weiter zu gehen als geplant.',
          fr: "Jupiter — le patron traditionnel des voyages — est angulaire ou en aspect. Un ciel qui favorise d'aller plus loin que prévu.",
          'es-419': 'Júpiter — el patrón tradicional de los viajes — está angular o en aspecto. Un cielo que favorece ir más lejos de lo planeado.',
          'pt-BR': 'Júpiter — o patrono tradicional das viagens — está angular ou em aspecto. Um céu que favorece ir mais longe do que o planejado.',
        },
      },
    },
  },
};

export default travel;
