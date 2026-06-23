import type { FactorId } from '@inceptio/shared-types';
import type { FactorEntry } from '../types';

// First-draft Mystical Premium phrasings for the 15 verified factor IDs.
// These will go through astrologer review (per CLAUDE.md, ~2h before launch).
//
// Voice rules (CLAUDE.md): warm, dignified, poetic-but-specific. No "magic",
// "destiny", "fortune", "stars align", "vibes", "blessed", "energy" (as noun).
// Allowed patterns: "Venus brings warmth", "Mercury is sleeping",
// "The Moon is between signs", "A tender day for beginnings".
//
// VOICE phase (i18n-chrome): every user-facing leaf (phrase_short, phrase_full)
// is now an explicit per-locale Record { en, de, fr, 'es-419', 'pt-BR' }. `en`
// is authoritative; de/fr/es-419/pt-BR are register-correct DRAFTS pending
// native + astrology-literate community review (see
// docs/superpowers/glossary/i18n-termbase.md). Register per O1: de = du,
// fr = tu (provisional), es-419 = voseo-neutral (no 2nd-person-singular verbs),
// pt-BR = você. Traditional astrology terms follow the termbase renderings.

export const FACTORS: Record<FactorId, FactorEntry> = {
  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Venus brings warmth',
          de: 'Venus bringt Wärme',
          fr: 'Vénus apporte de la chaleur',
          'es-419': 'Venus aporta calidez',
          'pt-BR': 'Vênus traz calor',
        },
        phrase_full: {
          en: 'Venus is dignified and direct today — a steady, warm presence that favors moments built on care and connection.',
          de: 'Venus ist heute in ihrer Würde und direkt — eine ruhige, warme Gegenwart, die Momente begünstigt, die auf Fürsorge und Verbindung gebaut sind.',
          fr: 'Vénus est en dignité et directe aujourd’hui — une présence stable et chaleureuse qui favorise les moments bâtis sur le soin et le lien.',
          'es-419': 'Venus está en dignidad y directa hoy — una presencia estable y cálida que favorece los momentos construidos sobre el cuidado y el vínculo.',
          'pt-BR': 'Vênus está dignificada e direta hoje — uma presença firme e acolhedora que favorece momentos construídos sobre o cuidado e a conexão.',
        },
      },
      partial: {
        phrase_short: {
          en: 'Venus shows up gently',
          de: 'Venus zeigt sich sanft',
          fr: 'Vénus se montre avec douceur',
          'es-419': 'Venus se presenta con suavidad',
          'pt-BR': 'Vênus aparece com suavidade',
        },
        phrase_full: {
          en: 'Venus is in good standing but not at her strongest. The warmth is there; it asks you to meet it halfway.',
          de: 'Venus steht günstig, aber nicht in ihrer vollen Kraft. Die Wärme ist da; sie bittet dich, ihr auf halbem Weg entgegenzukommen.',
          fr: 'Vénus est bien disposée, mais pas au plus fort de sa force. La chaleur est là ; elle te demande de faire la moitié du chemin.',
          'es-419': 'Venus está bien dispuesta, aunque no en su mayor fuerza. La calidez está presente; pide encontrarla a medio camino.',
          'pt-BR': 'Vênus está bem disposta, mas não no auge da sua força. O calor está ali; ele pede que você o encontre no meio do caminho.',
        },
      },
      fail: {
        phrase_short: {
          en: 'Venus is muted',
          de: 'Venus ist gedämpft',
          fr: 'Vénus est en sourdine',
          'es-419': 'Venus está apagada',
          'pt-BR': 'Vênus está silenciada',
        },
        phrase_full: {
          en: 'Venus is quiet in the sky right now. Moments that depend on softness may want a different day.',
          de: 'Venus ist gerade still am Himmel. Momente, die von Sanftheit abhängen, wollen vielleicht einen anderen Tag.',
          fr: 'Vénus est discrète dans le ciel en ce moment. Les moments qui dépendent de la douceur préféreront peut-être un autre jour.',
          'es-419': 'Venus está callada en el cielo ahora mismo. Los momentos que dependen de la suavidad tal vez prefieran otro día.',
          'pt-BR': 'Vênus está quieta no céu neste momento. Momentos que dependem de suavidade talvez prefiram outro dia.',
        },
      },
    },
  },

  moon_waxing_increasing_light: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The Moon is gathering light',
          de: 'Der Mond sammelt Licht',
          fr: 'La Lune rassemble la lumière',
          'es-419': 'La Luna reúne luz',
          'pt-BR': 'A Lua está reunindo luz',
        },
        phrase_full: {
          en: 'The Moon is waxing, growing in light. The sky favors beginnings that need to build into something more.',
          de: 'Der Mond ist zunehmend, wächst an Licht. Der Himmel begünstigt Anfänge, die zu etwas Größerem heranwachsen sollen.',
          fr: 'La Lune est croissante, gagnant en lumière. Le ciel favorise les commencements qui ont besoin de grandir vers quelque chose de plus.',
          'es-419': 'La Luna está creciente, ganando luz. El cielo favorece los comienzos que necesitan crecer hacia algo mayor.',
          'pt-BR': 'A Lua está crescente, ganhando luz. O céu favorece começos que precisam crescer rumo a algo maior.',
        },
      },
      partial: {
        phrase_short: {
          en: 'The Moon is steady, not bright',
          de: 'Der Mond ist ruhig, nicht hell',
          fr: 'La Lune est stable, pas éclatante',
          'es-419': 'La Luna está estable, no brillante',
          'pt-BR': 'A Lua está firme, não brilhante',
        },
        phrase_full: {
          en: 'The Moon is past her brightest moment but still gathering. Growth is possible; expect it to come quietly.',
          de: 'Der Mond hat seinen hellsten Moment hinter sich, sammelt aber noch. Wachstum ist möglich; erwarte, dass es leise kommt.',
          fr: 'La Lune a passé son moment le plus éclatant mais rassemble encore. La croissance est possible ; attends-toi à ce qu’elle vienne en douceur.',
          'es-419': 'La Luna ya pasó su momento más brillante, pero sigue reuniendo luz. El crecimiento es posible; conviene esperarlo de forma silenciosa.',
          'pt-BR': 'A Lua já passou do seu momento mais brilhante, mas ainda está reunindo luz. O crescimento é possível; espere que ele venha em silêncio.',
        },
      },
      fail: {
        phrase_short: {
          en: 'The Moon is waning',
          de: 'Der Mond ist abnehmend',
          fr: 'La Lune est décroissante',
          'es-419': 'La Luna está menguante',
          'pt-BR': 'A Lua está minguante',
        },
        phrase_full: {
          en: 'The Moon is losing light. Better suited to closings and clearings than to new beginnings.',
          de: 'Der Mond verliert an Licht. Besser geeignet für Abschlüsse und Aufräumarbeiten als für neue Anfänge.',
          fr: 'La Lune perd de la lumière. Mieux adaptée aux clôtures et aux mises au net qu’aux nouveaux commencements.',
          'es-419': 'La Luna está perdiendo luz. Más adecuada para cierres y despejes que para nuevos comienzos.',
          'pt-BR': 'A Lua está perdendo luz. Mais adequada a encerramentos e arrumações do que a novos começos.',
        },
      },
    },
  },

  moon_applying_to_benefic: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The Moon is moving toward kindness',
          de: 'Der Mond bewegt sich auf Freundliches zu',
          fr: 'La Lune se dirige vers la bienveillance',
          'es-419': 'La Luna se dirige hacia algo amable',
          'pt-BR': 'A Lua está se aproximando da gentileza',
        },
        phrase_full: {
          en: 'The Moon is applying to a benefic — moving toward Venus or Jupiter. What begins now travels toward a friendly meeting.',
          de: 'Der Mond läuft auf einen Wohltäter zu — auf Venus oder Jupiter. Was jetzt beginnt, wandert auf eine freundliche Begegnung zu.',
          fr: 'La Lune s’applique à un bénéfique — elle se dirige vers Vénus ou Jupiter. Ce qui commence maintenant chemine vers une rencontre amicale.',
          'es-419': 'La Luna se aplica a un benéfico — se dirige hacia Venus o Júpiter. Lo que comienza ahora avanza hacia un encuentro amable.',
          'pt-BR': 'A Lua está em aplicação a um benéfico — aproximando-se de Vênus ou Júpiter. O que começa agora caminha rumo a um encontro amistoso.',
        },
      },
      partial: {
        phrase_short: {
          en: 'A friendly meeting is forming',
          de: 'Eine freundliche Begegnung bildet sich',
          fr: 'Une rencontre amicale se forme',
          'es-419': 'Se está formando un encuentro amable',
          'pt-BR': 'Um encontro amistoso está se formando',
        },
        phrase_full: {
          en: 'The Moon is heading toward a helpful planet, though the contact is loose. A small kindness arrives later, not immediately.',
          de: 'Der Mond steuert auf einen hilfreichen Planeten zu, doch der Kontakt ist locker. Eine kleine Freundlichkeit kommt später, nicht sofort.',
          fr: 'La Lune se dirige vers une planète secourable, mais le contact est lâche. Une petite bienveillance arrive plus tard, pas tout de suite.',
          'es-419': 'La Luna avanza hacia un planeta servicial, aunque el contacto es flojo. Una pequeña amabilidad llega más tarde, no de inmediato.',
          'pt-BR': 'A Lua segue em direção a um planeta prestativo, embora o contato seja frouxo. Uma pequena gentileza chega mais tarde, não de imediato.',
        },
      },
      fail: {
        phrase_short: {
          en: 'No friendly meeting ahead',
          de: 'Keine freundliche Begegnung in Sicht',
          fr: 'Aucune rencontre amicale en vue',
          'es-419': 'Ningún encuentro amable a la vista',
          'pt-BR': 'Nenhum encontro amistoso à vista',
        },
        phrase_full: {
          en: 'The Moon is not moving toward a benefic. The day stands on its own without that kind of arriving help.',
          de: 'Der Mond bewegt sich auf keinen Wohltäter zu. Der Tag steht für sich, ohne diese Art von eintreffender Hilfe.',
          fr: 'La Lune ne se dirige vers aucun bénéfique. La journée tient par elle-même, sans ce genre d’aide qui arrive.',
          'es-419': 'La Luna no se dirige hacia ningún benéfico. El día se sostiene por sí mismo, sin esa clase de ayuda que llega.',
          'pt-BR': 'A Lua não está se aproximando de nenhum benéfico. O dia se sustenta por conta própria, sem esse tipo de ajuda que chega.',
        },
      },
    },
  },

  house_ruler_dignified_well_placed: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The ruler of this matter is steady',
          de: 'Der Herrscher dieser Sache steht fest',
          fr: 'Le maître de l’affaire est solide',
          'es-419': 'El regente de este asunto está firme',
          'pt-BR': 'O regente deste assunto está firme',
        },
        phrase_full: {
          en: 'The planet that governs this kind of undertaking is in good standing today — sure-footed, present, capable.',
          de: 'Der Planet, der diese Art von Vorhaben regiert, steht heute günstig — trittsicher, präsent, fähig.',
          fr: 'La planète qui gouverne ce genre d’entreprise est bien disposée aujourd’hui — assurée, présente, capable.',
          'es-419': 'El planeta que gobierna esta clase de empresa está bien dispuesto hoy — seguro, presente, capaz.',
          'pt-BR': 'O planeta que governa esse tipo de empreitada está bem disposto hoje — seguro, presente, capaz.',
        },
      },
      partial: {
        phrase_short: {
          en: 'The ruler is present, not strong',
          de: 'Der Herrscher ist da, doch nicht stark',
          fr: 'Le maître est présent, pas fort',
          'es-419': 'El regente está presente, no fuerte',
          'pt-BR': 'O regente está presente, não forte',
        },
        phrase_full: {
          en: 'The planet that governs this kind of undertaking is around, but not at full strength. Workable; not glowing.',
          de: 'Der Planet, der diese Art von Vorhaben regiert, ist da, aber nicht in voller Kraft. Machbar; nicht strahlend.',
          fr: 'La planète qui gouverne ce genre d’entreprise est là, mais pas à pleine force. Faisable ; sans éclat.',
          'es-419': 'El planeta que gobierna esta clase de empresa está presente, pero no a plena fuerza. Viable; sin brillo.',
          'pt-BR': 'O planeta que governa esse tipo de empreitada está por perto, mas não em plena força. Viável; sem brilho.',
        },
      },
      fail: {
        phrase_short: {
          en: 'The ruler is out of place',
          de: 'Der Herrscher steht fehl am Platz',
          fr: 'Le maître est mal placé',
          'es-419': 'El regente está fuera de lugar',
          'pt-BR': 'O regente está fora de lugar',
        },
        phrase_full: {
          en: 'The planet that governs this kind of undertaking is not well-placed today. The footing is unsure.',
          de: 'Der Planet, der diese Art von Vorhaben regiert, ist heute nicht gut gestellt. Der Stand ist unsicher.',
          fr: 'La planète qui gouverne ce genre d’entreprise est mal placée aujourd’hui. Le terrain est incertain.',
          'es-419': 'El planeta que gobierna esta clase de empresa no está bien ubicado hoy. El terreno es incierto.',
          'pt-BR': 'O planeta que governa esse tipo de empreitada não está bem posicionado hoje. O terreno é incerto.',
        },
      },
    },
  },

  asc_and_house_ruler_in_reception_or_aspect: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'You and the matter are in conversation',
          de: 'Du und die Sache seid im Gespräch',
          fr: 'Toi et l’affaire êtes en dialogue',
          'es-419': 'El asunto y quien lo emprende están en diálogo',
          'pt-BR': 'Você e o assunto estão em diálogo',
        },
        phrase_full: {
          en: 'The planet that stands for you and the planet that stands for the matter are talking — a clean, mutual line between you and what you are about to do.',
          de: 'Der Planet, der für dich steht, und der Planet, der für die Sache steht, sprechen miteinander — eine klare, gegenseitige Linie zwischen dir und dem, was du vorhast.',
          fr: 'La planète qui te représente et la planète qui représente l’affaire se parlent — une ligne nette et mutuelle entre toi et ce que tu t’apprêtes à faire.',
          'es-419': 'El planeta que representa a la persona y el que representa al asunto conversan — una línea limpia y mutua entre quien emprende y lo que está por hacer.',
          'pt-BR': 'O planeta que representa você e o planeta que representa o assunto estão conversando — uma linha limpa e mútua entre você e o que está prestes a fazer.',
        },
      },
      partial: {
        phrase_short: {
          en: 'A faint line between you and the matter',
          de: 'Eine schwache Linie zwischen dir und der Sache',
          fr: 'Une ligne ténue entre toi et l’affaire',
          'es-419': 'Una línea tenue entre quien emprende y el asunto',
          'pt-BR': 'Uma linha tênue entre você e o assunto',
        },
        phrase_full: {
          en: 'You and the matter are linked, but at a distance. A workable connection that asks you to keep tending it.',
          de: 'Du und die Sache seid verbunden, aber auf Distanz. Eine machbare Verbindung, die darum bittet, dass du sie weiter pflegst.',
          fr: 'Toi et l’affaire êtes liés, mais à distance. Un lien viable qui te demande de continuer à l’entretenir.',
          'es-419': 'El asunto y quien lo emprende están conectados, pero a distancia. Una conexión viable que pide cuidado continuo.',
          'pt-BR': 'Você e o assunto estão ligados, mas à distância. Uma conexão viável que pede para você continuar cultivando.',
        },
      },
      fail: {
        phrase_short: {
          en: 'You and the matter are far apart',
          de: 'Du und die Sache seid weit voneinander entfernt',
          fr: 'Toi et l’affaire êtes très éloignés',
          'es-419': 'El asunto y quien lo emprende están muy distantes',
          'pt-BR': 'Você e o assunto estão muito distantes',
        },
        phrase_full: {
          en: 'There is no clean line today between the planet that stands for you and the one that stands for the matter. Worth waiting for a closer meeting.',
          de: 'Heute gibt es keine klare Linie zwischen dem Planeten, der für dich steht, und dem, der für die Sache steht. Es lohnt sich, auf eine engere Begegnung zu warten.',
          fr: 'Il n’y a aujourd’hui aucune ligne nette entre la planète qui te représente et celle qui représente l’affaire. Mieux vaut attendre une rencontre plus rapprochée.',
          'es-419': 'Hoy no hay una línea limpia entre el planeta que representa a la persona y el que representa al asunto. Conviene esperar un encuentro más cercano.',
          'pt-BR': 'Hoje não há uma linha limpa entre o planeta que representa você e o que representa o assunto. Vale esperar por um encontro mais próximo.',
        },
      },
    },
  },

  jupiter_angular_or_aspecting: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Jupiter is in view',
          de: 'Jupiter ist in Sicht',
          fr: 'Jupiter est en vue',
          'es-419': 'Júpiter está a la vista',
          'pt-BR': 'Júpiter está à vista',
        },
        phrase_full: {
          en: 'Jupiter — the planet of room to grow — is angular or aspecting today. A sky that quietly says "yes, expand."',
          de: 'Jupiter — der Planet des Raums zum Wachsen — steht heute an einer Achse oder im Aspekt. Ein Himmel, der leise sagt: „Ja, dehne dich aus."',
          fr: 'Jupiter — la planète de la place pour grandir — est angulaire ou en aspect aujourd’hui. Un ciel qui dit doucement : « oui, déploie-toi. »',
          'es-419': 'Júpiter — el planeta del espacio para crecer — está sobre un ángulo o en aspecto hoy. Un cielo que dice en voz baja: «sí, expandirse».',
          'pt-BR': 'Júpiter — o planeta do espaço para crescer — está sobre um ângulo ou em aspecto hoje. Um céu que diz baixinho: "sim, expanda".',
        },
      },
      partial: {
        phrase_short: {
          en: 'Jupiter is nearby',
          de: 'Jupiter ist in der Nähe',
          fr: 'Jupiter est à proximité',
          'es-419': 'Júpiter está cerca',
          'pt-BR': 'Júpiter está por perto',
        },
        phrase_full: {
          en: 'Jupiter is in the picture but not at the center. Some room to grow, less than on a stronger Jupiter day.',
          de: 'Jupiter ist im Bild, aber nicht im Zentrum. Etwas Raum zum Wachsen, weniger als an einem stärkeren Jupiter-Tag.',
          fr: 'Jupiter est dans le tableau mais pas au centre. Un peu de place pour grandir, moins qu’un jour de Jupiter plus fort.',
          'es-419': 'Júpiter está en el cuadro, pero no en el centro. Algo de espacio para crecer, menos que en un día de Júpiter más fuerte.',
          'pt-BR': 'Júpiter está no quadro, mas não no centro. Algum espaço para crescer, menos do que num dia de Júpiter mais forte.',
        },
      },
      fail: {
        phrase_short: {
          en: 'Jupiter is absent',
          de: 'Jupiter ist abwesend',
          fr: 'Jupiter est absent',
          'es-419': 'Júpiter está ausente',
          'pt-BR': 'Júpiter está ausente',
        },
        phrase_full: {
          en: 'Jupiter is not in view today. The day works, but it does not actively widen.',
          de: 'Jupiter ist heute nicht in Sicht. Der Tag funktioniert, doch er weitet sich nicht aktiv.',
          fr: 'Jupiter n’est pas en vue aujourd’hui. La journée fonctionne, mais elle ne s’élargit pas activement.',
          'es-419': 'Júpiter no está a la vista hoy. El día funciona, pero no se ensancha de forma activa.',
          'pt-BR': 'Júpiter não está à vista hoje. O dia funciona, mas não se amplia de forma ativa.',
        },
      },
    },
  },

  planetary_hour_match: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The hour matches the work',
          de: 'Die Stunde passt zur Sache',
          fr: 'L’heure correspond au travail',
          'es-419': 'La hora coincide con la tarea',
          'pt-BR': 'A hora combina com o trabalho',
        },
        phrase_full: {
          en: 'The planetary hour for this window matches the planet that rules your activity — a small, traditional lift in tune.',
          de: 'Die Planetenstunde für dieses Zeitfenster passt zum Planeten, der deine Tätigkeit regiert — ein kleiner, traditioneller Auftrieb im Einklang.',
          fr: 'L’heure planétaire de cette fenêtre correspond à la planète qui régit ton activité — un petit élan traditionnel en accord.',
          'es-419': 'La hora planetaria de esta ventana coincide con el planeta que rige la actividad — un pequeño impulso tradicional en sintonía.',
          'pt-BR': 'A hora planetária desta janela combina com o planeta que rege a sua atividade — um pequeno impulso tradicional em sintonia.',
        },
      },
      partial: {
        phrase_short: {
          en: 'The hour is adjacent',
          de: 'Die Stunde ist verwandt',
          fr: 'L’heure est voisine',
          'es-419': 'La hora es cercana',
          'pt-BR': 'A hora é próxima',
        },
        phrase_full: {
          en: 'The planetary hour is a relative of the right planet, if not the same one. A subtle assist.',
          de: 'Die Planetenstunde ist ein Verwandter des richtigen Planeten, wenn auch nicht derselbe. Eine subtile Unterstützung.',
          fr: 'L’heure planétaire est une parente de la bonne planète, sans être la même. Un soutien subtil.',
          'es-419': 'La hora planetaria es pariente del planeta correcto, aunque no el mismo. Una ayuda sutil.',
          'pt-BR': 'A hora planetária é parente do planeta certo, ainda que não seja o mesmo. Uma ajuda sutil.',
        },
      },
      fail: {
        phrase_short: {
          en: 'The hour is unrelated',
          de: 'Die Stunde hat keinen Bezug',
          fr: 'L’heure est sans rapport',
          'es-419': 'La hora no tiene relación',
          'pt-BR': 'A hora não tem relação',
        },
        phrase_full: {
          en: 'The planetary hour is not tied to the work at hand. No lift, no drag — neutral.',
          de: 'Die Planetenstunde ist nicht mit der anstehenden Sache verbunden. Kein Auftrieb, kein Gegenwind — neutral.',
          fr: 'L’heure planétaire n’est pas liée au travail en cours. Ni élan, ni frein — neutre.',
          'es-419': 'La hora planetaria no está ligada a la tarea en curso. Sin impulso, sin freno — neutral.',
          'pt-BR': 'A hora planetária não está ligada ao trabalho em questão. Sem impulso, sem arrasto — neutro.',
        },
      },
    },
  },

  fixed_star_conjunction: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'A favorable fixed star is on point',
          de: 'Ein günstiger Fixstern steht an der Achse',
          fr: 'Une étoile fixe favorable est sur l’angle',
          'es-419': 'Una estrella fija favorable está sobre el ángulo',
          'pt-BR': 'Uma estrela fixa favorável está sobre o ângulo',
        },
        phrase_full: {
          en: 'A well-regarded fixed star sits close to one of the chart\'s angles — a particular, traditional blessing on this hour.',
          de: 'Ein hoch angesehener Fixstern steht nahe an einer der Achsen des Charts — ein besonderer, traditioneller Segen über dieser Stunde.',
          fr: 'Une étoile fixe bien considérée se tient près de l’un des angles du thème — une faveur particulière et traditionnelle sur cette heure.',
          'es-419': 'Una estrella fija bien considerada se ubica cerca de uno de los ángulos de la carta — una gracia particular y tradicional sobre esta hora.',
          'pt-BR': 'Uma estrela fixa bem considerada está perto de um dos ângulos do mapa — uma graça particular e tradicional sobre esta hora.',
        },
      },
      partial: {
        phrase_short: {
          en: 'A fixed star is close, not exact',
          de: 'Ein Fixstern ist nah, nicht genau',
          fr: 'Une étoile fixe est proche, pas exacte',
          'es-419': 'Una estrella fija está cerca, no exacta',
          'pt-BR': 'Uma estrela fixa está perto, não exata',
        },
        phrase_full: {
          en: 'A favorable fixed star is in the neighborhood. The flavor is present without dominating the hour.',
          de: 'Ein günstiger Fixstern ist in der Nachbarschaft. Der Beiklang ist da, ohne die Stunde zu beherrschen.',
          fr: 'Une étoile fixe favorable est dans le voisinage. La nuance est présente sans dominer l’heure.',
          'es-419': 'Una estrella fija favorable está en las cercanías. El matiz está presente sin dominar la hora.',
          'pt-BR': 'Uma estrela fixa favorável está nas redondezas. O tom está presente sem dominar a hora.',
        },
      },
      fail: {
        phrase_short: {
          en: 'No favorable fixed star is near',
          de: 'Kein günstiger Fixstern ist nah',
          fr: 'Aucune étoile fixe favorable n’est proche',
          'es-419': 'Ninguna estrella fija favorable está cerca',
          'pt-BR': 'Nenhuma estrela fixa favorável está por perto',
        },
        phrase_full: {
          en: 'No notable fixed star sits on point today. The hour stands on its other merits.',
          de: 'Heute steht kein nennenswerter Fixstern an der Achse. Die Stunde steht auf ihren übrigen Verdiensten.',
          fr: 'Aucune étoile fixe notable n’est sur l’angle aujourd’hui. L’heure tient sur ses autres mérites.',
          'es-419': 'Ninguna estrella fija notable está sobre el ángulo hoy. La hora se sostiene por sus otros méritos.',
          'pt-BR': 'Nenhuma estrela fixa notável está sobre o ângulo hoje. A hora se sustenta por seus outros méritos.',
        },
      },
    },
  },

  house_free_of_malefic: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The room is clear',
          de: 'Der Raum ist frei',
          fr: 'La pièce est dégagée',
          'es-419': 'El espacio está despejado',
          'pt-BR': 'O espaço está livre',
        },
        phrase_full: {
          en: 'The part of the sky that governs this matter is free of difficult planets right now. Less to push against.',
          de: 'Der Teil des Himmels, der diese Sache regiert, ist gerade frei von schwierigen Planeten. Weniger, wogegen man andrücken muss.',
          fr: 'La partie du ciel qui gouverne cette affaire est libre de planètes difficiles en ce moment. Moins de résistance à vaincre.',
          'es-419': 'La parte del cielo que gobierna este asunto está libre de planetas difíciles ahora mismo. Menos resistencia que vencer.',
          'pt-BR': 'A parte do céu que governa este assunto está livre de planetas difíceis neste momento. Menos resistência a enfrentar.',
        },
      },
      partial: {
        phrase_short: {
          en: 'The room is mostly clear',
          de: 'Der Raum ist weitgehend frei',
          fr: 'La pièce est presque dégagée',
          'es-419': 'El espacio está casi despejado',
          'pt-BR': 'O espaço está quase livre',
        },
        phrase_full: {
          en: 'A difficult planet brushes the edges of this matter, but is not sitting in the room. Manageable, not blocking.',
          de: 'Ein schwieriger Planet streift die Ränder dieser Sache, sitzt aber nicht im Raum. Handhabbar, nicht blockierend.',
          fr: 'Une planète difficile effleure les bords de cette affaire, sans s’installer dans la pièce. Gérable, pas bloquant.',
          'es-419': 'Un planeta difícil roza los bordes de este asunto, pero no se sienta en el espacio. Manejable, no bloqueante.',
          'pt-BR': 'Um planeta difícil roça as bordas deste assunto, mas não está sentado no espaço. Administrável, sem bloquear.',
        },
      },
      fail: {
        phrase_short: {
          en: 'A difficult planet is in the room',
          de: 'Ein schwieriger Planet ist im Raum',
          fr: 'Une planète difficile est dans la pièce',
          'es-419': 'Un planeta difícil está en el espacio',
          'pt-BR': 'Um planeta difícil está no espaço',
        },
        phrase_full: {
          en: 'Mars or Saturn sits in the part of the sky that governs this matter. Worth weighing whether to wait it out.',
          de: 'Mars oder Saturn sitzt in dem Teil des Himmels, der diese Sache regiert. Es lohnt sich abzuwägen, ob man es aussitzt.',
          fr: 'Mars ou Saturne se tient dans la partie du ciel qui gouverne cette affaire. Mieux vaut peser s’il faut attendre que cela passe.',
          'es-419': 'Marte o Saturno se ubica en la parte del cielo que gobierna este asunto. Conviene sopesar si esperar a que pase.',
          'pt-BR': 'Marte ou Saturno está na parte do céu que governa este assunto. Vale pesar se é melhor esperar passar.',
        },
      },
    },
  },

  mercury_dignified_direct_not_combust: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Mercury runs clear',
          de: 'Merkur läuft klar',
          fr: 'Mercure file clair',
          'es-419': 'Mercurio fluye claro',
          'pt-BR': 'Mercúrio corre claro',
        },
        phrase_full: {
          en: 'Mercury is direct, in good standing, and not hidden by the Sun. Words land, papers move, messages arrive.',
          de: 'Merkur ist direkt, steht günstig und ist nicht von der Sonne verdeckt. Worte treffen, Papiere bewegen sich, Nachrichten kommen an.',
          fr: 'Mercure est direct, bien disposé, et non caché par le Soleil. Les mots portent, les papiers avancent, les messages arrivent.',
          'es-419': 'Mercurio está directo, bien dispuesto y no oculto por el Sol. Las palabras llegan, los papeles avanzan, los mensajes arriban.',
          'pt-BR': 'Mercúrio está direto, bem disposto e não oculto pelo Sol. As palavras chegam, os papéis avançam, as mensagens chegam.',
        },
      },
      partial: {
        phrase_short: {
          en: 'Mercury is workable',
          de: 'Merkur ist machbar',
          fr: 'Mercure est exploitable',
          'es-419': 'Mercurio es viable',
          'pt-BR': 'Mercúrio está viável',
        },
        phrase_full: {
          en: 'Mercury is mostly clear but not at full strength. Communication holds up; expect to repeat yourself once or twice.',
          de: 'Merkur ist überwiegend klar, aber nicht in voller Kraft. Die Verständigung hält; rechne damit, dich ein- oder zweimal zu wiederholen.',
          fr: 'Mercure est globalement clair mais pas à pleine force. La communication tient ; attends-toi à te répéter une fois ou deux.',
          'es-419': 'Mercurio está bastante claro, pero no a plena fuerza. La comunicación se sostiene; conviene prever repetir una o dos veces.',
          'pt-BR': 'Mercúrio está quase claro, mas não em plena força. A comunicação se sustenta; espere se repetir uma ou duas vezes.',
        },
      },
      fail: {
        phrase_short: {
          en: 'Mercury is dim',
          de: 'Merkur ist trüb',
          fr: 'Mercure est terne',
          'es-419': 'Mercurio está opaco',
          'pt-BR': 'Mercúrio está apagado',
        },
        phrase_full: {
          en: 'Mercury is either retrograde, combust, or otherwise weakened. A day for re-reading more than for signing.',
          de: 'Merkur ist entweder rückläufig, verbrannt oder anderweitig geschwächt. Ein Tag eher zum Nochmal-Lesen als zum Unterschreiben.',
          fr: 'Mercure est soit rétrograde, soit combuste, soit autrement affaibli. Un jour pour relire plutôt que pour signer.',
          'es-419': 'Mercurio está retrógrado, combusto o de algún otro modo debilitado. Un día para releer más que para firmar.',
          'pt-BR': 'Mercúrio está retrógrado, em combustão ou de outro modo enfraquecido. Um dia mais para reler do que para assinar.',
        },
      },
    },
  },

  asc_ruler_strong: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'You are on solid ground',
          de: 'Du stehst auf festem Boden',
          fr: 'Tu es en terrain solide',
          'es-419': 'El terreno es firme',
          'pt-BR': 'Você está em terreno firme',
        },
        phrase_full: {
          en: 'The planet that stands for you in this chart is strong — dignified, well-placed, in good company. The day works in your favor.',
          de: 'Der Planet, der in diesem Chart für dich steht, ist stark — in seiner Würde, gut gestellt, in guter Gesellschaft. Der Tag arbeitet zu deinen Gunsten.',
          fr: 'La planète qui te représente dans ce thème est forte — en dignité, bien placée, en bonne compagnie. La journée joue en ta faveur.',
          'es-419': 'El planeta que representa a la persona en esta carta está fuerte — en dignidad, bien ubicado, en buena compañía. El día juega a favor.',
          'pt-BR': 'O planeta que representa você neste mapa está forte — em dignidade, bem posicionado, em boa companhia. O dia joga a seu favor.',
        },
      },
      partial: {
        phrase_short: {
          en: 'You are present, not at full strength',
          de: 'Du bist da, doch nicht in voller Kraft',
          fr: 'Tu es présent, pas à pleine force',
          'es-419': 'Hay presencia, no plena fuerza',
          'pt-BR': 'Você está presente, não em plena força',
        },
        phrase_full: {
          en: 'The planet that stands for you is in fair standing — not at her best, not at her worst. A workable day.',
          de: 'Der Planet, der für dich steht, steht ordentlich — nicht in Bestform, nicht im Tiefpunkt. Ein machbarer Tag.',
          fr: 'La planète qui te représente est dans une position correcte — ni au mieux, ni au pire. Une journée faisable.',
          'es-419': 'El planeta que representa a la persona está en posición aceptable — ni en su mejor momento, ni en el peor. Un día viable.',
          'pt-BR': 'O planeta que representa você está em posição razoável — nem no auge, nem no fundo. Um dia viável.',
        },
      },
      fail: {
        phrase_short: {
          en: 'You are stretched thin',
          de: 'Du bist überdehnt',
          fr: 'Tu es à bout',
          'es-419': 'Las fuerzas están al límite',
          'pt-BR': 'Você está sobrecarregado',
        },
        phrase_full: {
          en: 'The planet that stands for you is out of dignity or in difficult company today. Worth conserving your push.',
          de: 'Der Planet, der für dich steht, ist heute ohne Würde oder in schwieriger Gesellschaft. Es lohnt sich, deinen Vorstoß zu schonen.',
          fr: 'La planète qui te représente est sans dignité ou en mauvaise compagnie aujourd’hui. Mieux vaut ménager ton élan.',
          'es-419': 'El planeta que representa a la persona está sin dignidad o en mala compañía hoy. Conviene reservar el empuje.',
          'pt-BR': 'O planeta que representa você está sem dignidade ou em má companhia hoje. Vale conservar o seu impulso.',
        },
      },
    },
  },

  jupiter_aspecting_mercury_or_moon: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'Jupiter helps the messenger',
          de: 'Jupiter hilft dem Boten',
          fr: 'Jupiter aide le messager',
          'es-419': 'Júpiter ayuda al mensajero',
          'pt-BR': 'Júpiter ajuda o mensageiro',
        },
        phrase_full: {
          en: 'Jupiter is in conversation with Mercury or the Moon — a generous lift on words, news, and the people who carry them.',
          de: 'Jupiter ist im Gespräch mit Merkur oder dem Mond — ein großzügiger Auftrieb für Worte, Nachrichten und die Menschen, die sie tragen.',
          fr: 'Jupiter est en dialogue avec Mercure ou la Lune — un élan généreux sur les mots, les nouvelles et ceux qui les portent.',
          'es-419': 'Júpiter conversa con Mercurio o con la Luna — un impulso generoso sobre las palabras, las noticias y quienes las llevan.',
          'pt-BR': 'Júpiter está conversando com Mercúrio ou com a Lua — um impulso generoso sobre as palavras, as notícias e quem as carrega.',
        },
      },
      partial: {
        phrase_short: {
          en: 'A loose lift on the message',
          de: 'Ein loser Auftrieb für die Botschaft',
          fr: 'Un léger élan sur le message',
          'es-419': 'Un impulso flojo sobre el mensaje',
          'pt-BR': 'Um impulso frouxo sobre a mensagem',
        },
        phrase_full: {
          en: 'Jupiter touches the messenger from a distance. Words and news do well, though the boost is gentle.',
          de: 'Jupiter berührt den Boten aus der Ferne. Worte und Nachrichten gedeihen, auch wenn der Schub sanft ist.',
          fr: 'Jupiter touche le messager à distance. Les mots et les nouvelles s’en sortent bien, même si l’élan est doux.',
          'es-419': 'Júpiter toca al mensajero desde lejos. Las palabras y las noticias andan bien, aunque el impulso es suave.',
          'pt-BR': 'Júpiter toca o mensageiro à distância. As palavras e as notícias vão bem, embora o impulso seja suave.',
        },
      },
      fail: {
        phrase_short: {
          en: 'No lift on the message',
          de: 'Kein Auftrieb für die Botschaft',
          fr: 'Aucun élan sur le message',
          'es-419': 'Ningún impulso sobre el mensaje',
          'pt-BR': 'Nenhum impulso sobre a mensagem',
        },
        phrase_full: {
          en: 'Jupiter does not reach Mercury or the Moon today. Messages travel on their own merit.',
          de: 'Jupiter erreicht heute weder Merkur noch den Mond. Botschaften reisen auf eigenen Verdienst.',
          fr: 'Jupiter n’atteint ni Mercure ni la Lune aujourd’hui. Les messages voyagent par leur propre mérite.',
          'es-419': 'Júpiter no alcanza a Mercurio ni a la Luna hoy. Los mensajes viajan por su propio mérito.',
          'pt-BR': 'Júpiter não alcança Mercúrio nem a Lua hoje. As mensagens viajam pelo próprio mérito.',
        },
      },
    },
  },

  no_malefic_on_angle: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'No difficult planet on point',
          de: 'Kein schwieriger Planet an der Achse',
          fr: 'Aucune planète difficile sur l’angle',
          'es-419': 'Ningún planeta difícil sobre el ángulo',
          'pt-BR': 'Nenhum planeta difícil sobre o ângulo',
        },
        phrase_full: {
          en: 'The most visible points of the chart are free of difficult planets. The shape of the day is uncluttered.',
          de: 'Die sichtbarsten Punkte des Charts sind frei von schwierigen Planeten. Die Form des Tages ist aufgeräumt.',
          fr: 'Les points les plus visibles du thème sont libres de planètes difficiles. La forme de la journée est dégagée.',
          'es-419': 'Los puntos más visibles de la carta están libres de planetas difíciles. La forma del día es despejada.',
          'pt-BR': 'Os pontos mais visíveis do mapa estão livres de planetas difíceis. O formato do dia está desimpedido.',
        },
      },
      partial: {
        phrase_short: {
          en: 'A difficult planet is near point',
          de: 'Ein schwieriger Planet ist nahe der Achse',
          fr: 'Une planète difficile est près de l’angle',
          'es-419': 'Un planeta difícil está cerca del ángulo',
          'pt-BR': 'Um planeta difícil está perto do ângulo',
        },
        phrase_full: {
          en: 'A difficult planet hovers near one of the angles without sitting on it. Some friction, not a wall.',
          de: 'Ein schwieriger Planet schwebt nahe einer der Achsen, ohne darauf zu sitzen. Etwas Reibung, keine Wand.',
          fr: 'Une planète difficile flotte près de l’un des angles sans s’y poser. Un peu de friction, pas un mur.',
          'es-419': 'Un planeta difícil ronda cerca de uno de los ángulos sin posarse en él. Algo de fricción, no un muro.',
          'pt-BR': 'Um planeta difícil paira perto de um dos ângulos sem se firmar nele. Algum atrito, não um muro.',
        },
      },
      fail: {
        phrase_short: {
          en: 'A difficult planet is on point',
          de: 'Ein schwieriger Planet steht an der Achse',
          fr: 'Une planète difficile est sur l’angle',
          'es-419': 'Un planeta difícil está sobre el ángulo',
          'pt-BR': 'Um planeta difícil está sobre o ângulo',
        },
        phrase_full: {
          en: 'Mars or Saturn sits on one of the chart\'s angles. Worth waiting if the choice of day is yours.',
          de: 'Mars oder Saturn sitzt auf einer der Achsen des Charts. Es lohnt sich zu warten, wenn die Wahl des Tages bei dir liegt.',
          fr: 'Mars ou Saturne se tient sur l’un des angles du thème. Mieux vaut attendre si le choix du jour t’appartient.',
          'es-419': 'Marte o Saturno se ubica sobre uno de los ángulos de la carta. Conviene esperar si la elección del día está en tus manos.',
          'pt-BR': 'Marte ou Saturno está sobre um dos ângulos do mapa. Vale esperar se a escolha do dia for sua.',
        },
      },
    },
  },

  part_of_fortune_in_good_house: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'The Lot of Fortune is well-placed',
          de: 'Der Glückspunkt ist gut gestellt',
          fr: 'La Part de Fortune est bien placée',
          'es-419': 'La Parte de la Fortuna está bien ubicada',
          'pt-BR': 'A Parte da Fortuna está bem posicionada',
        },
        phrase_full: {
          en: 'The Lot of Fortune — a traditional point for what comes to you — sits in a part of the sky that suits this matter.',
          de: 'Der Glückspunkt — ein traditioneller Punkt für das, was dir zukommt — steht in einem Teil des Himmels, der zu dieser Sache passt.',
          fr: 'La Part de Fortune — un point traditionnel pour ce qui te revient — se tient dans une partie du ciel qui convient à cette affaire.',
          'es-419': 'La Parte de la Fortuna — un punto tradicional para aquello que llega — se ubica en una parte del cielo que conviene a este asunto.',
          'pt-BR': 'A Parte da Fortuna — um ponto tradicional para aquilo que chega a você — está numa parte do céu que combina com este assunto.',
        },
      },
      partial: {
        phrase_short: {
          en: 'The Lot of Fortune is adjacent',
          de: 'Der Glückspunkt ist benachbart',
          fr: 'La Part de Fortune est voisine',
          'es-419': 'La Parte de la Fortuna está cercana',
          'pt-BR': 'A Parte da Fortuna está próxima',
        },
        phrase_full: {
          en: 'The Lot of Fortune is in a part of the sky that touches this matter without centering it. A small tailwind.',
          de: 'Der Glückspunkt steht in einem Teil des Himmels, der diese Sache berührt, ohne sie ins Zentrum zu stellen. Ein kleiner Rückenwind.',
          fr: 'La Part de Fortune est dans une partie du ciel qui touche cette affaire sans la mettre au centre. Un petit vent dans le dos.',
          'es-419': 'La Parte de la Fortuna está en una parte del cielo que roza este asunto sin centrarlo. Un pequeño viento a favor.',
          'pt-BR': 'A Parte da Fortuna está numa parte do céu que toca este assunto sem centralizá-lo. Um pequeno vento a favor.',
        },
      },
      fail: {
        phrase_short: {
          en: 'The Lot of Fortune is elsewhere',
          de: 'Der Glückspunkt ist anderswo',
          fr: 'La Part de Fortune est ailleurs',
          'es-419': 'La Parte de la Fortuna está en otra parte',
          'pt-BR': 'A Parte da Fortuna está em outro lugar',
        },
        phrase_full: {
          en: 'The Lot of Fortune is in a part of the sky unrelated to this matter today. No particular help from that quarter.',
          de: 'Der Glückspunkt steht heute in einem Teil des Himmels, der nichts mit dieser Sache zu tun hat. Keine besondere Hilfe aus dieser Richtung.',
          fr: 'La Part de Fortune est aujourd’hui dans une partie du ciel sans rapport avec cette affaire. Aucune aide particulière de ce côté.',
          'es-419': 'La Parte de la Fortuna está hoy en una parte del cielo ajena a este asunto. Sin ayuda particular desde ese lado.',
          'pt-BR': 'A Parte da Fortuna está hoje numa parte do céu sem relação com este assunto. Nenhuma ajuda particular desse lado.',
        },
      },
    },
  },

  moon_and_asc_ruler_in_good_aspect: {
    polarity_aware: {
      pass: {
        phrase_short: {
          en: 'You and the Moon are aligned',
          de: 'Du und der Mond seid im Einklang',
          fr: 'Toi et la Lune êtes en accord',
          'es-419': 'La Luna y quien actúa están de acuerdo',
          'pt-BR': 'Você e a Lua estão em acordo',
        },
        phrase_full: {
          en: 'The Moon and the planet that stands for you are in a friendly aspect. Body and timing agree.',
          de: 'Der Mond und der Planet, der für dich steht, sind in einem freundlichen Aspekt. Körper und Zeitpunkt stimmen überein.',
          fr: 'La Lune et la planète qui te représente sont en bon aspect. Le corps et le moment s’accordent.',
          'es-419': 'La Luna y el planeta que representa a la persona están en buen aspecto. El cuerpo y el momento concuerdan.',
          'pt-BR': 'A Lua e o planeta que representa você estão em bom aspecto. Corpo e momento concordam.',
        },
      },
      partial: {
        phrase_short: {
          en: 'Loose agreement with the Moon',
          de: 'Lockere Übereinstimmung mit dem Mond',
          fr: 'Accord lâche avec la Lune',
          'es-419': 'Acuerdo flojo con la Luna',
          'pt-BR': 'Acordo frouxo com a Lua',
        },
        phrase_full: {
          en: 'The Moon and the planet that stands for you are loosely connected. Timing is workable, not glowing.',
          de: 'Der Mond und der Planet, der für dich steht, sind locker verbunden. Der Zeitpunkt ist machbar, nicht strahlend.',
          fr: 'La Lune et la planète qui te représente sont liées de façon lâche. Le moment est faisable, sans éclat.',
          'es-419': 'La Luna y el planeta que representa a la persona están conectados de forma floja. El momento es viable, sin brillo.',
          'pt-BR': 'A Lua e o planeta que representa você estão ligados de forma frouxa. O momento é viável, sem brilho.',
        },
      },
      fail: {
        phrase_short: {
          en: 'You and the Moon are out of step',
          de: 'Du und der Mond seid aus dem Takt',
          fr: 'Toi et la Lune êtes en décalage',
          'es-419': 'La Luna y quien actúa están desacompasados',
          'pt-BR': 'Você e a Lua estão fora de compasso',
        },
        phrase_full: {
          en: 'The Moon and the planet that stands for you are not in good aspect today. Timing fights you a little.',
          de: 'Der Mond und der Planet, der für dich steht, sind heute nicht in gutem Aspekt. Der Zeitpunkt sträubt sich ein wenig gegen dich.',
          fr: 'La Lune et la planète qui te représente ne sont pas en bon aspect aujourd’hui. Le moment te résiste un peu.',
          'es-419': 'La Luna y el planeta que representa a la persona no están en buen aspecto hoy. El momento ofrece algo de resistencia.',
          'pt-BR': 'A Lua e o planeta que representa você não estão em bom aspecto hoje. O momento resiste um pouco a você.',
        },
      },
    },
  },
};
