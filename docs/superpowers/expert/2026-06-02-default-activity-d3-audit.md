# Phase 1B Audit — Default Activity Preference, D3 stress-test

Topic: Inceptio brainstorm spec — user-selectable default activity preference, with focus on D3 "activity-agnostic voice for sky state."
Date: 2026-06-02

## 1. Domain(s) Identified

- `astrology-electional` (primary) — traditional Western electional method (Lilly, Bonatti, Dorotheus, Frawley lineage)
- `mobile-consumer-astrology` (secondary, light touch) — Sanctuary/CHANI category context

## 2. Sources Consulted

KB: none existed; new file `astrology-electional.md` created.

Web searches (10, parallel, then 5 follow-up):
- Lilly Christian Astrology Bk 3 + VOC + marriage/contracts
- Lilly/Bonatti VOC "nothing shall come" doctrine
- Bonatti Tractatus 7 retrogrades activity-specific
- Dorotheus Carmen Bk V elections marriage/journey/contracts significators
- Venus Rx wedding vs contracts severity
- Frawley electional Venus dignified activity-specific
- Mercury Rx contracts vs travel vs wedding severity
- VOC travel/journey exceptions
- Skyscript electional Venus Rx marriage
- Venus Rx wedding vs business vs travel tolerance
- r/weddingplanning Mercury/Venus Rx wedding dates

Primary sources cited inline: Lilly *Christian Astrology* via Anthony Louis and Lee Lehman essays; Bonatti's 19th Consideration via Renaissance Astrology blog; Dorotheus via Seven Stars / Dykes review; Frawley via Skyscript; modern consensus via Glam/CHANI/YourTango/Susan Miller.

## 3. Domain Constraints the Brainstorm Probably Missed

- **MUST NOT** claim "the sky state is activity-agnostic" in the spec body. Tradition does not support it. The sky is observably the same; the **interpretive weight** of each sky condition is significator-driven and therefore activity-specific.
- **MUST** treat Venus retrograde, Mercury retrograde, and Moon void-of-course as **asymmetric across the 4 MVP activities**. These three conditions are the high-severity asymmetry zone where a uniform voice will be judged method-incorrect by an astrologer reviewer.
- **MUST** keep travel as the explicit "low-severity for Venus Rx and VOC" outlier. Lilly's VOC exceptions (Moon in Cancer/Taurus/Sagittarius/Pisces) and modern consensus (Susan Miller: "you can go on vacation when Venus is retrograde") both put travel in a distinct severity bucket.
- **MUST** treat the 4 activities as genuinely distinct elections per Dorotheus Bk V structure (separate chapters per matter). Wedding and Contracts share the 7H but use different natural significators (Venus vs Mercury) — they are NOT collapsible.
- **SHOULD** assume astrology-api.io's per-activity `weight_class` already encodes most of this asymmetry (it would need to, to be tradition-honest). Verify against a real Venus Rx date before relying on it.
- **SHOULD** plan for an astrologer review pass on the daily-note voice variants, not just the existing translation dictionary (already booked in CLAUDE.md). The pass needs to cover the asymmetry severity hints, not just factor phrases.

## 4. Common Traps in This Domain

- **Trap 1 — "Modern light" voice that hides the method.** Saying "Venus is resting" with no activity calibration is fine for a horoscope app, but Inceptio is positioned as electional (CLAUDE.md: "uses electional astrology as the method under the hood — present in the explanation, never the headline"). A traditional astrologer reviewer reads "uses electional astrology" as a binding claim about method fidelity. Voice that erases significator asymmetry will be flagged.
- **Trap 2 — VOC treated as uniformly catastrophic.** Lilly explicitly carves out dignified-Moon and travel exceptions. A blanket "the Moon is between signs — wait" reads as more rigid than the tradition actually is.
- **Trap 3 — Mercury Rx treated as universal warning.** It is *not* in tradition — it is the contract-specific bell. Wedding Mercury Rx is mitigatable (sign legal docs outside window, hold ceremony inside). Travel Mercury Rx is moderate. Only contracts treats it as catastrophic.
- **Trap 4 — Conflating 7H wedding with 7H contracts.** Both use 7H, but Venus is wedding's natural significator and Mercury is contracts'. A Venus-bad / Mercury-good day diverges sharply between them. QA samples that ignore Venus-Mercury divergence will miss this.
- **Trap 5 — Per-activity voice fork that quadruples scope.** The opposite trap of D3-as-written. The cure is a thin asymmetry layer (~12 strings for 3 high-asymmetry sky conditions × 4 activities), not 4× full voice forks.

## 5. Regulatory / Compliance Notes

- App Store medical-content risk only triggers for surgery (already deferred to v1.4 per CLAUDE.md). The 4 MVP activities are clear.
- Marketing language must not promise outcomes ("your marriage will succeed if you wed at this moment"). Existing tone guide ("a thoughtful friend who happens to know traditional astrology") and forbidden-words list ("destiny", "blessed", "manifest") already covers this. No new constraint here.
- No GDPR/CCPA implications from D3 specifically — daily-note is generated from public sky data, not user PII.

## 6. Recent Breaking Changes (last 12 months)

- Mid-2026 astrology-api.io upstream: added `mercury_combust`, `mars_retrograde`, `jupiter_retrograde`, `good` grade without notice. CLAUDE.md's permissive-enums policy is the right defensive posture; D3-related copy will need draft entries for any new asymmetry-relevant reason_id (e.g. `mercury_combust` is contract-specific, like Mercury Rx).
- Venus Retrograde 2026 falls Oct–Nov 2026 per multiple practitioner calendars — covers a chunk of the MVP launch window. Wedding-defaulted users will hit this. QA dataset must include a Venus Rx sample date.

## 7. Design Constraints for the Plan (non-negotiable)

1. **D3 must reopen — partially.** The "base sky description is activity-agnostic" half holds. The "severity framing is activity-agnostic" half does NOT hold against tradition.
2. **Adopt "uniform base sentence + optional 1-line severity hint per activity"** for the 3 high-asymmetry conditions: Venus retrograde, Mercury retrograde, Moon VOC. All other sky conditions (moon phase, planetary hour, fixed star conjunction, most dignities) remain truly activity-agnostic in voice.
3. **Asymmetry hint string count: ~12** (3 conditions × 4 activities). Not 4× full voice fork. This is the architectural compromise — it scales as O(asymmetric_conditions × activities), not O(all_conditions × activities).
4. **Travel must be the named "tolerant" outlier** for Venus Rx and VOC in copy. The tradition is unambiguous on this.
5. **Contracts must be the named "Mercury-Rx-severe" outlier.** Same logic, opposite asymmetry.
6. **D11 telemetry must track which severity hint fired** per activity per day, so drift between API-asserted severity and tradition-asserted severity becomes observable.
7. **D12 cache key strategy must include `(date, activity)`** if the severity hint changes by activity (it does, for these 3 conditions). A `(date)`-only cache would serve wrong copy across activity defaults.
8. **D17 component reuse holds** — the daily-note component takes a base + optional hint slot. Same component, conditional second prop.
9. **§12.4 QA gate keeps real value** but with a smarter sampling rule: sample at least one moon-dominated day (expect convergent highlights across 4 activities) AND at least one Venus-Rx / Mercury-Rx / VOC day (expect divergent severity hints). Without this split, the gate is noisy.

## 8. Open Questions for the Human

1. Does astrology-api.io's per-activity `weight_class` *already* encode Venus Rx as `critical` for wedding and `mild` for travel? If yes, the asymmetry hints can be auto-triggered by reading API weights. If no, the asymmetry is a Worker-side static decision and needs its own table. **Verify via Postman call on a known Venus Rx date for both wedding and travel activities before locking the asymmetry hint architecture.**
2. Is the astrologer reviewer (Step 13 in CLAUDE.md build order) willing to draft the 12 severity hint strings, or do they want Claude Code to draft and they review? Affects timeline — ~3 hrs of review either way, but drafter changes scope estimate.
3. For the asymmetry layer, should travel show its hint as **reassurance** ("don't worry, this matters less for journeys") or **silence** (no second sentence at all)? Reassurance is more on-brand ("thoughtful friend") but increases copy surface.
4. Product/business question: if a user's default activity is travel but they sometimes search contracts, does the daily-note honor their default (travel) on Today or switch based on most-recent-search? Affects what "default activity" really means.

## 9. Knowledge Base Updates

Created `docs/superpowers/expert/_knowledge-base/astrology-electional.md`. Contains:
- The full asymmetry matrix (8 sky conditions × 4 activities) with source citations
- Tradition source quotes from Lilly, Bonatti, Dorotheus, Frawley with URLs
- EC-3 distinctness analysis showing 4 activities are not collapsible
- Day-to-day divergence expectation (~30–40% divergent, ~60–70% moon-dominated convergent)
- Recent upstream API drift notes
- 3 open questions for future passes
