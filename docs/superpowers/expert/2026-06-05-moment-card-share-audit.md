# Domain Audit — Shareable "Moment Card" + Native Share (Virality v1)

**Date:** 2026-06-05
**Advisor:** Compound V Phase 1B (Domain-Expert Advisor)
**Spec audited:** `/Users/user/Projects/inceptio/docs/superpowers/specs/2026-06-05-moment-card-share-design.md`
**Scope:** domain/regulatory reality the brainstorm took for granted. NOT code review (Phase 1A) or library currency (Phase 1C).

---

## 1. Domain(s) Identified

1. **tone-of-voice-public-artifact** — Inceptio's locked warm voice, now printed onto a context-free PUBLIC image seen by non-users. Different constraints than in-app copy (no surrounding UI to disambiguate, no progressive disclosure).
2. **social-share-distribution** — Instagram Stories/feed + WhatsApp image specs, safe zones, compression, Meta/Apple policy for an astrology share artifact.
3. **privacy-of-broadcast-intent** — what a public card leaks about a wedding date/place, a business plan, or that the user is traveling (away from home).
4. **electional-timezone-semantics** (cross-reference) — covered authoritatively in the existing KB `astrology-electional.md` (2026-06-03 EC-19 pass). Reused below, not re-derived.

---

## 2. Sources Consulted

**KB files reused (authoritative, <6 months old, primary-sourced):**
- `_knowledge-base/astrology-electional.md` — 2026-06-02 asymmetry matrix + 2026-06-03 tz-is-load-bearing pass. Used for §3 tone (forbidden words context) and §6 tz-on-card semantics.

**Web search queries (parallel batch):**
- IG Stories 2026 safe-zone pixel specs; WhatsApp aspect/compression; Co-Star virality/watermark loop; react-native-view-shot gradient/shadow capture gotchas; Apple App Store astrology guideline 4.3/5.2; wedding social-media oversharing; travel-posting burglary risk; Meta direct-stories share-intent App-ID requirement; astrology 4.3-spam pass strategy.

**Primary / authoritative links fetched:**
- [Instagram Safe Zone Guide 2026 (Outfy)](https://www.outfy.com/blog/instagram-safe-zone/) — canvas 1080×1920; safe 1080×1620; top/bottom 250px dead zones; ~300px side near edges.
- [WhatsApp Image Size Guide 2026 (Chatarmin)](https://chatarmin.com/en/blog/whats-app-image-size-guide) and [Zoko aspect-ratio lesson](https://www.zoko.io/learning-micro-lessons/aspect-ratio-for-images) — status = 9:16 1080×1920 with ~250px top / ~400px bottom UI; in-chat images render at moderate width, 1:1 vs 1.91:1 crop behavior; default compression.
- [Meta — Sharing to Stories (Instagram Platform)](https://developers.facebook.com/docs/instagram/sharing-to-stories/) and [iOS stories share gist](https://gist.github.com/michaeltys/a8613e5aea9db8e4684bf85568e40160) — direct Stories needs Meta App ID + `instagram-stories://` scheme / FB App ID; plain `ACTION_SEND`/share-sheet does not.
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); [iMore — Apple rejects horoscope app](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough); [molfar.io — solving 4.3(b) spam](https://www.molfar.io/blog/apple-review); [Struck rejection saga (TechCrunch)](https://techcrunch.com/2020/07/20/after-numerous-rejections-strucks-dating-app-for-the-co-star-crowd-hits-the-app-store/).
- [react-native-view-shot (GitHub)](https://github.com/gre/react-native-view-shot); [Expo captureRef docs](https://docs.expo.dev/versions/latest/sdk/captureRef/) — `collapsable={false}` requirement, transparent-bg artifacts, unsupported-component caveats.
- Wedding-privacy corpus: [The Knot — announce your wedding](https://www.theknot.com/content/wedding-social-media-dos-and-donts), [WeddingWire forum: ask guests not to post](https://www.weddingwire.com/wedding-forums/how-to-ask-people-not-to-post-pics-of-our-wedding-on-social-media-the-day-of/78afd3805e5f8cbf.html), [Wedding Shoppe etiquette](https://www.weddingshoppeinc.com/blogs/weddings/wedding-etiquette-social-media-dos-and-donts), [Roberts Centre etiquette](https://www.robertscentre.com/wedding-social-media-etiquette-need-know/).
- Travel-burglary corpus: [Moneywise — burglars track via social posts](https://moneywise.com/news/top-stories/burglaries-social-media-travis-kelce-joe-burrow-luka-doncic) (cites FBI), [SavingAdvice — 8 posts that tell thieves you're not home](https://www.savingadvice.com/articles/2025/06/25/10159104_8-social-media-posts-that-tell-thieves-youre-not-home.html).

**Citation honesty:** I could not find a Reddit-thread corpus specifically about *astrology-app share cards* leaking intent — that exact discussion does not appear to exist publicly yet. The privacy findings below are derived from the adjacent, well-corroborated wedding-oversharing and travel-burglary literature, and I label them as such rather than as direct evidence about this product.

---

## 3. Domain Constraints the Brainstorm Probably Missed

### 3A. Tone of voice on a context-free public card (the spec's biggest blind spot)

The spec correctly says "Never emits Fair" and routes through `MOOD_TOKENS` keys `strong`/`good`/`mixed`/`closed`. But it does **not specify the actual wordings**, and the in-app voice rules don't fully transfer to a public artifact:

- **MUST NOT** use any forbidden word (CLAUDE.md locked list): *magic, destiny, fortune, stars align, manifest, energy (noun), vibes, alignment (new-age), blessed*. This is non-negotiable and applies doubly on a public card where the brand is on display.
- **MUST NOT** print any word that reads as a rating/grade on a public card — "Fair," "Good," "Caution," "Poor," "Score," any "X/100." A grade word stripped of its in-app calibration context reads as a mediocre Yelp rating to a stranger. (The spec bans "Fair" but the risk is the whole grade-word *category*, including the literal mood key `good`.)
- **MUST NOT** let the `good` mood key surface its own name. `good` is a token, not display copy. A card that literally says "Good" undercuts the win-state framing the whole product recalibrated around (CLAUDE.md: 60–74 is the win-state; "A tender day for beginnings" fires at 65).
- **SHOULD** read as a *statement about the sky/the moment*, not a *verdict about the user*. "Venus brings warmth to this window" (approved pattern) works publicly; "Your moment scores well" does not.
- **SHOULD** survive the missing-context test: a stranger scrolling Stories sees ONLY this image. The tier phrase must make sense with no app, no score legend, no progressive disclosure.

**Candidate tier→phrase wordings** (forbidden-word-clean, grade-word-clean, warm-voice, public-safe). These are drafts for the **mandatory astrologer review** (CLAUDE.md build-order step 13) — do not ship unreviewed:

| Mood key | Tier band | Candidate card phrase | Rationale / risk flag |
|---|---|---|---|
| `strong` | 75–100 (Strong/Exceptional, rare) | **"A rare and favored window."** | "Favored" is warm, not a grade. Avoid "perfect"/"ideal" (overpromise). |
| `good` | 60–74 (the win-state) | **"A tender window for beginning."** | Mirrors the approved hero pattern; never says "Good." Primary win-state copy. |
| `mixed` | 40–59 (caution) | **"A workable window, with care."** | "With care" carries the caveat without doom. Avoid "caution"/"mixed" (grade-like). |
| `closed` | 0–39 / blocked | **"A quiet sky — better to wait."** | "Quiet sky" + "better to wait" is the established soft-block voice (cf. excluded-range copy). Avoid "poor"/"bad"/"blocked." |

Risk flags on the candidates:
- "A rare and favored window" — verify with astrologer that "favored" doesn't read as fortune-telling/determinism. If it does, fall back to **"A rare and gentle window."**
- Every candidate uses the word **"window."** On a public card with no app context, "window" may read oddly (a stranger doesn't know Inceptio's domain vocabulary). Consider **"moment"** as the public-facing noun (matches the product's own user-facing term per CLAUDE.md: "Moment — the user-facing word"). Recommend: use **"moment"** on the card, reserve "window" for in-app. e.g. `good` → **"A tender moment for beginning."**
- **`closed` tier on a SHARE card is a product question, not just a copy question** (see Open Questions). Why would a user share a "better to wait" card? If `closed` moments are shareable at all, the phrase must not read as the product calling the user's plan bad.

### 3B. Privacy of broadcast intent (the spec is mostly right, two gaps)

The spec's model — location off by default + coarse-city opt-in, activity shown by default + generic-intent toggle — is directionally correct. Two corrections:

- **Travel is a leak-by-existence activity, and the spec's defaults under-protect it.** Posting *while away* signals an empty home; this is a documented, FBI-cited burglary vector ([Moneywise](https://moneywise.com/news/top-stories/burglaries-social-media-travis-kelce-joe-burrow-luka-doncic), [SavingAdvice](https://www.savingadvice.com/articles/2025/06/25/10159104_8-social-media-posts-that-tell-thieves-youre-not-home.html)). A "Travel — a fine moment to depart, June 14" card with a near-future date broadcasts "this house is about to be empty." Activity label OFF (generic intent) does NOT fully fix this if the date is shown and the user's followers know they're a traveler. **SHOULD: for the `travel` activity specifically, the generic-intent toggle should default ON, or the date granularity should soften** (see next bullet).
- **A wedding card with activity + date + coarse city is a venue/date triangulation vector.** Wedding communities actively coach couples to *withhold* date+venue from broad social audiences to control uninvited attendance and gatecrashing ([The Knot](https://www.theknot.com/content/wedding-social-media-dos-and-donts), [WeddingWire](https://www.weddingwire.com/wedding-forums/how-to-ask-people-not-to-post-pics-of-our-wedding-on-social-media-the-day-of/78afd3805e5f8cbf.html), [Wedding Shoppe](https://www.weddingshoppeinc.com/blogs/weddings/wedding-etiquette-social-media-dos-and-donts)). The spec protects *coordinates* but a card reading "Wedding · Kraków · Saturday, 14 June 3:24 PM" hands strangers date + city + time — enough to triangulate a small-city venue. **SHOULD: when both activity=`wedding` AND city opt-in are on, warn**, and consider defaulting the time-of-day OFF for wedding cards (the exact minute is electional precision the public doesn't need — see §3C).
- **The toggles are per-share, which is right — but the DEFAULT each toggle lands in is the actual privacy posture.** Most users never flip defaults. So the privacy of this feature ≈ the defaults, not the toggles. Spec's defaults (no location, activity shown) are safe for location but **activity-shown-by-default is the wrong default for the two sensitive activities** (wedding, contracts — and travel per above). **Recommend activity-specific defaults**: `business_launch`/`contracts`/`travel`/`wedding` → generic-intent default ON; only neutral cases default to showing the activity. At minimum, contracts and business_launch (commercially sensitive — broadcasting a deal/launch timing) should not default to naming themselves.

Warning copy candidates (warm voice, in the Share Preview sheet):
- City opt-in for wedding: *"Showing your city means anyone who sees this can guess where and when. Share the place only with people you'd invite."*
- Travel generic default: *"We've kept your plan private — posting travel times can tell people your home is empty."*

### 3C. Time-zone semantics on the card (the spec's "tz-less is fine" claim is mostly defensible)

The KB establishes tz is a **load-bearing election input**, not a presentation hint (`astrology-electional.md`, 2026-06-03). But that doctrine is about *computing the chart correctly*, not about *displaying the result on a keepsake*. The card is a downstream artifact; the chart is already computed correctly server-side. So:

- **A tz-less bare time on the card is acceptable as an artifact**, PROVIDED the card never positions itself as the actionable scheduling surface. The spec already says this ("Moment Detail remains the tz-authoritative surface"). Hold that line.
- **But electional timing is exact-to-the-minute** (KB: planetary hours, Ascendant shift ~15°/hr, VoC overlap can flip viable↔blocked). The domain nuance the spec missed: **a bare "3:24 PM" with no zone invites a stranger — or the user themselves weeks later — to act on a time that's only correct in one timezone.** A friend in another tz who screenshots "act at 3:24 PM" and applies it locally is acting on the *wrong sky*. This is low-harm (the card isn't the action surface) but real.
- **SHOULD:** on tz-less cards, render the time in a way that reads as *commemorative, not instructional*. Prefer **a date + soft time-of-day** ("Saturday afternoon," "at dusk") over a precise "3:24 PM" when tz is absent. Precise-minute-without-zone is the worst of both: precise enough to act on, ambiguous enough to act wrong. When location IS opted in, the precise time + tz-abbrev is fine (and matches the electional precision).
- This also reduces the wedding-triangulation surface in §3B (soft time-of-day leaks less than exact minute).

---

## 4. Common Traps in This Domain

1. **Grade-word leakage onto a public surface.** The single most likely tone failure: a mood key (`good`) or a debug grade ("fair") reaching the rendered PNG. The spec's golden test asserts "Fair never appears" — **extend it to assert NONE of the forbidden words AND none of the literal mood-key strings (`strong`/`good`/`mixed`/`closed`) appear in rendered text.**
2. **`react-native-view-shot` dropping the gradient/halo or producing transparent-edge artifacts.** Spec already caught the native-shadow→gradient swap (good). Additional documented landmines ([RN view-shot GitHub](https://github.com/gre/react-native-view-shot), [Expo captureRef](https://docs.expo.dev/versions/latest/sdk/captureRef/)): the captured view (and nested decorative layers) may need `collapsable={false}`; transparent backgrounds cause edge halos around text — **the card MUST render on an opaque `bg-deep` base, never transparent**; any unsupported nested primitive can compromise the *whole* snapshot. The spec's "survives capture before bright enough" ordering is exactly right — keep it.
3. **Designing for 9:16 then letterboxing in WhatsApp.** WhatsApp in-chat (not Status) renders images at a constrained width; a 9:16 card becomes a tall narrow thumbnail with a tap-to-expand. The spec already names this and defers square — but the trap is treating square as "someday." For the LatAm/WhatsApp priority it's effectively required, not optional. Center-safe in v1 is the correct hedge; verify the center-safe region also reads when cropped to 1:1, not just when cropped by IG UI.
4. **Safe-zone math drift between IG and WhatsApp Status.** They differ: IG ~250px top / ~250px bottom; WhatsApp Status ~250px top / **~400px bottom** ([Chatarmin](https://chatarmin.com/en/blog/whats-app-image-size-guide)). Design to the **union** (worst case: 250 top, 400 bottom, ~60px sides minimum, ~300px if stickers expected). Watermark at the very foot is at risk on WhatsApp Status — lift it above the 400px bottom band.
5. **WhatsApp default compression degrading the celestial gradient.** WhatsApp recompresses "Photo" sends; subtle violet→gold gradients band and the halo muddies. Don't rely on fine gradient fidelity surviving; ensure the card reads at moderate JPEG quality. (Can't force "send as Document" through the OS share sheet.)
6. **Watermark that reads as generic/unbranded.** Co-Star's loop is *witty screenshot-bait*, not a clever watermark ([Newsweek](https://www.newsweek.com/co-star-astrology-app-instagram-1451220)). An image-only "Inceptio" wordmark with no handle and no domain is attribution-weak: a stranger can't act on it. See §5.

---

## 5. Regulatory / Compliance Notes

- **App Store Guideline 4.3 (Design — Spam) is the live risk for the whole app, and a share feature is a mitigant, not a trigger.** Apple routinely rejects astrology/horoscope/fortune-telling apps as "saturated/spam" unless they offer a "unique, high-quality experience" ([iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review), [Struck/TechCrunch](https://techcrunch.com/2020/07/20/after-numerous-rejections-strucks-dating-app-for-the-co-star-crowd-hits-the-app-store/)). Inceptio's positioning ("intent-led, electional under the hood, no fortune-telling voice") is the 4.3 defense. **The card MUST stay on-brand with that positioning** — a card that reads fortune-telling ("destiny," "your fate," "manifest") would actively *undermine* the 4.3 appeal narrative. This reinforces §3A's forbidden-word rule with a regulatory stake.
- **Deferring direct IG Stories is correct and required, not just convenient.** Direct Stories needs a Meta/Facebook App ID + a finalized bundle/package ID + real-device testing ([Meta Sharing-to-Stories docs](https://developers.facebook.com/docs/instagram/sharing-to-stories/), [iOS gist](https://gist.github.com/michaeltys/a8613e5aea9db8e4684bf85568e40160)). The plain OS share sheet (`expo-sharing` / RN `Share`) needs none of that. The spec's pluggable-provider gate is the right shape.
- **No medical/legal/financial-advice exposure on the card** as long as it stays in the warm-keepsake register. (Surgery is already deferred to v1.4 for §1.4.1 medical-content risk per CLAUDE.md; contracts/business_launch cards must not drift into "this is a good day to sign / invest" imperative advice — keep them descriptive of the sky, not prescriptive of the user's deal.)
- **No GDPR/PII surface created by the feature itself** (no new data leaves the device beyond what the user explicitly opts to render and then chooses to post). The privacy risk here is *social*, not *regulatory* — §3B.

---

## 6. Recent Breaking Changes (last 12 months)

- **No new breaking change in the share/distribution libraries** surfaced for the bundled versions named in the spec (`react-native-view-shot` 4.0.3, `expo-sharing` ~55.0.20). The capture gotchas above are longstanding, not new. (Library *currency* verification is Phase 1C's job — flagging for them, not asserting here.)
- **Upstream astrology-api.io enum drift continues** (KB-documented: `good` grade + `mercury_combust`/`mars_retrograde`/`jupiter_retrograde` reason_ids added mid-2026 without notice). **Relevance to this feature:** the card derives its tier phrase from the SAME grade/tier classification. If the tier→phrase table is a fixed 4-entry map keyed to mood (`strong`/`good`/`mixed`/`closed`), it inherits the app's existing permissive-enum resilience — a *new* upstream grade maps through the existing classification into one of the 4 buckets and the card still renders. **Confirm the card-view-model consumes the already-bucketed tier, NOT a raw upstream `grade` string** — otherwise a new upstream grade (e.g. a future `strong` actually appearing) could fall through to an empty tier phrase on a public card. This is the one place upstream drift can reach the PNG.
- **Instagram Stories safe-zone guidance shifted slightly in 2026** toward the ~250px top/bottom convention (multiple 2026 guides converge). Use 2026 numbers, not older 220px figures.

---

## 7. Design Constraints for the Plan (non-negotiable)

The plan author should treat these as MUST unless flagged SHOULD.

1. **MUST** define the 4 tier→phrase wordings explicitly in `card-strings`, and **MUST** put them through astrologer review before launch (CLAUDE.md build-order step 13) — the candidates in §3A are drafts, not approved copy.
2. **MUST NOT** allow any forbidden word OR any literal mood-key string (`strong`/`good`/`mixed`/`closed`) OR any grade word (`fair`/`good`/`caution`/`poor`) OR any score number to appear in rendered card text. Golden test asserts the *negative set*, not just "Fair."
3. **MUST** render the card on an opaque `bg-deep` (#0F0A1F) base — never a transparent background — to avoid view-shot edge-halo artifacts; set `collapsable={false}` on the captured view and decorative sublayers.
4. **MUST** keep the halo as a captured gradient (already specced) and gate acceptance on "halo appears in exported PNG" before intensity (already specced — hold the line).
5. **MUST** design the center-safe region to the **union** safe zone: top dead-zone 250px, **bottom dead-zone 400px (WhatsApp Status, not 250)**, sides ≥60px. Lift the watermark above the 400px bottom band.
6. **MUST** verify the center-safe content still reads when the 9:16 card is cropped to **1:1**, not only when cropped by IG chrome (square is the required LatAm/WhatsApp fast-follow, not optional).
7. **MUST** make the card-view-model consume the **already-bucketed tier**, never a raw upstream `grade` string, so upstream enum drift can't produce an empty tier phrase on a public PNG.
8. **SHOULD** default the generic-intent toggle **ON** for sensitive activities — at minimum `contracts`, `business_launch`, and `travel`; consider `wedding` too. Only neutral cases default to showing the activity name.
9. **SHOULD** default to a **soft time-of-day ("Saturday afternoon")** rather than an exact minute when tz/location is NOT opted in; show exact time + tz-abbrev only when location is opted in.
10. **SHOULD** show contextual warning copy in the Share Preview sheet when a sensitive combination is selected (wedding + city, or travel + near-future date) — candidates in §3B.
11. **SHOULD** make the watermark do minimum attribution work: brand mark **plus a static @handle or wordmark people can search**, since there's no link yet (see §8/Open Questions). An unsearchable mark loses the loop.

---

## 8. Open Questions for the Human (product/business)

1. **Is the `closed`/blocked tier shareable at all?** A "better to wait" card has unclear share motivation and risks reading as the product judging the user's plan. Decide: (a) suppress sharing for closed moments, (b) reframe closed cards as "a moment worth waiting for," or (c) allow but soften. This is a product call, not a copy call.
2. **Watermark = wordmark only, or wordmark + searchable handle?** With no landing domain (correctly deferred), the *only* attribution affordance is something a viewer can type into search. A bare logo with no handle/name-to-search is a dead-end loop. Is there an `@inceptio` handle reserved on IG/TikTok to print on the card now? (Growth-domain view: the watermark's job in v1 is to make the brand *searchable*, since it can't be *tappable* yet.)
3. **Default for the activity toggle on `wedding`** — show or hide by default? §3B argues hide (triangulation/uninvited-guest risk); product may want the activity shown for emotional resonance. Needs a privacy-vs-virality call.
4. **Does business want contracts/business_launch cards to exist publicly at all?** Broadcasting deal/launch *timing* is commercially sensitive for the user. Maybe these two activities ship share-disabled in v1 and only wedding/travel get cards. Product/legal call.
5. **Square (1:1) — v1 or immediate fast-follow?** Spec says fast-follow; the WhatsApp/LatAm priority arguably makes it v1. Resourcing call.

---

## 9. Knowledge Base Updates

Appended to `_knowledge-base/astrology-electional.md` under a new `## Updated 2026-06-05` header: generalized the "tz on a downstream keepsake artifact vs tz as election input" distinction (a reusable matrix for any future Inceptio surface that *displays* a computed moment rather than *computes* it), the public-artifact tone constraints (forbidden-word + grade-word + mood-key-name leakage classes), and the activity-sensitivity-for-public-broadcast matrix (which of the 4 MVP activities are safe to name publicly). No prior entries deleted.

---

*Read-only domain audit. No implementation, no tests proposed — those are later phases. The §7 Design Constraints are the list writing-plans should fold in.*
