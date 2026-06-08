# Inceptio i18n Termbase + Register Ruling

> **Status: DRAFT — gates translation.** This document is the single source of truth for (a) the
> per-locale **register ruling** (O1) and (b) the shared **astrology-term renderings** (§7 of the spec)
> that astrology-flavored CHROME (loading copy, onboarding positioning, calendar legend) and the later
> VOICE pass both draw on. Astrology-flavored chrome is a **translator/register** concern, not an
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

**Why these are flagged (O3 / domain caveat):** PT *Lua Fora de Curso* and *Combustão* are the conventional
traditional-astrology forms; the analogous established renderings exist in DE/FR/ES too (e.g. dignity,
angles, void-of-course phrasing). A generalist machine translation will produce literal but wrong-register
forms. The termbase entries for the flagged rows must be **set by a locale-literate astrology reader**, not
improvised — this is the bridge that keeps the later VOICE pass consistent with shipped chrome.

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
      above (void of course / retrograde / combust / angle / sign / dignified, incl. PT *Lua Fora de Curso*
      and *Combustão*) must be confirmed by a locale-literate astrology reader, replacing the draft
      renderings with the established traditional forms.

---

*Sources: spec `docs/superpowers/specs/2026-06-08-i18n-chrome-design.md` §7 (termbase), O1 (register),
O3 (review resourcing); domain audit `docs/superpowers/expert/2026-06-08-i18n-chrome-domain.md`. This doc
gates the CHROME translations in A5–A7 and Batch B; values are placeholders until the locale-literate
review (O3) confirms them.*
