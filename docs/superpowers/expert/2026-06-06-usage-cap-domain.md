# Usage-Cap — Domain Audit (Compound V Phase 1B)

**Date:** 2026-06-06
**Spec audited:** `docs/superpowers/specs/2026-06-06-usage-cap-design.md`
**Advisor scope:** DOMAIN/voice/regulatory reality only. NOT code (Phase 1A), NOT library currency (Phase 1C).
**Verdict:** Spec is technically thorough; the **copy** is the under-specified surface. The single draft string is *not* safe as-is on all five render surfaces, and one factual honesty problem ("tomorrow") needs hedging. None of this blocks the architecture — these are copy + behavior constraints the plan must honor.

---

## 1. Domain(s) Identified

1. `astrology-electional` (existing KB — reused) — Mystical Premium voice, forbidden-word list, the overloaded-noun trap ("moments"), App Store 4.3 positioning.
2. `mobile-usage-cap` (no separate KB; cross-cutting UX/copy of a cost-shaping quota with a *hidden* paywall) — folded into the electional KB pass below rather than spun into its own file, because every constraint here is downstream of Inceptio's locked voice + the "paywall hidden" decision.

This is a **copy/tone/regulatory** audit, not a method audit. No fresh web research was required: the authoritative domain sources are (a) the locked CLAUDE.md voice rules, (b) the existing electional KB (App Store 4.3 finding, current to 2026-06-05), and (c) two facts verified directly in-repo this pass.

---

## 2. Sources Consulted

- **KB reused:** `_knowledge-base/astrology-electional.md` (last updated 2026-06-05 — within freshness window, no re-verification needed). Specifically the 2026-06-05 pass: forbidden-word list, grade-word leakage, App Store 4.3-spam positioning ([iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review)).
- **CLAUDE.md** (locked): Mystical Premium tone, forbidden-word list, "moments" = product noun, "Paywall hidden but wired" decision, the existing soft-block string ("You've explored 10 moments this month…").
- **In-repo, verified this pass:**
  - `apps/mobile/src/lib/error-messages.ts` — the real chokepoint. **The current `RateLimitError` copy already violates NOTE #4**: `"You've explored 10 moments this month. Try again in a few days."` It uses the overloaded "moments" noun *and* the stale 10/month period. This refactor must replace it, not extend it.
  - Five render surfaces confirmed to call `friendlyMessage(error)` as a bare string with no per-surface framing: `LoadingScreen.js:88`, `MomentDetailScreen.js:111`, `NoViableScreen.js:93`, `CalendarScreen.js:379`, `DailyHero.js:104`. **DailyHero.js (line ~97 comment) pairs the message with a "retry pressable"** — relevant to Finding D below.

No web searches dispatched: every claim here is sourced to a locked project doc, the freshness-valid KB, or a file read in this pass. Per citation-rigor rule #4, I am not padding with external sources I did not need.

---

## 3. Domain Constraints the Brainstorm Probably Missed (MUST / MUST NOT / SHOULD)

- **MUST NOT** ship the string containing the word **"moments"** (the spec already flags this as NOTE #4, but note the *live* code in `error-messages.ts` still says "10 moments" — the fix must overwrite, and a golden/negative test should assert the string never contains "moment").
- **MUST NOT** use any forbidden word (magic, destiny, fortune, stars align, manifest, energy[noun], vibes, alignment[new-age], blessed). Low risk for a chrome string, but lock it with the same negative test set the share-card pass established.
- **MUST NOT** imply payment, upgrade, "unlock," "Pro," "premium," "subscribe," or "limit lifts if you…" — the capped state must read as *early-access pacing*, not a disguised paywall (see §5 below; this is the App Store + "paywall hidden" intersection).
- **MUST** say **searches** or **lookups** explicitly, so the meaning is unambiguously "you ran out of search runs," never "the auspicious times have passed."
- **MUST** read correctly on all **five** surfaces from one string (no per-surface branch is in scope). See Finding A — the draft fails this on LoadingScreen and DailyHero.
- **SHOULD** hedge the reset promise away from a bare **"tomorrow"** toward a midnight-anchored phrasing — "tomorrow" is *sometimes* technically false-feeling and travel-fragile (Finding B/C).
- **SHOULD** soften the implied scarcity of "5" while telemetry is still being gathered — a hard "you've used today's 5" can read as stingy on first run before there's data to justify 5 (Finding E).

---

## 4. Common Traps in This Domain

### Finding A — One generic string does NOT read correctly on all five surfaces (the load-bearing copy bug)

The spec asserts "one edit gives the distinct capped state everywhere." True for *plumbing*; **not automatically true for the sentence**, because the five surfaces have different surrounding affordances:

| Surface | Context the string lands in | Does the draft read right? |
|---|---|---|
| `LoadingScreen` | User just tapped "search," sees a loading→error transition | **Awkward.** "You've used today's 5 searches" arrives *as if a 6th was attempted and rejected* — which is exactly what happened, so OK — but on Loading the user expects results, not a quota wall. Acceptable but the copy must not sound like a failure ("something went wrong"). |
| `MomentDetail` | Viewing a saved/derived moment | OK — terminal, no action expected. |
| `NoViable` | A *result* branch ("no good windows") | **Collision risk.** NoViable already means "the sky offered nothing." A cap string here must not blur into "no viable windows" — the user must understand it's *their quota*, not *the sky*. Saying "searches" (not "moments"/"windows") is what disambiguates. |
| `Calendar` | Heatmap error state | OK. |
| `DailyHero` | **Renders the string next to a "retry pressable"** (confirmed `DailyHero.js:97`) | **Worst case.** A retry button next to "the next opens tomorrow" invites a tap that will just re-hit the 429. The retry affordance contradicts a terminal daily cap. |

**Constraint for the plan:** the capped copy must be a *self-contained, calm, terminal* statement that (a) names "searches," (b) does not read as a system failure, (c) does not read as "the sky is empty," and (d) survives sitting next to a retry button. If the DailyHero retry cannot be suppressed for the cap branch within copy-only scope, **flag it as an open item** — a retry that can't succeed is a trust ding. (The spec scoped this as "copy only / no new client state"; suppressing retry on the cap branch is arguably one conditional, worth raising with the owner.)

### Finding B — "the next opens tomorrow" is not always honest

- **11:50pm edge:** user hits the cap, reads "tomorrow," and the reset is 10 minutes away. Not *false*, but it under-promises in a way that feels off if they retry at 12:01am and it works ("you said tomorrow"). Minor, tolerable.
- **Midday edge (the real one):** most cap-hits will happen mid-afternoon/evening. "Tomorrow" is honest there. So the average case is fine; only the near-midnight case is mildly misleading. Net: "tomorrow" is *mostly* true, occasionally clumsy.

### Finding C — Timezone travel breaks the "tomorrow" promise (cross-tz honesty)

This is the trap most likely missed. The KB's entire EC-19 / surface-class body (2026-06-03, 2026-06-05) establishes that **tz is load-bearing** and that Inceptio's core personas are cross-tz (destination-wedding planners, nomads, expats, travel-activity users). The cap's reset is computed from the **request's tz** (spec §7), and the request tz = `tzLookup(picked location)`, **not the device's wall clock**.

Consequence: a user in NYC searching for a **Bali** wedding gets a reset bucket keyed to **Bali's** local date. Their on-screen "tomorrow" is *Bali's* tomorrow, which may already be "today" or even "two days" relative to the phone in their hand. A user who searches Tokyo then LA in one session can land in two different daily buckets. The bare word "tomorrow" silently assumes device-local time and will occasionally be wrong by a full calendar day for exactly Inceptio's marquee persona.

**This is the strongest argument for hedging the copy** (Finding B alone is weak; B+C together are decisive). Recommended: do not promise a relative day at all. Anchor to "midnight" without claiming whose midnight, or omit the time entirely.

### Finding D — The retry affordance on DailyHero (see Finding A) is a behavioral trap, not just copy.

### Finding E — "5" can read as stingy pre-telemetry

A consumer electional app where one search = "explore a date range" is a *deliberate, considered* action, not doom-scrolling. A genuinely engaged first-run user comparing wedding dates across, say, two candidate months in two cities can plausibly burn 4–5 searches in a single sitting *legitimately*. Hitting a hard "you've used today's 5" on day one — before any telemetry exists to confirm 5 is generous — risks a bad first impression on the most engaged users (the ones you least want to frustrate). The spec correctly parameterizes the number and builds a survival curve (`metrics:search-reach:{date}:{N}`) to validate it — but **that telemetry won't exist until after the prod deploy**, so the *launch* copy ships blind. The copy should therefore lean *gentle/early-access*, not *enforcement*, to buy goodwill while the number is unproven. (This dovetails with §5: gentle framing also keeps it clearly non-paywall.)

---

## 5. Regulatory / Compliance Notes

- **App Store Guideline 4.3 (spam)** is the live risk for astrology apps (KB 2026-06-05; [iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review)). A usage cap doesn't *trigger* 4.3, but its copy must keep reinforcing the "thoughtful tool, not a fortune machine" positioning — i.e. don't make the wall sound like a slot machine that's out of pulls.
- **"Paywall hidden but wired" decision (CLAUDE.md) — CONFIRMED CONSISTENT.** A usage cap with **no upgrade CTA, no "Pro," no price, soft-block only** is exactly the posture CLAUDE.md mandates ("soft block message instead of a paywall… No upgrade CTA, just OK"). The cap is a *cost-shaping anti-abuse* measure, not a monetization gate. **The plan must keep it that way:** the capped string must contain **zero** monetization signal. Any wording like "you've reached your free limit," "upgrade for more," or even the bare word "limit" framed as a tier risks reading as a disguised paywall — which both violates the hidden-paywall decision *and* invites App Store reviewers to look for the hidden purchase flow (the RevenueCat SDK *is* in the bundle, so a paywall-flavored cap message is a needless flag).
- **No "free" framing.** Saying "free searches" implies a paid tier exists, re-exposing the hidden paywall by inference. Use "today's searches," never "today's free searches."

---

## 6. Recent Breaking Changes (last 12 months)

None bearing on the cap directly. The relevant upstream drift (mid-2026: `good` grade, `mercury_combust`, `mars/jupiter_retrograde` added without notice — KB 2026-06-02, CLAUDE.md) is already handled by the permissive-enum policy and is orthogonal to the quota. No domain-side breaking change affects the cap copy or reset logic.

---

## 7. Design Constraints for the Plan (non-negotiable)

1. The capped string MUST NOT contain "moment(s)", "window(s)", or any forbidden word. Lock with a negative test (extend the existing forbidden-word negative-set pattern from the share-card work).
2. The string MUST say "searches" or "lookups" explicitly.
3. The string MUST contain NO monetization signal: no "upgrade," "Pro," "premium," "unlock," "free [tier]," price, or "limit" framed as a purchasable tier. (App Store 4.3 + hidden-paywall.)
4. The string MUST read as a calm, terminal, early-access pacing message — not a system error, not "the sky is empty" (NoViable collision), not a slot-machine-empty.
5. The string MUST be safe sitting next to DailyHero's retry pressable; if the retry button cannot be suppressed for the cap branch in copy-only scope, that is an OPEN ITEM for the owner, not a silent ship.
6. The reset phrasing SHOULD NOT promise a bare relative "tomorrow"; anchor to "midnight" or omit the time, because the reset is keyed to the *picked location's* tz, not the device clock (cross-tz persona honesty).
7. Launch copy SHOULD lean gentle (early-access) over enforcement, since "5" is unvalidated until post-deploy telemetry exists.
8. Replace (not extend) the existing live `RateLimitError` copy in `error-messages.ts` — it currently violates constraints 1 and 3 already ("10 moments this month").

---

## 8. Recommended Copy (2–3 options)

All forbidden-word-clean, "searches"-explicit, no monetization signal, no "moments," midnight-anchored (not bare "tomorrow"), and read as terminal calm on all five surfaces.

**Option A (recommended — gentle, midnight-anchored, no relative-day claim):**
> "You've used today's searches. A new set opens at midnight."

- Pros: no "tomorrow" (sidesteps Finding B/C entirely — "midnight" is locally true wherever the reset is keyed in a way "tomorrow" isn't); "a new set opens" is warm and clearly non-paywall; works next to a retry button (retry still says "not yet, midnight"). Says "searches."
- Optionally add the count when `used`/`limit` are available: "You've used today's 5 searches. A new set opens at midnight." — but see Option C on whether to show the number at launch.

**Option B (warmest, count-free, omits time entirely):**
> "You've reached the end of today's searches. Inceptio opens fresh tomorrow."

- Pros: warmest, most "thoughtful friend." Cons: re-introduces "tomorrow" (Finding B/C). Acceptable if the owner decides cross-tz reset-day mismatch is rare enough to ignore for v1, but A is safer.

**Option C (most honest about being early-access, softens the "5"):**
> "You've explored today's searches — Inceptio is in early access. A new set opens at midnight."

- Pros: directly inherits the CLAUDE.md soft-block voice ("Inceptio is in early access"), which is already the sanctioned non-paywall framing; the "early access" clause excuses the modest cap and pre-empts the "stingy" reaction (Finding E) without any monetization signal. Cons: slightly longer; "explored" is fine but verify it doesn't drift toward the "moments explored" reading — "explored today's searches" is unambiguous.

**Recommendation:** **Option A** for the always-on string; if the owner wants to acknowledge the early-access posture (recommended at launch, per Finding E), use **Option C**. Show the "5 of 5" count only if the owner wants it — the count adds enforcement flavor that cuts against the gentle posture; the spec's `used`/`limit` fields make it *available* but not *mandatory* to display.

---

## 9. Open Questions for the Human

1. **DailyHero retry button (Finding A/D):** A retry next to a daily-cap message will just re-hit the 429. Suppress retry on the cap branch (one conditional, slightly beyond "copy-only")? Or accept the dead retry for v1? — product/UX call.
2. **Show the count?** Display "5 of 5" (uses the additive `used`/`limit`) or keep it count-free for a gentler, less-enforcement tone? — product call. Domain recommendation: count-free at launch.
3. **Cross-tz reset honesty (Finding C):** Is the "reset keyed to picked-location tz, not device tz" behavior acceptable, or should the copy/behavior acknowledge it for travel/destination users? Domain recommendation: dodge it with "midnight" copy (Option A), revisit only if it surfaces in support.
4. **Is 5/day right for launch (Finding E)?** Telemetry validates it *after* deploy; the launch number ships blind. Comfortable starting at 5, or start higher (e.g. 8–10) and tighten once the survival curve confirms where real usage clusters? — product call; the value is a single source (`TIERS.free.limit`) so it's a one-line change either way.

---

## 10. Knowledge Base Updates

Appended a new pass to `_knowledge-base/astrology-electional.md` under `## Updated 2026-06-06 — Cost-shaping usage cap + hidden-paywall copy constraints`, generalizing: (a) the "no monetization signal" rule for any soft-block under the hidden-paywall regime, (b) the cross-tz honesty rule for any user-facing reset/expiry copy keyed to picked-location tz, (c) the "one chokepoint string must survive all N render surfaces' surrounding affordances" rule (the DailyHero-retry trap generalized), and (d) the updated forbidden/ambiguous-noun list now explicitly including "searches not moments/windows" for chrome strings.
