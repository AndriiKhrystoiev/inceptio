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

## Updated 2026-06-03 — Timezone is load-bearing election input, not a presentation hint (EC-19 audit)

### The doctrinal claim

In traditional Western electional astrology (Lilly, Bonatti, Dorotheus, Frawley), the chart is cast for **the moment and place where the matter unfolds**. Pre-modern astrologers used local apparent time (sundial noon at the meridian of the place). The modern IANA `timezone` is the 20th-century civil-time analogue of that — the canonical input that resolves wall-clock-at-place to a UTC Julian Day for ephemeris lookup. Three election-critical calculations bind directly to the place's local time:

| Calculation | Binding | Effect of wrong tz |
|---|---|---|
| **House cusps + Ascendant** | Local Sidereal Time = GMST + longitude; reference wall-clock must be in the place's tz | Cross-continental tz error (8–12h) shifts Ascendant 4–6 signs |
| **Planetary hours** | Segments between local sunrise/sunset at place lat/lng | Wrong-tz reference time picks wrong ruler entirely |
| **Moon VoC overlap on chart ref time** | VoC instants are UTC-fixed, but "is Moon VoC when I sign at 3pm local" needs local→UTC mapping | Can flip viable ↔ blocked |

Sources: Lilly *Christian Astrology* (1647); Bonatti 19th Consideration; Dorotheus *Carmen* Bk V (Dykes trans.); Frawley *Real Astrology*. ([Cafe Astrology Moon timing](https://cafeastrology.com/timingwiththemoon.html), [Tony Louis planetary hours](https://tonylouis.wordpress.com/2017/10/22/a-note-on-planetary-hours-in-horary-and-electional-astrology/)).

### Swiss Ephemeris dependency chain (why this matters technically)

astrology-api.io v3 is built on Swiss Ephemeris (DE431) backed by NASA JPL ([astrology-api.io product page](https://astrology-api.io/product), [RoxyAPI Swiss Ephemeris explainer](https://roxyapi.com/blogs/swiss-ephemeris-astrology-api-explained)). The dependency chain is:

```
(civil time + IANA tz) → swe_date_conversion → Julian Day in UT
Julian Day + longitude → swe_sidtime → Local Sidereal Time
LST + latitude → swe_houses → house cusps + Ascendant + MC
Julian Day → JPL ephemeris lookup → planetary positions
```

Per [Swiss Ephemeris programmer doc §7](https://rdrr.io/cran/swephR/man/Section7.html) and [§13](https://rdrr.io/cran/swephR/man/Section13.html). A wrong tz → wrong JD → every downstream calculation is wrong. **There is no path through Swiss Ephemeris where tz feeds only date determination.**

### astrology-api.io v3 upstream contract (verified from in-repo evidence)

The upstream `/electional/search` request body includes (from `workers/api-proxy/src/upstream.ts:39-50`):

```js
location: {
  year, month, day, hour: 12, minute: 0,   // ← chart reference time
  latitude, longitude, timezone, city
}
```

The combination `hour: 12 + timezone` is interpreted by the engine as "noon in `timezone` at `latitude/longitude`" — the chart reference moment for the election day. Sending `Europe/Berlin` with Tokyo's lat/lng tells the engine "12:00 Berlin time at Tokyo coordinates" = 20:00 Tokyo local. Different sky overhead, different planetary hour, different houses, different VoC overlap.

Public docs ([astrology-api.io use-cases](https://api.astrology-api.io/docs/use-cases), [VoC guide](https://astrology-api.io/blog/void-of-course-moon-complete-guide)) confirm timezone is passed for tz-sensitive endpoints (VoC, electional). The engine does not cross-validate tz against lat/lng — any valid IANA string is accepted.

### Two distinct failure modes when tz ≠ tzLookup(lat, lng)

**Case A — tz feeds ONLY date determination (REJECTED for this stack)**
Hypothetical world where tz only decides which calendar date "today" is. Would produce off-by-one date errors at midnight boundaries; self-corrects next day. *Does not apply to astrology-api.io v3 — upstream uses tz for chart math, not just date selection.*

**Case B — tz feeds the SKY CALCULATION (CONFIRMED for this stack)**
Persistent astronomical wrongness for cross-tz default users. Not bounded, not self-correcting, not "a day late" — the entire response is for a sky that doesn't correspond to either the device's location or the picked location.

### Risk envelope for product surfaces using device-tz defaults

Failure modes per request when default_location is cross-tz from device:
- Ascendant shifts ~15°/hour of tz error
- All 12 house cusps shift in lockstep — significator-house placement (the point of an election) becomes wrong
- Planetary hour ruler: completely wrong
- VoC overlap on local-noon ref: can flip viable ↔ blocked
- Score / grade / top_windows / excluded_ranges: all derived from above → entire response is garbage

Highest-risk user populations:
1. **Destination wedding planners** — exactly the persona the product courts. Plan from NYC for Bali wedding → every daily-note is for "12:00 NY-time at Bali's lat/lng" = 1am Bali, inverted house cusps.
2. **Digital nomads / remote workers** — set "home" as default, travel constantly.
3. **Diaspora / expats** — set ancestral home as default, live elsewhere. Permanent miscalculation across all sessions.
4. **Travel-activity users** — definitionally cross-tz, and the activity with highest practitioner sensitivity to Mercury timing (per the asymmetry matrix above).

### Detection invariant for any Inceptio location-storage surface

```
∀ stored SavedLocation: SavedLocation.timezone === tzLookup(SavedLocation.lat, SavedLocation.lng)
```

This invariant is testable client-side in `location-storage.ts` and assertable Worker-side in `/electional/search` and `/daily-note` route handlers. A violating tuple should be treated as a defect — either auto-correct (re-resolve tz from lat/lng) or reject with `400 tz_lat_lng_mismatch`, never silently pass through to the upstream.

### Cross-tz QA test pack (recommended for any tz-related change going forward)

5 cross-tz pairs covering the failure space: NYC↔Tokyo, Berlin↔Sydney, LA↔Dubai, London↔Buenos Aires, Mumbai↔SF. For each pair, generate daily-notes with `tz = device_tz` (defect) vs `tz = tzLookup(lat, lng)` (correct). Astrologer review confirms (a) the correct-tz reading is internally coherent and (b) the device-tz reading is detectably wrong. This is the empirical proof Case B holds on this specific upstream, closing residual "maybe the API normalizes internally" ambiguity.

### Sources

- [Swiss Ephemeris programmer doc §7 (time conversion)](https://rdrr.io/cran/swephR/man/Section7.html)
- [Swiss Ephemeris programmer doc §13 (house cusps)](https://rdrr.io/cran/swephR/man/Section13.html)
- [RoxyAPI Swiss Ephemeris explainer](https://roxyapi.com/blogs/swiss-ephemeris-astrology-api-explained)
- [astrology-api.io product page](https://astrology-api.io/product)
- [astrology-api.io v3 use-cases](https://api.astrology-api.io/docs/use-cases)
- [astrology-api.io VoC guide](https://astrology-api.io/blog/void-of-course-moon-complete-guide)
- [Cafe Astrology — Timing with the Moon](https://cafeastrology.com/timingwiththemoon.html) — VoC tz-stamping convention
- [Anthony Louis — planetary hours in electional](https://tonylouis.wordpress.com/2017/10/22/a-note-on-planetary-hours-in-horary-and-electional-astrology/) — local-sunrise anchoring
- In-repo: `workers/api-proxy/src/upstream.ts:39-50` (upstream contract); `apps/mobile/src/lib/location-storage.ts:10` (pre-existing TODO); `apps/mobile/src/hooks/useDailyNote.ts:23-30` (current local-date-in-tz pattern)

---

## Updated 2026-06-05 — Computed-moment as a PUBLIC keepsake artifact (Moment Card share audit)

This pass generalizes findings from the shareable "Moment Card" feature. The reusable principle: there are two distinct classes of Inceptio surface, and they have **opposite** correctness regimes.

### Surface-class distinction (reusable for any future feature)

| Surface class | Examples | Correctness regime | Key constraint |
|---|---|---|---|
| **Election-computing surface** | search request, daily-note, Moment Detail (the action surface) | tz is a **load-bearing input** (see 2026-06-03 EC-19 pass) | tz MUST equal `tzLookup(lat,lng)`; wrong tz = garbage chart |
| **Election-displaying artifact** | share card, exported keepsake, future "moment received" badge | chart already computed; tz is a **presentation choice** | tz may be omitted IF the artifact never positions itself as the action surface |

The danger when these blur: an artifact that shows an **exact-to-the-minute** electional time **without a zone** invites the viewer (or the user weeks later, or a friend in another tz) to act on a time that is only correct in one timezone. Electional precision (planetary hours, Ascendant ~15°/hr, VoC flip) makes "precise-minute-without-zone" the worst display choice — precise enough to act on, ambiguous enough to act wrong. **Rule for displaying artifacts: either show time + zone, or soften to time-of-day ("Saturday afternoon," "at dusk"). Never precise-minute-without-zone.**

### Public-artifact tone constraints (beyond the in-app voice rules)

In-app, warm copy is disambiguated by surrounding UI and progressive disclosure. On a **context-free public image** (Stories/WhatsApp), those crutches are gone. Three *additional* leakage classes any public Inceptio artifact must block (golden-test the negative set):

1. **Forbidden words** (CLAUDE.md locked list): magic, destiny, fortune, stars align, manifest, energy(noun), vibes, alignment(new-age), blessed. On a public card this also protects the App Store 4.3-spam appeal (the "not fortune-telling" positioning).
2. **Grade words**: fair / good / caution / poor / any "score" / any "X/100." A grade word stripped of in-app calibration reads as a mediocre rating to a stranger. The 60–74 win-state framing (CLAUDE.md) collapses if "Good"/"Fair" prints publicly.
3. **Internal token/mood-key names**: `strong`/`good`/`mixed`/`closed` are tokens, never display copy. Easy to leak via a careless `String(moodKey)`.

### Activity sensitivity for PUBLIC broadcast (new matrix — 4 MVP activities)

Distinct from the tradition-asymmetry matrix (2026-06-02). This is about *social* leak when a computed moment is broadcast, not about election method:

| Activity | Safe to name publicly by default? | Leak vector | Recommended public default |
|---|---|---|---|
| **wedding** | Risky | activity + date + coarse city = venue/date triangulation; uninvited-guest control is an active wedding-community concern ([The Knot](https://www.theknot.com/content/wedding-social-media-dos-and-donts), [WeddingWire](https://www.weddingwire.com/wedding-forums/how-to-ask-people-not-to-post-pics-of-our-wedding-on-social-media-the-day-of/78afd3805e5f8cbf.html)) | warn on city opt-in; consider generic-intent default ON |
| **contracts** | No | broadcasting deal *timing* is commercially sensitive | generic-intent default ON (or share-disabled) |
| **business_launch** | No | broadcasting launch *timing* tips competitors | generic-intent default ON (or share-disabled) |
| **travel** | Risky by existence | posting travel timing = "home is empty"; FBI-cited burglary vector ([Moneywise](https://moneywise.com/news/top-stories/burglaries-social-media-travis-kelce-joe-burrow-luka-doncic), [SavingAdvice](https://www.savingadvice.com/articles/2025/06/25/10159104_8-social-media-posts-that-tell-thieves-youre-not-home.html)) | generic-intent default ON; soften near-future date |

**Generalized rule:** the privacy posture of a per-share-toggle feature ≈ its **defaults**, because most users never flip toggles. Activity-show-by-default is wrong for the three commercially/socially sensitive activities.

### Distribution-domain constants (for any future share/export surface)

- IG Stories & WhatsApp Status canvas: **1080×1920 (9:16)**. Safe-zone dead bands (2026): top **250px**; bottom **250px IG / ~400px WhatsApp Status** — design to the union (**400px bottom**); sides ≥60px (≥300px if stickers). ([Outfy](https://www.outfy.com/blog/instagram-safe-zone/), [Chatarmin](https://chatarmin.com/en/blog/whats-app-image-size-guide))
- WhatsApp in-chat (not Status) renders images narrow → 9:16 becomes a thin thumbnail. **1:1 square is effectively required for LatAm/WhatsApp**, not optional.
- WhatsApp recompresses "Photo" sends → subtle violet→gold gradients band; cannot force "send as Document" via OS share sheet. Card must read at moderate JPEG quality.
- Direct IG Stories (branded sticker) requires **Meta App ID + finalized bundle/package ID + device testing** ([Meta docs](https://developers.facebook.com/docs/instagram/sharing-to-stories/)); plain OS share sheet (`expo-sharing`/RN `Share`) requires none — correct deferral.
- App Store **Guideline 4.3 (spam)** rejects astrology apps absent a "unique, high-quality experience" ([iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review)). A share card MUST reinforce the non-fortune-telling positioning, never undermine it.
- `react-native-view-shot` capture gotchas: opaque background required (transparent → text edge-halos); `collapsable={false}` on captured view + decorative sublayers; native shadows may not capture (use gradients); unsupported nested primitive can void the whole snapshot. ([RN view-shot](https://github.com/gre/react-native-view-shot), [Expo captureRef](https://docs.expo.dev/versions/latest/sdk/captureRef/))

### Sources (this pass)

- Wedding privacy: [The Knot](https://www.theknot.com/content/wedding-social-media-dos-and-donts), [WeddingWire](https://www.weddingwire.com/wedding-forums/how-to-ask-people-not-to-post-pics-of-our-wedding-on-social-media-the-day-of/78afd3805e5f8cbf.html), [Wedding Shoppe](https://www.weddingshoppeinc.com/blogs/weddings/wedding-etiquette-social-media-dos-and-donts)
- Travel/burglary: [Moneywise (FBI-cited)](https://moneywise.com/news/top-stories/burglaries-social-media-travis-kelce-joe-burrow-luka-doncic), [SavingAdvice](https://www.savingadvice.com/articles/2025/06/25/10159104_8-social-media-posts-that-tell-thieves-youre-not-home.html)
- Platform specs: [Outfy IG safe zone 2026](https://www.outfy.com/blog/instagram-safe-zone/), [Chatarmin WhatsApp 2026](https://chatarmin.com/en/blog/whats-app-image-size-guide)
- Policy/capture: [Apple 4.3 (iMore)](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io 4.3 guide](https://www.molfar.io/blog/apple-review), [Meta Sharing-to-Stories](https://developers.facebook.com/docs/instagram/sharing-to-stories/), [RN view-shot](https://github.com/gre/react-native-view-shot)
- Co-Star loop (witty screenshot-bait, not watermark): [Newsweek](https://www.newsweek.com/co-star-astrology-app-instagram-1451220)

---

## Updated 2026-06-06 — Cost-shaping usage cap + hidden-paywall copy constraints

Generalized from the per-user daily search-cap feature (spec `docs/superpowers/specs/2026-06-06-usage-cap-design.md`). These are reusable rules for any quota / soft-block / expiry-copy surface in an astrology app running a *hidden* paywall.

### Rule 1 — Soft-block copy under a hidden paywall MUST carry zero monetization signal

When the paywall is wired-but-hidden (RevenueCat in the bundle, `PAYWALL_ENABLED=false`), a usage cap is *cost-shaping/anti-abuse*, NOT a monetization gate, and the copy must read that way. Banned in soft-block copy: "upgrade," "Pro," "premium," "unlock," "subscribe," price strings, and even "free [tier]" / "free searches" (implies a paid tier by inference, re-exposing the hidden paywall). Use "today's searches," never "today's *free* searches." Two reasons this is load-bearing for astrology apps specifically: (a) it's the only posture consistent with a hidden-paywall product decision, and (b) it avoids waving a paywall flag at App Store reviewers who already scrutinize astrology apps under Guideline 4.3 (spam) — a paywall-flavored cap message invites them to hunt the hidden purchase flow, which physically exists in the bundle. ([Apple 4.3 / iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review)). The sanctioned framing is "early access" pacing (per Inceptio CLAUDE.md soft-block precedent: *"Inceptio is in early access — try again in a few days."*).

### Rule 2 — Reset/expiry copy keyed to PICKED-LOCATION tz must not promise a device-relative day

This is the cap-feature corollary of the EC-19 (2026-06-03) + surface-class (2026-06-05) tz findings. If a quota/reset bucket is computed server-side from the **request's** tz (= `tzLookup(picked location)`), then a bare relative word like **"tomorrow"** silently assumes the *device's* wall clock and will be wrong by up to a full calendar day for cross-tz users — which are this product's marquee personas (destination-wedding planners, nomads, expats, travel-activity users; see 2026-06-03 risk-envelope). **Anchor reset copy to "midnight" or omit the time; do not promise a relative day.** Generalizes to any future expiry/countdown copy (saved-moment expiry, trial windows, "fresh tomorrow" daily-note refresh).

### Rule 3 — A single-chokepoint error/status string must survive every render surface's surrounding affordances

"One edit, distinct state everywhere" is true for *plumbing* but NOT automatically for the *sentence*. A string routed through one chokepoint (e.g. `friendlyMessage` in `apps/mobile/src/lib/error-messages.ts`, rendered by LoadingScreen / MomentDetail / NoViable / Calendar / DailyHero) lands in N different contexts. Two concrete traps observed: (a) **NoViable collision** — a "no good windows" *result* surface will blur a quota message into "the sky offered nothing" unless the copy names the mechanism ("searches"); (b) **dead retry** — DailyHero pairs the message with a retry pressable (`DailyHero.js:~97`), and a retry next to a terminal daily cap just re-hits the 429. Rule: a single-chokepoint string must be self-contained, terminal-safe, and must not read as a system *error* nor as a domain-empty *result*; verify it against every surface's adjacent affordances (especially any retry button), not just the chokepoint.

### Rule 4 — "searches/lookups," never "moments/windows" in chrome strings (extends the forbidden-word set)

"Moment" is Inceptio's product noun for an astrological window; "window" likewise. Any chrome string about *running out of search runs* MUST say "searches" or "lookups" — "you've used today's moments" misreads as "the auspicious times have passed." This extends the locked forbidden-word list (magic/destiny/fortune/stars-align/manifest/energy[noun]/vibes/alignment/blessed) with an *ambiguous-noun* class for quota/error copy. Note: the live `RateLimitError` copy as of this pass violated this ("You've explored 10 moments this month" in `error-messages.ts`) — a reminder that the forbidden/ambiguous-noun negative test should cover existing strings, not just new ones.

### Rule 5 — Pre-telemetry quota numbers should ship gentle, not enforcing

A consumer electional search is a *considered* action (exploring a date range across candidate dates/cities), so an engaged first-run user can legitimately burn 4–5 searches in one sitting. A hard low cap with enforcement-flavored copy ("you've used today's 5") risks frustrating the most-engaged users *before* any telemetry exists to justify the number (survival-curve telemetry only accrues post-deploy). Until the number is validated, prefer gentle/early-access copy and consider not displaying the count at all (the count adds enforcement flavor that cuts against the gentle posture and re-leans toward paywall-feel under Rule 1).

### Sources (this pass)

- Inceptio CLAUDE.md (locked): Mystical Premium voice, forbidden-word list, "moments" as product noun, "Paywall hidden but wired" decision + sanctioned soft-block precedent.
- App Store 4.3 (carried from 2026-06-05 pass): [iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review).
- Cross-tz personas + tz-as-load-bearing: this KB's 2026-06-03 (EC-19) and 2026-06-05 (surface-class) passes.
- In-repo verified this pass: `apps/mobile/src/lib/error-messages.ts` (live `RateLimitError` copy violates Rules 1 & 4); five surfaces calling `friendlyMessage` (`LoadingScreen.js:88`, `MomentDetailScreen.js:111`, `NoViableScreen.js:93`, `CalendarScreen.js:379`, `DailyHero.js:104`); DailyHero retry-pressable pairing (`DailyHero.js:~97`).

---

## Updated 2026-06-23 — Moving the tone/synthesis layer off-server (server→bundle migration)

Generalized from the Inceptio spec `docs/superpowers/specs/2026-06-23-remove-cloudflare-direct-api-design.md` (delete Cloudflare Worker; move translation + daily-note synthesis into a bundled monorepo package; call the keyless public upstream directly). Reusable for **any** future change that relocates the astrology content-governance layer from a hot-fixable server to a bundle-only / release-gated location.

### Rule 1 — Moving a content/tone layer server→bundle is a *content-governance* change, not just a refactor. It multiplies the cost of every wrong phrase.

For an astrology app, the translation/tone layer is the App Store 4.3 (fortune-telling spam) defense AND the brand-voice surface AND (per the asymmetry matrix, 2026-06-02) a method-correctness surface. While it lives on a server, a wrong/unreviewed/forbidden-word phrase is hot-fixable without a store release — this was the *explicit* architectural rationale for server-side translation in the first place (Inceptio v1→v2 decision log: "allows non-deploy updates"). The moment it moves into the bundle, **every content fix becomes a fresh App Store / Play review pass** — and under 4.3 each pass re-evaluates the fortune-telling positioning (i18n KB Rule 10). Consequence: the astrologer-review gate stops being a soft "before launch" task and becomes a **release blocker**; any string still tagged `pending astrologer review` / `draft` MUST NOT ship, enforced by a build-time lint. ([Apple 4.3 / iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review))

### Rule 2 — The slower the *fix* path becomes, the more valuable the *detection* signal — the opposite of the usual "drop the log to ship faster" intuition.

astrology-api.io has a documented history of adding enum values unannounced (mid-2026: `good` grade, then `mercury_combust`/`mars_retrograde`/`jupiter_retrograde` "in the same week"; CLAUDE.md). The permissive-enum policy renders a *neutral fallback* on an unknown enum — which is crash-safe but **method-wrong**, because the fallback fires precisely on the most astrologically-salient events (retrograde/combustion), and the asymmetry matrix means understating e.g. Mars-Rx for a business-launch user (`Severe`) or Mercury-combust for a contracts user (≈`Catastrophic`) is visible to exactly the users who notice. When the server log (`console.warn('[translate] unknown …')`) is removed, drift goes **silent on-device**. Minimum acceptable mitigation for an astrology product: a lightweight client telemetry event on the fallback branch carrying the raw enum string, PLUS a CI test asserting every `KNOWN_*` constant value has a dictionary entry (turns *known-but-untranslated* drift from silent-at-runtime into loud-at-CI). Generalizable: **when a refactor slows the remediation path, treat the corresponding monitoring signal as more load-bearing, not droppable.**

### Rule 3 — The forbidden-word + ambiguous-noun negative test must travel WITH the dictionary, and must cover fallback phrases and composed (not just looked-up) output.

"Golden tests move unchanged" guarantees *positive* tone snapshots didn't change; it does NOT guarantee the *negative* set (forbidden words: magic/destiny/fortune/stars-align/manifest/energy[noun]/vibes/alignment/blessed; CLAUDE.md) is tested at the new location. Two highest-risk surfaces when synthesis moves on-device: (a) **fallback phrases** (fire increasingly as upstream drifts, per Rule 2, and are un-hot-fixable per Rule 1) and (b) the **daily-note composer**, whose output is *assembled from parts* — a forbidden word can emerge from individually-clean fragments. Extend the negative set with the ambiguous-noun class (2026-06-06 Rule 4: "searches/lookups" not "moments/windows" in quota/error chrome). Run the negative test over every dictionary string, override, severity-hint, fallback, and a sample of composed daily-note outputs.

### Rule 4 — A relocated election computation is STILL tz-as-load-bearing-input (EC-19 doesn't relax when the caller moves client-side).

When the upstream search call moves from a server route handler into the client (`api.ts`) and the daily-note becomes a fully-local search+synthesis, the EC-19 invariant `request.timezone === tzLookup(lat,lng)` MUST move with it — it does not become a "presentation choice" just because synthesis is now local. Distinguish (per the 2026-06-05 surface-class table): **locally-computed moon phase** (deterministic from an already-fixed timestamp = presentation-OK) vs **the daily-note's wrapped election search** (election-computing surface = tz is load-bearing input). Don't let the "moon phase is just local math" precedent bleed into treating the chart `timezone` as just-local-math. Also: moving synthesis on-device is the natural moment to fix any pre-existing device-tz date-rendering bug (Inceptio BUG-001: `cluster-windows.ts` renders window DATE in device tz → off-by-one across date line) — because the server-side cheap-fix path is being deleted in the same change.

### Rule 5 — Upstream "native multi-language interpretations" are NOT a shortcut to your localized tone layer. The wall is correct; guard it.

When an astrology upstream offers native interpretation languages (here EN/RU/FR/DE/ES) that *happen to overlap* your tone layer's locale set (here our `Locale = en|de|fr|es-419|pt-BR`), the naming collision tempts a future "we already have these languages, just use them" optimization. That shortcut bypasses (a) the astrologer-reviewed tone dictionary, (b) the forbidden-word guardrail, and (c) per i18n KB Rule 10, *increases* 4.3 surface per localized binary — raw upstream text is divinatory/technical register, the exact thing the tone layer exists to replace. They are also not a clean match (upstream generic `ES` vs our `es-419`; upstream `RU` not in our set; traditional-astro lexicon has established per-locale renderings a generic API gets wrong — i18n KB Rule 11). Keeping native interpretations walled off is correct; record it as a standing guardrail so the wall isn't quietly breached later.

### Sources (this pass)

- Inceptio CLAUDE.md (locked): Translation-layer "mandatory infrastructure" + astrologer-review gate + "pending astrologer review" drafts + permissive-enum / `KNOWN_*` policy + calibrated grade buckets (max observed 72; 60–74 = win-state; `good`≈`fair`) + forbidden-word list + v1→v2 decision-log rationale for server-side translation ("allows non-deploy updates").
- In-repo verified this pass: `workers/api-proxy/src/translations/translate.ts:149,187` (`console.warn('[translate] unknown …')` drift signal — real); `translate.ts:15` (generic fallback phrasings); `translations/types.ts:14` (`Locale = en|de|fr|es-419|pt-BR`); `workers/api-proxy/src/upstream.ts` (no `lang`/`locale` request param today); `packages/shared-types/src/api/{factor,response,excluded-range}.ts` (`KNOWN_*` source of truth); `apps/mobile/src/lib/grade.ts` (client already consumes `KNOWN_GRADES`).
- Carried: EC-19 tz-as-load-bearing (2026-06-03), surface-class table (2026-06-05), asymmetry matrix + upstream enum-drift history (2026-06-02), ambiguous-noun / hidden-paywall copy rules (2026-06-06).
- App Store 4.3: [iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review).
- MEMORY: BUG-001 (`cluster-windows.ts` device-tz date off-by-one); CLAUDE.md-stack-stale note (date-fns NOT installed, AsyncStorage wrapper not MMKV — relevant to the on-device cache/tz-math implementation in api.ts).

---
