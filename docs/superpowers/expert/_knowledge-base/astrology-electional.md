# Electional Astrology Knowledge Base

Maintained by Compound V Phase 1B advisor. Append at the bottom on each pass.

---

## Updated 2026-06-02 — D3 "activity-agnostic sky-state voice" audit (Inceptio Today screen daily-note)

### Tradition-grounded asymmetry matrix (the load-bearing finding)

The interpretation of a sky condition is **NOT** uniformly severe across all elections. Tradition (Lilly, Bonatti, Dorotheus, Frawley) consistently treats the **natural significator of the matter** as the lens that determines how severely a given sky condition matters. Same condition + different election = different severity.

| Sky condition | Wedding (Venus, 7H, Moon) | Contracts (Mercury, 7H) | Business launch (10H, Sun, Jupiter) | Travel (9H/3H, Moon, Asc-ruler) |
|---|---|---|---|---|
| Moon void of course | Catastrophic (Lilly: "nothing shall come of the matter") | Catastrophic (Bonatti 19th Consideration) | Severe | **Mitigated** — Lilly explicitly allows VOC for travel in Cancer/Taurus/Sag/Pisces; "travel is usually fine, just don't book during VOC" |
| Mercury retrograde | Moderate (wedding-as-contract layer) | **Catastrophic** (Mercury IS the significator) | Moderate-severe | **Severe** (Mercury rules travel/shipping/mail) |
| Venus retrograde | **Catastrophic** (Venus IS the significator; Susan Miller "hard no") | Mild | Severe (Venus rules valuation/money 2H) | **Mild** — Susan Miller: "you can go on vacation when Venus is retrograde" |
| Mars retrograde | Severe (malefic afflicting Venus/Moon) | Moderate | **Severe** (Mars = initiative, drive for launch) | Moderate (Mars rules conflict on roads) |
| Saturn retrograde | Moderate | Moderate | **Severe** (10H founding work) | Mild |
| Jupiter retrograde | Mild | Moderate | **Severe** (Jupiter = growth/benefic for launches) | Moderate (9H = Jupiter's house) |
| Venus dignified well-aspected | **Excellent** (Venus IS the significator) | Modest benefit | Good (Venus rules 2H money) | Modest benefit |
| Mercury dignified | Modest | **Excellent** | Good | **Excellent** (Mercury rules journey) |

**Source citations** (verbatim where possible):

- Lilly, *Christian Astrology* (1647): "A Planet is void of course, when he is separated from a Planet, nor doth forthwith, during his being in that Sign, apply to any other ... you shall seldom see a businesse goe handsomely forward when she is so." Lilly's VOC exceptions: Moon in Cancer (domicile), Taurus (exaltation), Sagittarius, Pisces "may still produce results" — these signs are disproportionately likely to be the only safe VOC windows for travel elections. ([Anthony Louis on Lilly VOC](https://tonylouis.wordpress.com/2021/02/27/lillys-definition-of-the-void-of-course-moon/), [Lee Lehman VOC essay](https://leelehman.com/wp/index.php/2003/10/21/the-void-of-course-moon-from-linear-time-to-lunar-time/))

- Bonatti, *Liber Astronomiae*, 19th Consideration: "To behold the Moon if she be 'void of course' for then it signifies an impediment to the thing in question: it will not come to a good end, nor be accomplished." ([Renaissance Astrology on Bonatti/VOC](http://renaissance-astrology.blogspot.com/2015/05/void-of-course-moon.html))

- Frawley, *The Real Astrology*: "strengthen the planets naturally associated with the task at hand: Venus for a wedding, for example, Saturn for founding a city. Proposing marriage in a Venus hour is likely to be more successful than in a Saturn hour; for founding a city, just the opposite." For a business: strengthen rulers of 10H and 2H. ([Frawley Electional on Skyscript](https://www.skyscript.co.uk/electional.html))

- Dorotheus, *Carmen Astrologicum* Book V: each election (marriage, journey, contracts, partnership) has its OWN chapter with distinct rules. The triplicity-ruler method is applied to **the house signifying the matter** — i.e. election rules are house-specific and significator-specific, not uniform. ([Seven Stars review of Dykes' Dorotheus](https://sevenstarsastrology.com/review-carmen-astrologicum-of-dorotheus-ben-dykes-translation/), [Seven Stars Dorothean Foundations](https://sevenstarsastrology.com/elections-art-choosing-times-1-dorothean-foundations/))

- Modern consensus (Susan Miller via Glam, CHANI 2026 dates-to-avoid post, multiple practitioner blogs): Venus retrograde is "hard no" for weddings/business but acceptable for travel/vacation. Mercury retrograde is hard-no for contracts but mitigated for already-planned weddings (sign legal docs at courthouse outside Rx window). ([Glam: Susan Miller Venus retrograde hack](https://www.glam.com/1268856/astrologer-susan-miller-wedding-date-hack-venus-retrograde/), [CHANI 2026 dates to avoid](https://www.chani.com/blogs/2026-dates-to-avoid-if-youre-getting-married-opening-a-business-or-launching-anything-important))

### Implication for any "daily sky-state" UX

A purely activity-agnostic voice is **internally inconsistent** with traditional electional. A traditionally-trained astrologer reviewer (per Inceptio Step 13 of build order) will flag a sentence like "Venus is resting" shown identically to a wedding-defaulted user and a travel-defaulted user as **method-incorrect** — for the wedding user, Venus retrograde is the single most relevant sky fact in their decision space; for the travel user, it is barely relevant.

### Recommended pattern: "activity-agnostic base + 1-line severity hint"

The base sentence describing the sky (the WHAT) is uniform. A second optional sentence calibrates severity to the user's default activity (the SO WHAT). Tradition supports this — the WHAT (Venus is retrograde) is observably the same sky for everyone; the SO WHAT (this matters for your election) is what changes by activity.

Example:
- Base (uniform): "Venus is resting — turning inward through Leo this week."
- Wedding hint: "For matters of love and union, this is the strongest reason traditional astrology gives for waiting."
- Travel hint: "For journeys, this matters less — Venus rests do not bind the road."

This adds ~12 short copy strings (4 activities × 3 high-asymmetry conditions: Venus Rx, Mercury Rx, Moon VOC) rather than fully forking 4 daily-note voices. Avoids the 4× scope explosion while staying tradition-honest.

### Activity distinctness for EC-3 invariant

All 4 MVP activities are **genuinely distinct elections** in tradition with different house rulers and significators:

- **Wedding** — 7H (partner), 1H (querent), Venus (natural significator), Moon (natural co-significator for women); avoid Mars on 7H, Saturn on Venus, VOC Moon. (Lilly Bk III; Dorotheus Bk V; Frawley.)
- **Contracts** — 7H (other party, same as wedding), 1H, Mercury (natural significator for words/agreements); avoid Mercury retrograde, combust, cazimi (cazimi actually good), Mercury afflicted by Saturn or Mars.
- **Business launch** — 10H (the venture/reputation), 2H (its money), Sun + Jupiter (natural significators of authority and increase); avoid 10H ruler retrograde or cadent, malefic on MC.
- **Travel** — 9H (long journeys/foreign) or 3H (short), Asc-ruler (the traveler), Moon (the journey itself); avoid Mars in 9H, malefic on Asc, applying to malefic.

Note: Wedding and Contracts **share the 7H** but the natural significators are different (Venus vs Mercury). This is the closest pair — and even here, a Venus retrograde / Mercury direct day will produce a wedding-poor / contract-fine result. The 4 are not collapsible.

### Day-to-day divergence expectation (§12.4)

In normal weeks (no major retrogrades, no eclipse), the 4 activities will share the **moon-driven base** (waxing/waning, applying aspect, VOC status — same for all 4) but diverge on **significator state**:

- Wedding watches Venus + 7H ruler
- Contracts watches Mercury + 7H ruler
- Business watches 10H ruler + Sun/Jupiter
- Travel watches 9H/3H ruler + Asc ruler

On a given day, 7 of the API's verified factor IDs are activity-agnostic (moon waxing, fixed star conjunction, planetary hour match, etc.) and ~8 are activity-tilted by `weight_class` (verified in CLAUDE.md: same factor_id, different weight per activity). Expect **meaningful divergence on ~30–40% of days** (significator-specific conditions active) and **moon-dominated convergence on ~60–70% of days**. The §12.4 QA gate should sample BOTH categories — a sanity check on a moon-dominated day (do all 4 look similar but with right CTAs?) and a sanity check on a retrograde day (does the right activity get the strong warning?).

### Recent breaking changes / upstream API drift (last 12 months)

- Mid-2026: astrology-api.io added `mercury_combust`, `mars_retrograde`, `jupiter_retrograde` reason_ids and `good` grade in same week without notice (per Inceptio CLAUDE.md). Combust ≠ retrograde — Mercury combust = within ~8° of Sun, distinct severity. Mars/Jupiter retrograde added without prior schema docs.
- Venus Retrograde 2026 actually falls Oct–Nov 2026 per practitioner calendars — relevant for Inceptio MVP launch QA sample dates.

### Open questions for future passes

1. Does astrology-api.io's `weight_class` per activity actually encode the tradition-honest asymmetry (Venus retrograde weighted critical for wedding, mild for travel)? — needs verification against real Postman responses during Venus Rx period.
2. Does the API return distinct factor sets per activity on the same date, or the same factor set with different weights? — affects how the daily-note synthesizer reasons about "what to highlight."
3. App Store medical-content risk for surgery (deferred to v1.4) — does it extend to legal/financial language for contracts and business_launch? Need to check App Store Review Guidelines §1.4.1 and §5.2.1.

---
