# Inceptio — Pre-Launch ASO Checklist

## Metadata (App Store Connect)
- [ ] Title: `Inceptio: Auspicious Timing` (27/30)
- [ ] Subtitle: `Best Day to Start Anything` (26/30)
- [ ] Keywords: validated 99/100 string (see `02-metadata` / quick output)
- [ ] Promotional text set (editable post-launch — use for seasonal hooks)
- [ ] Description proofread; "Inceptio" appears 3–5× ✓; zero forbidden tone words ✓
- [ ] **Stakeholder sign-off on the `muhurat` keyword decision** (review-noise risk)
- [ ] Title A/B consideration: keyword-led (`Auspicious Timing`) vs intent-led (`Find Your Moment`) — decide before submit

## Category & age
- [ ] Primary category: **Lifestyle** (where CHANI/Nebula sit). Secondary: **Reference** or **Utilities**
- [ ] Age rating: 12+ likely (astrology/"infrequent mature themes"); confirm no medical claims (surgery is deferred for exactly this reason — keep it out of copy)

## Screenshots (drives conversion more than keywords)
- [ ] Caption 1 — the category-defining promise: "Know *when* to begin." (not "what")
- [ ] Caption 2 — activity picker: wedding · business · contract · travel
- [ ] Caption 3 — calendar heatmap (the signature visual)
- [ ] Caption 4 — a warm moment reading (show the tone)
- [ ] Caption 5 — "See the chart" depth (trust: **real planetary positions + centuries-old method**; add "astrologer-reviewed" only **post-review** — §11.4 gate, no-overclaim rule)
- [ ] Use the locked palette (bg-deep `#0F0A1F`, accent violet `#8B6FE8`, gold `#E5C77D`)
- [ ] Run `/aso-assets screenshots` to generate specs/headlines

## Trust & compliance
- [ ] Description counters "AI slop" skepticism with the **honest pre-review anchor** ("real planetary positions, centuries-old method"). Add the **astrologer-reviewed** claim only **after** the astrologer ruling (§11.4) — not before (no-overclaim rule)
- [ ] Privacy: "no account, on-device" claim matches reality → Privacy Nutrition Label = minimal/no data collected
- [ ] Generate legal docs: `/aso-manage legal` (Privacy, Terms, EULA)
- [ ] Confirm no medical/health framing anywhere (App Store medical-content risk)

## Technical / submission
- [ ] `/aso-connect setup` — credentials not yet present (`~/.aso/` missing)
- [ ] `/aso-connect status` — confirm app record + readiness
- [ ] `/aso-release create 1.0.0` → `attach` → `sync` → `submit`
- [ ] Consider phased release (`/aso-release phased start`) to watch early reviews for the `muhurat` mismatch signal

## Post-launch (first 2 weeks)
- [ ] `/aso-manage reviews --negative` — watch specifically for "no Panchang / where's Rahu Kaal" → that's the `muhurat` mismatch; swap keyword if it appears
- [ ] Watch for "no results / app is broken" reviews → empty-window UX framing problem, not a keyword problem
- [ ] Track impressions vs conversion; iterate subtitle (free to change) before touching title
- [ ] _[Correction 2026-06-12]_ ~~Watch Horaly for an election-search feature add~~ — **void**: "Horaly" was a misidentification (horary ≠ electional); no consumer electional competitor exists. Optionally scan for any *new* consumer electional entrant — but there is none to watch today.
