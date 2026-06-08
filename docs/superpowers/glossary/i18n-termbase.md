# Inceptio i18n Termbase + Register Ruling

> **Status: DRAFT — gates translation.** This document is the single source of truth for (a) the
> per-locale **register ruling** (O1) and (b) the shared **astrology-term renderings** (§7 of the spec)
> that astrology-flavored CHROME (loading copy, onboarding positioning, calendar legend) and the later
> VOICE pass both draw on. **The termbase below was enriched for the VOICE pass (2026-06-08)** with the
> full set of traditional-astrology terms the server VOICE dictionaries use — it is now the authoritative
> source the D-tasks consult for per-locale renderings. Astrology-flavored chrome is a **translator/register** concern, not an
> astrologer one — but the traditional-astrology terms below have established forms a generalist MT gets
> wrong and **must be confirmed by a locale-literate astrology reader** before launch (O3).
>
> **Translation for a locale does not start until that locale's register is locked** (en is authoritative;
> de/fr/es-419/pt-BR values throughout the repo are register-correct DRAFTS pending native + astrology
> review). Terms flagged `// REVIEW` are pending that review.

Locales: **en** (authoritative) · **de** · **fr** · **es-419** · **pt-BR**.
Supported bundle keys map to Intl locales as `es-419 → es`, `pt-BR → pt` (never pass a bundle key to `Intl.*`).

---

## Register ruling (O1)

Resolved by the owner (2026-06-08, brand call). The warm/intimate companion voice — "a thoughtful friend
who happens to know traditional astrology" — drives the formality choice toward the intimate register where
the language allows it.

| Locale | Register | Status | Notes |
|---|---|---|---|
| **en** | n/a (no T–V distinction) | locked | Authoritative source copy. |
| **de** | **`du`** (informal) | **locked** | `Sie` reads corporate and clashes with the voice. Use `du`/`dein`, imperative `du`-forms. |
| **fr** | **`tu`** (informal) | **PROVISIONAL — French-native confirm required** | Chosen for consistency with `du`. French defaults more formal: `vous` is safer-but-cooler, `tu` risks reading presumptuous. **A French native MUST confirm before fr translation starts.** Until confirmed, fr register is *provisional `tu`*. |
| **es-419** | **voseo-neutral** | **locked** | Avoid 2nd-person-**singular** verb forms entirely so one file serves Mexico (tuteo) + Río de la Plata (voseo). Prefer impersonal / infinitive / noun-phrase constructions ("Buscar ciudad", not "Busca/Buscá tu ciudad"). |
| **pt-BR** | **`você`** | **locked** | Standard Brazilian informal-polite. |

**Operational rule:** a locale's draft strings may be authored to its provisional register, but the locale
is **not launch-eligible** until its register row reads "locked" (fr currently does not).

---

## Astrology-term termbase (§7)

Shared renderings so the same term does not diverge between loading copy, onboarding positioning, calendar
legend, and the later VOICE headlines. en is the source; the other columns are register-correct DRAFTS.

Terms marked **`// REVIEW — needs locale-literate astrology reader`** have an established traditional-astrology
form a generalist translator/MT will get wrong (per O3 + the domain caveat). Do not improvise these.

> **VOICE-pass enrichment (2026-06-08).** This section was expanded from the CHROME draft (the first block
> below) to the **full set of traditional-astrology terms the server VOICE dictionaries actually use** —
> harvested from `workers/api-proxy/src/translations/dictionary/{factors,excluded-reasons,daily-notes,
> severity-hints,daily-note-variants,daily-note-fallbacks}.ts`. This is the **authoritative source the
> D-tasks (D-factors, D-excluded, D-dailynotes, D-severity, D-variants, D-overrides, D-fallbacks, D-headlines)
> consult** for the locale's traditional renderings. Where a term has an established traditional-astrology
> form, the established form is given; where none is fixed, the row carries a best-natural rendering marked
> **`// best-effort, confirm in community review`**. Per the VOICE plan the de/fr/es-419/pt-BR values are
> register-correct DRAFTS pending best-effort community review; en stays authoritative. Register, per O1:
> **de = `du`**, **fr = `tu`** (provisional), **es-419 = voseo-neutral**, **pt-BR = `você`**.

### Core nouns (CHROME)

| Term (en) | de | fr | es-419 | pt-BR | Notes |
|---|---|---|---|---|---|
| **sky** | der Himmel | le ciel | el cielo | o céu | Brand-recurring ("Looking at the sky for you…"). Keep one rendering across all surfaces. |
| **planets** | die Planeten | les planètes | los planetas | os planetas | |
| **window** | das Zeitfenster | la fenêtre | la ventana | a janela | UI sense = a favorable span of time. Confirm the *electional* sense reads naturally, not a GUI "window". `// REVIEW` |
| **moment** | der Moment | le moment | el momento | o momento | Product's user-facing word for a recommended time. |
| **void of course** | leerlaufend (Mond) | (Lune) vide de course | (Luna) fuera de curso | **Lua Fora de Curso** | Traditional term. PT established form is *Lua Fora de Curso*. `// REVIEW — needs locale-literate astrology reader` |
| **retrograde** | rückläufig | rétrograde | retrógrado | retrógrado | Traditional term; established cognate forms exist per locale. `// REVIEW — needs locale-literate astrology reader` |
| **combust** | verbrannt / unter den Sonnenstrahlen | combuste / sous les rayons | combusto / bajo los rayos | **Combustão** (combusto) | Traditional term (planet within ~8° of the Sun). PT established form is *Combustão* / *combusto*. `// REVIEW — needs locale-literate astrology reader` |
| **angle** | der Winkel / die Achse | l'angle / l'axe | el ángulo / el eje | o ângulo / o eixo | Astrological *angle* (ASC/MC/DSC/IC axis), not a geometric angle. `// REVIEW — needs locale-literate astrology reader` |
| **sign** | das Tierkreiszeichen | le signe | el signo | o signo | Zodiac sign. Disambiguate from a generic "sign". `// REVIEW — needs locale-literate astrology reader` |
| **dignified** | (planetar) würdevoll / in Würde | en dignité | en dignidad / dignificado | dignificado / em dignidade | Traditional essential-dignity sense, not the colloquial "dignified". `// REVIEW — needs locale-literate astrology reader` |

### Planet names (anchor — keep consistent across all D-tasks)

The VOICE dictionaries name planets directly ("Venus brings warmth", "Mercury runs clear", "Jupiter is in
view"). Lock one rendering per planet; the traditional/astronomical names are the established forms and are
identical to everyday usage in each locale.

| Term (en) | de | fr | es-419 | pt-BR | Notes |
|---|---|---|---|---|---|
| **the Moon** | der Mond | la Lune | la Luna | a Lua | Feminine in all four (cf. en "she/her" Moon — keep the warm personification). |
| **the Sun** | die Sonne | le Soleil | el Sol | o Sol | |
| **Mercury** | Merkur | Mercure | Mercurio | Mercúrio | The "messenger"; governs words/papers. |
| **Venus** | Venus | Vénus | Venus | Vênus | Feminine personification ("she/her") — keep. |
| **Mars** | Mars | Mars | Marte | Marte | A malefic. |
| **Jupiter** | Jupiter | Jupiter | Júpiter | Júpiter | The "room to grow" benefic. |
| **Saturn** | Saturn | Saturne | Saturno | Saturno | A malefic. |

### Conditions, dignities & motion (VOICE)

| Term (en) | de | fr | es-419 | pt-BR | Notes |
|---|---|---|---|---|---|
| **retrograde — Mercury** | Merkur ist rückläufig | Mercure est rétrograde | Mercurio está retrógrado | Mercúrio está retrógrado | `// REVIEW` Established cognate in all four. ES/PT *retrógrado*, FR *rétrograde*, DE *rückläufig*. |
| **retrograde — Venus** | Venus ist rückläufig | Vénus est rétrograde | Venus está retrógrada | Vênus está retrógrada | `// REVIEW` ES/PT take feminine *retrógrada* with Venus/Vênus. |
| **retrograde — Mars** | Mars ist rückläufig | Mars est rétrograde | Marte está retrógrado | Marte está retrógrado | `// REVIEW` **Ruling-pending** EN (`mars_retrograde` upstream-added) — render to match current EN; keep pending marker. |
| **retrograde — Jupiter** | Jupiter ist rückläufig | Jupiter est rétrograde | Júpiter está retrógrado | Júpiter está retrógrado | `// REVIEW` **Ruling-pending** EN (`jupiter_retrograde` upstream-added) — render to match current EN; keep pending marker. |
| **retrograde — Saturn** | Saturn ist rückläufig | Saturne est rétrograde | Saturno está retrógrado | Saturno está retrógrado | `// REVIEW` |
| **combust (Mercury hidden by the Sun)** | von der Sonne verbrannt / unter den Sonnenstrahlen | combuste / sous les rayons du Soleil | combusto / bajo los rayos del Sol | em **Combustão** / combusto (oculto pela luz do Sol) | `// REVIEW` **Ruling-pending** EN (`mercury_combust`). PT established *Combustão* / *combusto*. Render provisionally; keep pending marker. |
| **dignified / in dignity** | würdevoll / in seiner Würde | en dignité / digne | en dignidad / dignificado | dignificado / em dignidade | `// REVIEW` Essential-dignity sense, NOT colloquial "dignified/digno". |
| **well-placed (in a good house)** | gut platziert / gut gestellt | bien placé(e) | bien ubicado(a) / bien situado(a) | bem posicionado(a) / bem situado(a) | `// best-effort, confirm in community review` House-placement sense. |
| **angular (on/near an angle)** | an einer Achse / an den Winkeln | sur un angle / angulaire | sobre un ángulo / angular | sobre um ângulo / angular | `// REVIEW` On the ASC/MC/DSC/IC axes. Server says "on the angles" / "on point". |
| **benefic (a kind / helpful planet)** | ein Wohltäter / ein günstiger Planet | une planète bénéfique / un bénéfique | un benéfico / planeta benéfica | um benéfico / planeta benéfico | `// REVIEW` Traditional *benefic* (Venus, Jupiter). Server softens to "a kind meeting / a friendly planet" — keep the warm paraphrase where EN does, use the term only where EN uses it. |
| **malefic (a difficult planet)** | ein Übeltäter / ein schwieriger Planet | un maléfique / une planète difficile | un maléfico / planeta difícil | um maléfico / planeta difícil | `// REVIEW` Traditional *malefic* (Mars, Saturn). Server's warm form is "a difficult planet" — mirror that softening per leaf. |
| **applying (Moon applying to…)** | (Mond) im Zulauf auf / sich annähernd an | (Lune) en application / s'appliquant à | (Luna) aplicándose a / en aplicación | (Lua) em aplicação a / aproximando-se de | `// REVIEW` Traditional *applying* aspect (approaching, not yet exact). Server's warm form is "the Moon is moving toward". |
| **separating** | sich entfernend / im Ablauf | en séparation / se séparant | separándose / en separación | em separação / afastando-se | `// best-effort, confirm in community review` Counterpart to applying; rarely surfaced in copy. |
| **waxing (Moon gathering light)** | zunehmend (Mond) | (Lune) croissante | (Luna) creciente | (Lua) crescente | `// REVIEW` Traditional *waxing*. Server's warm form: "the Moon is gathering light". |
| **waning (Moon losing light)** | abnehmend (Mond) | (Lune) décroissante | (Luna) menguante | (Lua) minguante | `// REVIEW` Counterpart; server's warm form: "the Moon is waning / losing light". |
| **reception (mutual reception / aspect)** | Rezeption / gegenseitige Aufnahme | réception / réception mutuelle | recepción / recepción mutua | recepção / recepção mútua | `// REVIEW` Traditional *reception*. Server's warm form: "you and the matter are in conversation". |
| **aspect (good aspect / in aspect)** | Aspekt / im guten Aspekt | aspect / en bon aspect | aspecto / en buen aspecto | aspecto / em bom aspecto | `// REVIEW` Generic angular relationship. Server softens to "in conversation / a clean line / a friendly meeting". |
| **planetary hour** | die Planetenstunde | l'heure planétaire | la hora planetaria | a hora planetária | `// REVIEW` Traditional *planetary hour* (the ruler of the hour). Established calque in all four. |
| **fixed star** | der Fixstern | l'étoile fixe | la estrella fija | a estrela fixa | `// REVIEW` Traditional *fixed star*. Established calque in all four. |
| **eclipse** | die Finsternis / die Eklipse | l'éclipse | el eclipse | o eclipse | `// best-effort, confirm in community review` Prefer DE *Finsternis* (everyday) over *Eklipse* for the warm voice. |
| **via combusta** | die Via Combusta / der "verbrannte Weg" | la via combusta / la voie brûlée | la vía combusta / el camino quemado | a Via Combusta / o "caminho queimado" | `// REVIEW` Latin term *via combusta* (the burnt path, ~15° Libra–15° Scorpio). Keep the Latin where EN does; the gloss is the parenthetical. |
| **the Lot/Part of Fortune** | der Glückspunkt / Pars Fortunae | la Part de Fortune | la Parte de la Fortuna / el Punto de la Fortuna | a Parte da Fortuna / a Roda da Fortuna | `// REVIEW` Traditional *Lot/Part of Fortune* (Pars Fortunae). EN copy uses "the Lot of Fortune". |
| **house ruler / the ruler of this matter** | der Herrscher (dieses Hauses / dieser Sache) | le maître (de la maison / de l'affaire) | el regente (de la casa / del asunto) | o regente (da casa / do assunto) | `// REVIEW` Traditional *ruler/lord*. Server's warm form: "the planet that governs this matter / stands for you". |
| **station / direct station** | Station / Direktstation (wird wieder direktläufig) | station / station directe (redevient direct) | estación / estación directa (vuelve a directo) | estação / estação direta (volta a ficar direto) | `// best-effort, confirm in community review` The moment a planet turns direct again ("until Thursday" promise). |

### Warm personification phrasings (NOT traditional terms — voice register)

The server's signature move is to *replace* the traditional term with a warm personification ("Mercury is
sleeping" for retrograde, "Venus is resting" for Venus rx). These are **brand voice, not astrology terms** —
translate them as natural-language phrases in the locale's register, NOT as the technical term. They are
listed here so the D-tasks render them consistently and recognise them as the deliberate softening of the
technical row above.

| en phrasing | Maps to (technical) | de (`du`) | fr (`tu`) | es-419 (voseo-neutral) | pt-BR (`você`) | Notes |
|---|---|---|---|---|---|---|
| **"Mercury is sleeping."** | Mercury retrograde | „Merkur schläft." | « Mercure dort. » | "Mercurio duerme." | "Mercúrio está dormindo." | **Project-wide LOCKED phrase** (CLAUDE.md). Keep the sleep image in every locale. |
| **"Mercury is walking back."** | Mercury retrograde (variant) | „Merkur geht zurück." | « Mercure revient sur ses pas. » | "Mercurio anda hacia atrás." | "Mercúrio está voltando atrás." | Variant-pool sibling. Same image family (reversing), keep playful. |
| **"Venus is resting."** | Venus retrograde | „Venus ruht." | « Vénus se repose. » | "Venus descansa." | "Vênus está descansando." | **Ruling-pending group** (closed-venus). Render provisionally; keep pending marker. |
| **"Venus is looking back."** | Venus retrograde (variant) | „Venus blickt zurück." | « Vénus regarde en arrière. » | "Venus mira hacia atrás." | "Vênus está olhando para trás." | Variant-pool sibling. |
| **"Mars is hesitating."** | Mars retrograde | „Mars zögert." | « Mars hésite. » | "Marte vacila." | "Marte está hesitando." | **Ruling-pending** (`mars_retrograde` upstream). Render provisionally; keep pending marker. |
| **"Jupiter is turning inward."** | Jupiter retrograde | „Jupiter wendet sich nach innen." | « Jupiter se tourne vers l'intérieur. » | "Júpiter se vuelve hacia adentro." | "Júpiter está se voltando para dentro." | **Ruling-pending** (`jupiter_retrograde` upstream). Render provisionally; keep pending marker. |
| **"Saturn is turning inward."** | Saturn retrograde | „Saturn wendet sich nach innen." | « Saturne se tourne vers l'intérieur. » | "Saturno se vuelve hacia adentro." | "Saturno está se voltando para dentro." | Confirmed (not pending). Mirror the Jupiter phrasing. |
| **"The Moon is between signs."** | Moon void of course | „Der Mond steht zwischen den Zeichen." | « La Lune est entre les signes. » | "La Luna está entre signos." | "A Lua está entre os signos." | The warm form of *void of course* (PT technical: *Lua Fora de Curso*). Keep the "between signs" image where EN uses it. |
| **"The Moon is between aspects."** | Moon void / intraday void | „Der Mond steht zwischen den Aspekten." | « La Lune est entre les aspects. » | "La Luna está entre aspectos." | "A Lua está entre os aspectos." | Intraday-void variant. |
| **"Mercury is hidden by the Sun's light."** | Mercury combust | „Merkur ist vom Sonnenlicht verdeckt." | « Mercure est caché par la lumière du Soleil. » | "Mercurio está oculto por la luz del Sol." | "Mercúrio está oculto pela luz do Sol." | **Ruling-pending** warm form of *combust* (PT technical: *Combustão*). Render provisionally; keep pending marker. |
| **"The Moon walks the via combusta."** | Moon in via combusta | „Der Mond wandert über die Via Combusta." | « La Lune chemine sur la via combusta. » | "La Luna recorre la vía combusta." | "A Lua percorre a Via Combusta." | Keep the Latin *via combusta*; translate only the "walks/wanders" verb. |
| **"A difficult planet is on the angles."** | Malefic on angle | „Ein schwieriger Planet steht an den Achsen." | « Une planète difficile est sur les angles. » | "Un planeta difícil está sobre los ángulos." | "Um planeta difícil está sobre os ângulos." | Warm form of *malefic on angle*. |
| **"The hour matches the work."** | Planetary hour match | „Die Stunde passt zur Sache." | « L'heure correspond au travail. » | "La hora coincide con la tarea." | "A hora combina com o trabalho." | Warm form of *planetary hour match*. |

**German embedding note (for D-factors / D-headlines):** several of these phrasings are `phrase_short` leads
that embed mid-sentence in a headline stem ("A tender day — {lead}."). The German lead must read correctly
**both** standalone (capitalized) **and** embedded — German nouns stay capitalized and the runtime preserves
German lead casing (no auto-lowercase). Author the German phrase so the noun (Merkur/Venus/Mond/Jupiter…)
keeps its capital in both positions.

**Why the technical rows are flagged (O3 / domain caveat):** PT *Lua Fora de Curso*, *Combustão*, *Via
Combusta*, *Parte da Fortuna* and the per-planet *retrógrado/retrógrada* agreements are the conventional
traditional-astrology forms; the analogous established renderings exist in DE/FR/ES too (dignity, angles,
applying/separating, waxing/waning, reception, planetary hour, fixed star). A generalist machine translation
produces literal but wrong-register forms. The `// REVIEW` rows must be **confirmed by a locale-literate
astrology reader**; the `// best-effort` rows have no fixed traditional form and want a natural-language
confirm in community review. This termbase is the bridge that keeps the VOICE dictionaries consistent with
shipped chrome.

---

## Launch checklist

These items are **blocking for launch** (not for the chrome build). Each is a launch-readiness gate, not a
code dependency — the infrastructure ships now; the human review resolves these before release.

- [ ] **L38 `onboarding:subhead` non-en translation pending 4.3-framing lock.** The onboarding subhead
      ("Inceptio reads the sky the way astrologers have for centuries — …") is brand-positioning hero **and**
      App-Store-4.3-sensitive (the "reads the sky … for centuries" claim is what 4.3 scrutinizes for
      fortune-telling). It is translated **last** in the chrome pass. Until the positioning/4.3 framing
      locks, the de/fr/es-419/pt-BR `onboarding:subhead` values **temporarily hold the English string** (the
      coverage guard exempts exactly this one key). **This dev-time English-in-non-en state MUST resolve
      before launch.**
- [ ] **French register confirmed by a French native** (O1). `fr` is *provisional `tu`*; `vous` is the
      safer-but-cooler alternative. fr translation must not start — and fr is not launch-eligible — until a
      French native confirms the register.
- [ ] **Native AND astrology-literate review per locale completed** (O3). Per locale, pre-launch review must
      be **both** native **and** astrology-literate — the chrome-pass analog of the mandatory astrologer
      gate for VOICE. CHROME draft translations (AI/MT, glossary-guided) ship only after this review.
- [ ] **Termbase traditional terms confirmed by a locale-literate astrology reader.** Every `// REVIEW` row
      above — the CHROME core set (void of course / retrograde / combust / angle / sign / dignified, incl.
      PT *Lua Fora de Curso* and *Combustão*) **and** the VOICE-pass enrichment (per-planet retrograde
      agreements, angular, benefic/malefic, applying/separating, waxing/waning, reception, aspect, planetary
      hour, fixed star, via combusta, Lot of Fortune, house ruler) — must be confirmed by a locale-literate
      astrology reader, replacing the draft renderings with the established traditional forms. The
      `// best-effort, confirm in community review` rows (well-placed, separating, eclipse, station) have no
      fixed traditional form and want a natural-language confirm.
- [ ] **Ruling-pending warm phrasings re-confirmed if the English ruling changes** (VOICE). The personified
      forms tied to upstream-added or pending entries — "Mars is hesitating", "Jupiter is turning inward",
      "Venus is resting", "Mercury is hidden by the Sun's light" — were rendered provisionally to match the
      current English. If the astrologer ruling changes the English, re-translate these rows independently.

---

*Sources: spec `docs/superpowers/specs/2026-06-08-i18n-chrome-design.md` §7 (termbase), O1 (register),
O3 (review resourcing); domain audit `docs/superpowers/expert/2026-06-08-i18n-chrome-domain.md`. This doc
gates the CHROME translations in A5–A7 and Batch B; values are placeholders until the locale-literate
review (O3) confirms them.*
