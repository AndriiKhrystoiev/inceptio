# Inceptio — Google Play metadata (v1.0 draft, Android / en)

> **Status: PROPOSAL** for review. Sibling to `app-store-metadata.md` (iOS). en only —
> Play locales (de / fr / es-419 / pt-BR) are a separate localization pass.
> Voice anchor: the locked L38 onboarding copy (real planetary positions, traditional
> electional method, timing — never "predictions").

## API-compliance note ("stay within the limits of our API")

- The live demo (`astrology-api.io/demo`) is JS-rendered and did not expose endpoint
  detail to a fetch; feature claims here are grounded on the repo's **verified** spec
  (CLAUDE.md "Real API behavior", from Postman verification) — the `electional/search`
  endpoint only.
- The fetch *did* confirm the upstream is a **broad multi-domain astrology API** (Vedic,
  Relationship & Compatibility, Horoscopes & Daily Content, Tarot, Numerology, Chinese…).
  **Inceptio ships only the electional branch.** Therefore the listing claims **only**
  electional timing — nothing from those other branches.
- **Every claim below maps to `electional/search`:** scored time windows for a chosen
  activity within a date range + location; per-window grade; warm factor explanations
  (translation layer); excluded ranges; calendar heatmap; the "no viable windows" state;
  moon phase (computed locally). 4 MVP activities only.
- **Deliberately NOT claimed** (API offers, app does not ship): horoscopes, birth charts,
  compatibility, Vedic/Panchang/muhurat, tarot, numerology. **Deferred:** the other 8
  activities + surgery (v1.4). **Gated:** the "astrologer-reviewed" claim (post §11.4
  ruling — no-overclaim rule). **Never:** predictions / fortune-telling / "your horoscope."

---

## Why Play ≠ iOS (drives the field choices)

- **No hidden keyword field, no subtitle.** Title + short description + **full description
  (all 4000 chars indexed)** carry every keyword. The iOS "never repeat a keyword across
  fields" rule is **inverted**: on Play you *reinforce* the primary keyword across title +
  description (3–5× density) — that's the ranking signal.
- So the keyword work moves into the **full description**, which iOS can't index at all.

---

## Fields

### Title (30) — 2 options
> **Dropped** the earlier "Inceptio: Auspicious Timing." Leading Play's **highest-weight**
> field with the Vedic/Panchang-coded `auspicious` maximizes exactly the mismatch exposure we
> track — and it's *worse on Play* (stronger India/Panchang search skew), while Inceptio targets
> en + 5 Western locales, not that market. `auspicious` appears **once, in the description**,
> framed Western-electional — never in the title.

| # | Title | Chars | Keywords gained | Note |
|---|---|---|---|---|
| **①** (recommend) | `Inceptio: Timing to Begin` | 25 | timing, begin | Brand-anchored + the **top non-Vedic** keyword (`timing`) in the highest-weight field; on-brand, no jargon, no mismatch risk. |
| ② | `Inceptio: Find Your Moment` | 26 | — | Exactly matches the iOS title (cross-store brand consistency) but carries **no search keyword** — weakest for Play's keyword-hungry algorithm. |

**Recommend ①.** Pre-launch the brand isn't known, so a clean, non-Vedic keyword in the title
earns ranking faster than a pure brand title; ② is the choice only if cross-store brand
identity outranks Play discoverability.

### Short description (80) — first line in results; indexed, high weight
Rule: don't lean on the **title's** keywords (`timing` / `begin` if ① chosen) — vary instead.
| # | Short description | Chars | Note |
|---|---|---|---|
| **①** (recommend) | `Find the best day to start a wedding, business, contract or trip.` | 64 | Warm, clear, all 4 activities as high-intent long-tail; `start` varies the title's `begin`. |
| ② (keyword-max) | `Electional astrology that finds the best day to begin what matters.` | 66 | Also surfaces the **owned** term `electional` in high-weight space (it's already woven into the full description); slight jargon cost in the first line users read. |
| ③ | `The right day to start — weddings, business, contracts and travel.` | 65 | Activity long-tail, no jargon. |

### Full description (4000, indexed — the keyword engine)
`electional` appears **twice, naturally** — defined in context once, reinforced casually once.
Play indexes it *and* the description **educates** the unfamiliar term, which the hidden iOS
keyword field could never do (this is the whole reason `electional` belongs here, not buried).
`auspicious` appears **once**, framed Western-electional. `timing` and the 4 activities recur
naturally — no stuffing (`electional ×4` would read as keyword spam; Google penalizes that).
Honest trust anchor (no astrologer-reviewed claim). ~1.9k/4000 chars — headroom for localized
expansion. Above the fold (first ~167 chars) leads with **plain intent, not jargon**;
`electional` lands in paragraph 2, where it is defined.

```
Inceptio tells you when to begin — not just what's in the stars. Pick what you're planning and
a range of dates, and Inceptio finds the days and hours that favor it.

Most astrology apps describe who you are. Inceptio answers a different question: when is the
right time to begin a wedding, a business, a contract, or a journey? This is electional
astrology — the centuries-old Western tradition of choosing a favorable moment to start
something — made simple, on your phone.

✨ What Inceptio does
• Reads the real sky: pick an activity, a date range, and a place, and Inceptio uses the real
  positions of the planets to find the moments that favor your plans.
• Explains every moment in plain words: each window comes with a warm, clear reason — no
  jargon, no doom.
• Covers what matters: weddings, business launches, contract signings, and travel.
• Shows a calendar you can read: a heatmap reveals the best day at a glance across your whole
  range.
• Is honest about waiting: some days the answer is simply "not yet," and Inceptio will say so.
  Knowing when to wait is part of good timing.
• Goes as deep as you like: a calm summary for most, the full chart and factors for anyone who
  wants the detail.

🌙 Real sky, real method
Inceptio works from the real positions of the planets and the traditional technique
astrologers have used for centuries to pick an auspicious moment. It is timing — not
prediction, not fortune-telling, not your daily horoscope.

🔒 Private by design
No account. No sign-up. Your moments stay on your device.

Find the right time to begin. Download Inceptio and find your moment.

Whether you're looking for the right day to marry, a good time to launch a business, the best
day to sign a contract, or an easy day to travel, Inceptio is built for that one decision:
when to begin. (Astrologers call it electional astrology; you can just call it good timing.)
```

Keywords targeted: `electional` (×2 — defined + reinforced), `timing`, `auspicious` (×1,
Western-framed), `begin` / `start` / `best day to`, `wedding`, `business` (launch), `contract`,
`travel`, `planetary` / `real positions`, `calendar`. Excluded by discipline (same as the iOS
field): `horoscope` (disclaimed, not courted), `zodiac`, `lucky`, `muhurat`, `panchang`.

---

## Creative

### Feature graphic (1024×500, required — no iOS equivalent)
Brief: one warm frame on the Mystical Premium palette (bg-deep `#0F0A1F`, violet `#8B6FE8`,
gold `#E5C77D`) carrying the category line **"Know when to begin."** Legible without relying
on small text (some surfaces truncate). Brand-consistent with screenshots. **Not yet
produced** — design asset.

### Screenshots (Play allows 2–8; use 8)
Adopt the first 8 of the `competitor-creative-teardown.md` story (drop frames 9–10 to fit 8):
1 decision answered · 2 the reframe (when, not who) · 3 pick activity (wedding · business ·
contract · travel) · 4 calendar heatmap · 5 a moment explained · 6 "sometimes the answer is
not yet" · 7 real positions / traditional method · 8 private by design. Imitate Co-Star's
restraint + CHANI's warmth; avoid Vedic iconography. **Not yet produced.**

---

## Category & tags
- **Category: Lifestyle** (consistent with `category-positioning.md`; no astrology category
  on Play, as on iOS).
- **Tags:** Play tags are chosen from **Google's fixed per-category list — not free text**,
  so you cannot tag literal "electional." (Minor correction to the `category-positioning.md`
  "spend 5 tags on electional intent" note — pick the closest available, e.g. lifestyle /
  self-improvement-adjacent tags Google offers.)
- **Avoid Health & Fitness** (5.1.x medical-content parallel; surgery deferred).

## Ratings (Play = continuous, never reset — unlike iOS)
Pre-launch: N/A. Plan: respond to every 1–3★ review (algorithmic boost + invites re-rating);
watch specifically for "where's the Panchang / Rahu Kaal" → the `muhurat`/`auspicious`
mismatch signal (same watch item as iOS).

---

## Self-audit (scoring the draft, not a live listing)

```
Title:             8/10 — brand + a clean non-Vedic keyword ("timing"); capped only by
                          unknown brand (keyword-lead ranks faster). No mismatch risk now
                          that "auspicious" is out of the title.
Short description: 8/10 — clear + activity long-tail + intent; take alt ② to also land
                          the owned term "electional" in high-weight space.
Full description:  9/10 — indexed + educative ("electional" defined, ×2 natural), honest
                          anchor, zero exclusion violations; headroom for more long-tail.
Screenshots:       7/10 — strong story mapped, but NOT yet produced.
Feature graphic:   6/10 — brief ready, required asset NOT yet produced.
Ratings:           N/A  — pre-launch (continuous model; respond-to-reviews plan noted).
Overall (draftable fields): 38/50
```

### Top 3 improvements
1. **Produce the feature graphic + 8 screenshots** — required/highest-converting assets and
   the only fields blocking a complete listing. (Biggest score + conversion lever.)
2. **`electional` now lands in the indexed full description, defined in context** — Play
   indexes *and* educates the owned term (the iOS keyword field could do neither). Optionally
   also take short-desc ② to surface it in higher-weight space; not required, since the full
   description carries it naturally.
3. **Expand the full description toward ~3–3.5k chars** with natural long-tail ("the right day
   to marry", "good day to sign a contract", "best time to start a business") — Play indexes
   it all and rewards semantic breadth; keep density natural, no stuffing. (Avoid "auspicious"
   long-tail — keep that word to its single Western-framed use, per the Vedic-coding watch.)

## Risks to monitor (carried from iOS)
- **"auspicious" is Vedic/Panchang-coded** — now kept to a **single, Western-framed** use in
  the description and **out of the title**, minimizing exposure (Play's India/Panchang search
  skew makes a title use especially risky). Still accurate and on-brand; watch post-launch for
  Panchang-expecting mismatch reviews (swap lever for the one description use: "favorable" /
  "the right day").
- **Education cost** — lead with plain intent ("best day to begin"), keep "electional" as the
  method in the explanation (mirrors the product's progressive disclosure).
