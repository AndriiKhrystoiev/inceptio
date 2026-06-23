// Activity-asymmetric severity hints for daily-note composition.
//
// Phrasings are LOCKED — sourced verbatim from the activity-preference
// plan (2026-06-02). Each string carries a mandatory "For a {activity}, "
// framing prefix; per voice spec §12.4 the per-entry text budget is
// ≤ 150 chars (vs ≤ 140 for supporting_lines, which lack the prefix).
// Do not paraphrase or trim without astrologer review (§11.4).
//
// 12 entries marked `pending_astrologer_ruling: false` are confirmed.
// The 4 `moon_voc_intraday` entries are provisional drafts pending the
// astrologer pass; the `getSeverityHint` helper hides them by default.
import type { Activity } from '@inceptio/shared-types';
import { localize } from '../types';
import type { Locale, Localized } from '../types';

export type SeverityCondition =
  | 'mercury_retrograde'
  | 'venus_retrograde'
  | 'moon_voc'
  | 'moon_voc_intraday';

type Entry = {
  // `Localized` (VOICE phase): plain string today (en-everywhere); D-severity
  // migrates to a per-locale Record. Structural metadata
  // (pending_astrologer_ruling) stays ABOVE the leaf so a locale re-translates
  // independently. Task 0 touches the SIGNATURE/mechanism only — the DATA is
  // left English (D-severity's job).
  text: Localized;
  pending_astrologer_ruling: boolean;
};

export const SEVERITY_HINTS: Record<SeverityCondition, Record<Activity, Entry>> = {
  mercury_retrograde: {
    wedding: {
      text: {
        en: "For a wedding, tradition is gentler here than for a contract — the vows themselves are less impacted than the legal documents that accompany them.",
        de: "Bei einer Hochzeit ist die Tradition milder als beim Vertrag — die Gelübde selbst trifft es weniger als die rechtlichen Papiere dazu.",
        fr: "Pour un mariage, la tradition est plus douce que pour un contrat — les vœux sont moins touchés que les documents légaux qui les accompagnent.",
        "es-419": "Para una boda, la tradición es más suave que para un contrato: los votos se ven menos afectados que los documentos legales que los acompañan.",
        "pt-BR": "Para um casamento, a tradição é mais branda que num contrato — os votos sofrem menos que os documentos legais que os acompanham.",
      },
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: {
        en: "For a contract, this is the stretch tradition asks you to wait through — words and agreements made now tend to need rewriting.",
        de: "Bei einem Vertrag ist dies die Zeit, die du laut Tradition abwarten solltest — Worte und Abmachungen von jetzt müssen oft neu gefasst werden.",
        fr: "Pour un contrat, c'est la période que la tradition te demande d'attendre — les mots et accords conclus maintenant doivent souvent être réécrits.",
        "es-419": "Para un contrato, esta es la etapa que la tradición pide dejar pasar: las palabras y acuerdos de ahora suelen necesitar reescritura.",
        "pt-BR": "Para um contrato, esta é a fase que a tradição pede para você atravessar — palavras e acordos feitos agora costumam precisar de revisão.",
      },
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: {
        en: "For a launch, the announcements and the early outreach don't land the way they will in a few weeks. Better held.",
        de: "Bei einem Start landen die Ankündigungen und der erste Kontakt nicht so wie in ein paar Wochen. Besser noch warten.",
        fr: "Pour un lancement, les annonces et les premiers contacts ne portent pas comme ils le feront dans quelques semaines. Mieux vaut attendre.",
        "es-419": "Para un lanzamiento, los anuncios y el primer contacto no llegan como lo harán en unas semanas. Mejor esperar.",
        "pt-BR": "Para um lançamento, os anúncios e os primeiros contatos não chegam como chegarão em algumas semanas. Melhor segurar.",
      },
      pending_astrologer_ruling: false,
    },
    travel: {
      text: {
        en: "For travel, the trip itself is fine — but build buffer for delays, and double-check the tickets and the times.",
        de: "Bei einer Reise ist die Fahrt selbst in Ordnung — plane aber Puffer für Verzögerungen ein und prüfe Tickets und Zeiten doppelt.",
        fr: "Pour un voyage, le trajet lui-même va bien — mais prévois une marge pour les retards et vérifie deux fois les billets et les horaires.",
        "es-419": "Para un viaje, el trayecto en sí está bien, pero conviene dejar margen para retrasos y revisar dos veces los boletos y los horarios.",
        "pt-BR": "Para uma viagem, o trajeto em si está bem — mas reserve folga para atrasos e confira duas vezes as passagens e os horários.",
      },
      pending_astrologer_ruling: false,
    },
  },
  venus_retrograde: {
    wedding: {
      text: {
        en: "For a wedding, this is the stretch tradition asks you to wait through — Venus governs marriage, and her support is withdrawn now.",
        de: "Bei einer Hochzeit ist dies die Zeit, die du laut Tradition abwarten solltest — Venus regiert die Ehe, und ihr Beistand fehlt jetzt.",
        fr: "Pour un mariage, c'est la période que la tradition te demande d'attendre — Vénus gouverne le mariage, et son soutien se retire maintenant.",
        "es-419": "Para una boda, esta es la etapa que la tradición pide dejar pasar: Venus rige el matrimonio, y su apoyo se retira ahora.",
        "pt-BR": "Para um casamento, esta é a fase que a tradição pede para você atravessar — Vênus rege o casamento, e o apoio dela se retira agora.",
      },
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: {
        en: "For a contract, this matters most for partnerships and anything tied to money — renewing an old agreement holds; beginning a new one strains.",
        de: "Bei einem Vertrag zählt dies vor allem für Partnerschaften und alles ums Geld — ein altes Abkommen erneuern geht; ein neues beginnen wird zäh.",
        fr: "Pour un contrat, cela compte surtout pour les partenariats et tout ce qui touche à l'argent — renouveler tient ; commencer du neuf tire.",
        "es-419": "Para un contrato, esto pesa sobre todo en sociedades y en lo ligado al dinero: renovar un acuerdo viejo aguanta; iniciar uno nuevo cuesta.",
        "pt-BR": "Para um contrato, isto pesa mais em parcerias e em tudo ligado a dinheiro — renovar um acordo antigo resiste; iniciar um novo tensiona.",
      },
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: {
        en: "For a launch, this stretch sits across the things you want this venture to attract — revenue, customers, goodwill. Better to wait.",
        de: "Bei einem Start liegt diese Phase quer zu dem, was das Vorhaben anziehen soll — Umsatz, Kunden, Wohlwollen. Besser warten.",
        fr: "Pour un lancement, cette période barre ce que ce projet veut attirer — revenus, clients, bonne volonté. Mieux vaut attendre.",
        "es-419": "Para un lanzamiento, esta etapa se cruza con lo que el proyecto busca atraer: ingresos, clientes, buena voluntad. Mejor esperar.",
        "pt-BR": "Para um lançamento, esta fase atravessa o que o projeto quer atrair — receita, clientes, boa vontade. Melhor esperar.",
      },
      pending_astrologer_ruling: false,
    },
    travel: {
      text: {
        en: "For travel, this matters less than it does for the other beginnings — a trip during this stretch is fine to take.",
        de: "Bei einer Reise zählt dies weniger als bei den anderen Anfängen — eine Reise in dieser Phase ist gut zu unternehmen.",
        fr: "Pour un voyage, cela compte moins que pour les autres débuts — un voyage pendant cette période se prend sans souci.",
        "es-419": "Para un viaje, esto pesa menos que en los demás comienzos: un viaje durante esta etapa se puede emprender sin problema.",
        "pt-BR": "Para uma viagem, isto pesa menos do que nos outros começos — uma viagem nesta fase pode ser feita tranquilamente.",
      },
      pending_astrologer_ruling: false,
    },
  },
  moon_voc: {
    wedding: {
      text: {
        en: "For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days.",
        de: "Bei einer Hochzeit ist die Tradition hier eindeutig — was heute begonnen wird, fasst nicht so Wurzeln wie an anderen Tagen.",
        fr: "Pour un mariage, la tradition est sans ambiguïté ici — ce qui commence aujourd'hui ne prend pas racine comme les autres jours.",
        "es-419": "Para una boda, la tradición es clara aquí: lo que empieza hoy no echa raíces como en otros días.",
        "pt-BR": "Para um casamento, a tradição é clara aqui — o que se começa hoje não cria raízes como em outros dias.",
      },
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: {
        en: "For a contract, today is the day to hold signing — the matter begun now tends to need revisiting or quietly fall away.",
        de: "Bei einem Vertrag ist heute der Tag, die Unterschrift zurückzuhalten — was jetzt beginnt, muss oft nachbearbeitet werden oder verläuft sich.",
        fr: "Pour un contrat, aujourd'hui est le jour de suspendre la signature — ce qui commence maintenant doit souvent être repris ou s'efface doucement.",
        "es-419": "Para un contrato, hoy conviene aplazar la firma: lo que empieza ahora suele requerir revisión o se desvanece sin más.",
        "pt-BR": "Para um contrato, hoje é dia de segurar a assinatura — o que começa agora costuma precisar de revisão ou se dissolve aos poucos.",
      },
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: {
        en: "For a launch, the announcement made today tends to land softly or get reshuffled later — wait for the Moon to settle into the next sign.",
        de: "Bei einem Start landet die heutige Ankündigung oft leise oder wird später umgestellt — warte, bis der Mond ins nächste Zeichen gewechselt ist.",
        fr: "Pour un lancement, l'annonce faite aujourd'hui porte doucement ou sera remaniée — attends que la Lune passe dans le signe suivant.",
        "es-419": "Para un lanzamiento, el anuncio de hoy llega suave o se reorganiza después: conviene esperar a que la Luna pase al signo siguiente.",
        "pt-BR": "Para um lançamento, o anúncio de hoje chega de leve ou é remanejado depois — espere a Lua entrar no próximo signo.",
      },
      pending_astrologer_ruling: false,
    },
    travel: {
      text: {
        en: "For travel, the journey itself is fine — but if you're booking a ticket, wait until the Moon reaches the next sign.",
        de: "Bei einer Reise ist die Fahrt selbst in Ordnung — aber wenn du ein Ticket buchst, warte, bis der Mond das nächste Zeichen erreicht.",
        fr: "Pour un voyage, le trajet lui-même va bien — mais si tu réserves un billet, attends que la Lune atteigne le signe suivant.",
        "es-419": "Para un viaje, el trayecto en sí está bien, pero al reservar un boleto conviene esperar a que la Luna llegue al signo siguiente.",
        "pt-BR": "Para uma viagem, o trajeto em si está bem — mas, se for comprar a passagem, espere a Lua chegar ao próximo signo.",
      },
      pending_astrologer_ruling: false,
    },
  },
  // TODO(astrologer-review §11.4): the four moon_voc_intraday entries are
  // provisional drafts. Confirm or refine in the next astrologer pass,
  // then flip `pending_astrologer_ruling` to false here.
  // provisional — matches pending EN; re-translate if ruling changes (§11.4).
  // All four moon_voc_intraday leaves carry pending_astrologer_ruling: true.
  moon_voc_intraday: {
    wedding: {
      text: {
        en: "For a wedding, time the vows for the afternoon — the morning hours aren't held by the sky the way the afternoon will be.",
        de: "Bei einer Hochzeit lege die Gelübde auf den Nachmittag — die Morgenstunden werden vom Himmel nicht so getragen wie der Nachmittag.",
        fr: "Pour un mariage, place les vœux l'après-midi — les heures du matin ne sont pas portées par le ciel comme le sera l'après-midi.",
        "es-419": "Para una boda, conviene fijar los votos por la tarde: las horas de la mañana no están sostenidas por el cielo como sí lo estará la tarde.",
        "pt-BR": "Para um casamento, marque os votos para a tarde — as horas da manhã não são sustentadas pelo céu como a tarde será.",
      },
      pending_astrologer_ruling: true,
    },
    contracts: {
      text: {
        en: "For a contract, hold the signing until after midday — the morning void doesn't carry agreements.",
        de: "Bei einem Vertrag halte die Unterschrift bis nach dem Mittag zurück — die Leere am Morgen trägt keine Abmachungen.",
        fr: "Pour un contrat, garde la signature pour après midi — le vide du matin ne porte pas les accords.",
        "es-419": "Para un contrato, conviene aplazar la firma hasta pasado el mediodía: el vacío de la mañana no sostiene los acuerdos.",
        "pt-BR": "Para um contrato, segure a assinatura até depois do meio-dia — o vazio da manhã não carrega acordos.",
      },
      pending_astrologer_ruling: true,
    },
    business_launch: {
      text: {
        en: "For a launch, time the announcement for the afternoon — the morning hours land softer than the rest of the day.",
        de: "Bei einem Start lege die Ankündigung auf den Nachmittag — die Morgenstunden landen sanfter als der Rest des Tages.",
        fr: "Pour un lancement, place l'annonce l'après-midi — les heures du matin portent plus doucement que le reste de la journée.",
        "es-419": "Para un lanzamiento, conviene fijar el anuncio por la tarde: las horas de la mañana llegan más suaves que el resto del día.",
        "pt-BR": "Para um lançamento, marque o anúncio para a tarde — as horas da manhã chegam mais suaves que o restante do dia.",
      },
      pending_astrologer_ruling: true,
    },
    travel: {
      text: {
        en: "For travel, the morning is fine to be in motion — but hold any new bookings or reservations for the afternoon.",
        de: "Bei einer Reise ist der Morgen gut, um unterwegs zu sein — aber halte neue Buchungen oder Reservierungen für den Nachmittag zurück.",
        fr: "Pour un voyage, le matin convient pour être en route — mais garde toute nouvelle réservation pour l'après-midi.",
        "es-419": "Para un viaje, la mañana sirve para estar en movimiento, pero conviene dejar cualquier reserva nueva para la tarde.",
        "pt-BR": "Para uma viagem, a manhã é boa para estar em movimento — mas deixe qualquer reserva nova para a tarde.",
      },
      pending_astrologer_ruling: true,
    },
  },
};

type GetSeverityHintOptions = { includePending?: boolean };

export function getSeverityHint(
  condition: SeverityCondition,
  activity: Activity,
  locale: Locale,
  options: GetSeverityHintOptions = {}
): string | undefined {
  const entry = SEVERITY_HINTS[condition]?.[activity];
  if (!entry) return undefined;
  if (entry.pending_astrologer_ruling && !options.includePending) return undefined;
  return localize(entry.text, locale);
}
