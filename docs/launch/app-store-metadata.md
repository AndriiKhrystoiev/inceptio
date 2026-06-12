# Inceptio — App Store metadata (v1.0 draft, iOS / US / en)

> North star for all store assets: **Inceptio tells you when to begin — not just what.**
> Voice anchor: the locked L38 onboarding copy (real planetary positions, traditional
> electional method, timing — never "predictions").

## Locked decisions
- **Title: intent-led**, search terms go in subtitle + keywords (category is
  low-frequency, so a keyword-stuffed title costs brand feel for little gain).
- **`muhurat` NOT in v1 keywords** — asymmetric early-1–3★ risk from Vedic searchers
  (who want Panchang/Rahu Kaal we don't deliver) outweighs the niche traffic with a
  zero-review buffer. Revisit post-launch if desired.

## Fields
- **Name** (≤30): `Inceptio: Find Your Moment`  (26)
- **Subtitle** (≤30): `Auspicious timing to begin`  (26)
- **Keywords** (≤100): `electional,astrology,wedding,launch,travel,contract,planetary,moon,start,date,calendar,best,hour`  (96/100)
  - _Changelog:_ +contract (was a gap — covers the contracts activity), +calendar (real
    feature: the electional engine produces calendar heatmaps), +best (broad
    best-day-to-begin intent). zodiac & ceremony moved to bench (lane-dilution /
    redundancy). horoscope/lucky/muhurat stay excluded. These exclusions are
    FUNCTIONAL, not just brand: Inceptio runs on the Western electional / timing /
    planetary-hours / Moon (VOC, lunation) endpoints only. zodiac & horoscope are
    natal/sun-sign namespaces the app doesn't use; muhurat is the Vedic/Panchang
    namespace the app doesn't use. These terms point at features Inceptio doesn't have
    — they'd draw mismatched traffic to a capability gap. 'best' is the most marginal
    term (first swap candidate; bench alt: hour). See
    `aso-audit/01-research/keyword-pressure-test.md` for the full per-slot analysis.
  - _Changelog (subtitle pass):_ timing promoted to Subtitle for high-weight
    indexing; hour (Planetary Hours endpoint) backfills the freed slot.
- **Promotional text** (≤170):
  Know the right time to begin what matters — a wedding, a launch, a journey,
  a fresh start. Inceptio reads the real sky and finds your moment.
- **Description:**

  Inceptio tells you when to begin — not just what's in the stars. Most
  astrology apps describe who you are; Inceptio answers a different question:
  when is the right time to start what matters?

  Wedding · Business launch · Contract · Travel — find the right day for each.

  _[DOC-ONLY EDITOR NOTE — NOT listing copy. STRIP this bracketed line before
  pasting the Description into App Store Connect; it must never ship as literal
  text. Proof slot — post-launch: add rating / press / user count here. Do NOT
  fabricate pre-launch.]_

  It reads the real positions of the planets — the way astrologers have chosen
  auspicious moments for centuries — and finds the days and hours that favor
  your plans, each with a clear reason.

  Some days the answer is simply "not yet," and Inceptio will say so. Knowing
  when to wait is part of good timing.

  Calm, considered, and honest about what the sky can and can't tell you.
  Find your moment.

## Notes
- Subtitle carries "auspicious" + "begin" (indexed + readable), so keywords don't
  duplicate name/subtitle words. `muhurat` slot is free (~91/100) if added later.
- Description rhymes with the L38 voice and frames the frequent "no viable windows"
  state as wisdom ("not yet… part of good timing"), not a bug.
- DO NOT add an "astrologer-reviewed / reviewed by real astrologers" claim: native +
  astrology review of translations is still pending and rulings are provisional
  (AI/community). Claiming it now is a trust risk + misleading metadata. The honest
  trust anchor is "real positions of the planets" + the centuries-old method.
- Validate exact char counts + final keywords in App Store Connect at entry. This is
  en/US only — Play and other locales are a separate localization pass.

## Category
- Primary: Lifestyle  (honest fit; where the audience + editorial featuring are)
- Secondary: Utilities  (genuine timing-tool surface, weak competition, free
  discovery — mirrors Horaly; don't leave blank)
- Avoid: Health & Fitness (invites 5.1.1 medical scrutiny; surgery deferred to v1.4)
- 4.3 narrative: electional-not-horoscope + "real positions, never predictions"
- Reality: charts/featuring are NOT the near-term channel — search + word of mouth
  are; featuring is worth pitching but treat as bonus, not plan.
