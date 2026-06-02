# Daily Timing Layer — Voice & Copywriting Design

**Status:** Spec ready for handoff
**Scope:** Voice & copy only. Architecture, UI layout, and push-notification copy are deferred to later sessions.
**Date:** 2026-05-28
**Voice constraint:** Continues the locked "thoughtful friend who happens to know traditional astrology" voice from `CLAUDE.md` and the existing Translation Layer (`workers/api-proxy/src/translations/`). This spec does not invent a new voice — it extends the existing one into a new product surface.

---

## 1. Summary

Inceptio is adding a **daily timing note** to the home screen as the daily-return hook. The existing product is episodic (you pick a wedding date once and leave); the daily note gives every user — including brand-new users with no saved searches — a reason to open the app each day.

The daily layer has **two stacked elements**:

1. A **general daily note** — shown to everyone. Headline + one supporting line. Pulled from a library of 20 exemplar phrasings spanning four day-quality buckets.
2. A **per-saved-search status line** — shown additionally for users who have saved searches. Countdown / in-window / new-window-alert / post-window variants.

The core risk this spec solves is **horoscope drift**. A daily note can easily collapse into mood/fate prediction ("you'll feel confident today", "luck is on your side"), which is Co-Star's and CHANI's territory. Inceptio's differentiator is **electional**: timing of *actions*, not prediction of *feelings*. The five boundary tests in §2 are the formal mechanism that keeps every line on the electional side of that boundary.

**Handoff targets** (full handoff in §11):
- **Architecture session** — picker logic, horizon verification, dictionary loading, vague-variant fallbacks for concrete-horizon entries.
- **Claude Design** — state matrix (§8) with 24 fully-rendered composition cells, character limits (§7), and the emphasized-states block (§8.3) calling out the emotional-peak surfaces that need accent treatment.
- **Lint / test suite** — golden file with must-pass / must-fail cases for the five boundary tests AND the 3-day horizon rule's daily-note / status-line asymmetry.
- **Astrologer review** — sign off on the 20-entry phrase library before launch (~2 hours, per `CLAUDE.md`).

---

## 2. The Electional / Horoscope Boundary Rule

A usable five-test check. Every daily-layer phrasing — library entry, status line, empty-state invite — must pass all five. If one fails, rewrite.

### 2.1 The five tests

**1. Subject test — the grammatical subject is TIME or AN ACTION, not the reader.**

Allowed subjects: *today, the morning, the day, the afternoon, this stretch, a window, signing, starting, leaving, Venus, Mercury, the Moon, the sky.*

Forbidden subjects: *you, the universe, the stars, luck, fate, destiny.*

**Imperative addendum.** Imperatives can hide the subject. The rule of thumb:

- Imperatives about an **action in time** pass: *"hold off on signing", "time the call for later", "save the launches for stronger days".* The subject is implicitly an action and a moment.
- Imperatives about the reader's **inner state** fail: *"embrace today", "open yourself to", "be present", "make the most of", "trust the process", "let yourself…"*. The subject is implicitly the reader's psyche — mood-coaching, not electional.

**2. Verb test — the verb describes a moment's quality or recommends an action. It does not predict a feeling, promise an outcome, or attribute agency to the cosmos.**

Allowed verbs: *is, suits, favors, rewards, asks for, holds, gathers, runs clear, makes room, good for, hold off on, time for, wait out.*

Forbidden constructions: *you'll feel, you'll find, luck is on your side, the universe wants, the stars favor you, manifest, align with, tap into, let yourself.*

**3. Expiry test — when the named moment passes, the claim must stop applying.**

- "A clear day for plain words" — expires at midnight, electional. ✓
- "You are a clear communicator" — never expires, *natal* (timeless). Not for this product. ✗
- "This week asks for patience" — expires Sunday, electional. ✓
- "Patience is your gift" — never expires, *natal*. Not for this product. ✗

> *Note on the test's framing.* The expiry test is the boundary between **electional** (time-bound claims about moments) and **natal / timeless** claims about character. Natal astrology — the kind that says "you are X" — is a legitimate tradition in its own right; it just belongs to a different product (Co-Star, CHANI). It is not "wrong astrology"; it is the wrong *kind* of astrology for Inceptio. The test rejects timeless claims because they don't serve electional timing, not because they're false.

**4. Action test — after reading, the reader can DO something different.**

Schedule, defer, choose, start, hold off, wait. If the only response is "feel seen", "I needed that", or "good to know", it's horoscope.

**5. Forbidden-words test — `CLAUDE.md`'s locked list plus five new bans specific to this format.**

From `CLAUDE.md` (still locked):
*magic, destiny, fortune, stars align, manifest, energy (as noun), vibes, alignment (new-age sense), blessed.*

Added for the daily layer:
*the universe, luck, you'll feel/have/find, today is your [day/moment], let yourself.*

### 2.2 Worked examples

| Draft | Verdict | Rewrite |
|---|---|---|
| "Today you'll find clarity." | ✗ Subject (you), Verb (you'll find), Expiry (never expires) | "A clear day for plain words." |
| "The universe wants you to begin." | ✗ Subject (the universe), Verb (wants), Forbidden word | "A day with room to begin." |
| "Today is your lucky day." | ✗ Forbidden ("luck"), Expiry | "A small lift in the sky today — good for short asks." |
| "Embrace today's quiet." | ✗ Imperative about inner state | "A quiet day for tending — good for follow-ups and edits." |
| "Trust the process — let yourself be ready." | ✗ Action (only a vibe), Forbidden ("let yourself") | "Hold the big asks — clearer days are within reach." |
| "Hold off on signing anything important until Thursday." | ✓ All five | ship as-is (if Thursday verifies ≤3 days; see §5) |
| "Quiet morning, clearer after noon — time the important calls for later." | ✓ All five | ship as-is |
| "Venus is muted today — a stretch for tending what already exists, not starting." | ✓ All five | ship as-is |

---

## 3. Phrase Library (Fork A)

20 exemplar phrasings, one per ID, across four day-quality buckets. Each entry is a finished headline + supporting line *as a template*; the architecture session wires factor-id matching to entry selection.

### 3.1 Entry schema

Each library entry carries:

```ts
{
  id: string;                           // stable identifier, e.g. "good-venus-warm"
  quality_bucket: "strong" | "good" | "mixed" | "closed";
  headline: string;                     // ≤ 48 chars
  supporting_line: string;              // ≤ 140 chars
  horizon_class: "static"               // no future-pointing phrase
                | "vague"               // "clearer days", "better days are nearby"
                | "concrete-date"       // names a day/date within ≤ 3 days
                | "intraday";           // within the current day (e.g. "after noon")
  dominant_factors_hint: string;        // PROVISIONAL — see note below
  surface: "daily-note";                // see §5.3 asymmetry note; status-line entries carry surface: "status-line"
  needs_vague_fallback: boolean;        // true for any concrete-date entry
}
```

> **PROVISIONAL note on `dominant_factors_hint`.** Every hint in this section is a **provisional suggestion** for the architecture session, NOT a finished selection contract. The architecture session must harden these hints into precise selection rules (which factor ids + statuses + weight classes trigger which entry, including tie-breaking, fallback chains, and the floor / ceiling for quality-bucket assignment from raw scores). **Do not treat the hint as a complete spec — it is a starting point for the picker design, not its output.**

### 3.2 Quality bucket thresholds

| Bucket | Score range | Notes |
|---|---|---|
| Strong | 75 + | Rare in practice (real Kyiv data: highest score observed ≈ 72). Celebrate band. |
| Good | 60 – 74 | The realistic win-state. The design's emotional target. |
| Mixed / Caution | 40 – 59 | Needs Fork B strategies (see §4). |
| Closed-by-exclusion | any | Excluded ranges (Moon void, retrograde, eclipse, malefic-on-angle) dominate today. Takes precedence over raw score. |

The 5 API grade bands (`poor / caution / fair / good / strong / exceptional`) are collapsed to 4 buckets for copy purposes. `Strong` and `exceptional` share the same emotional register. The raw `poor` 0–39 band almost never appears in real data without an excluded range; the truer poor-day case is `closed-by-exclusion`.

### 3.3 The 21 entries

#### Strong (75+) — rare, celebrate

**Entry 1 — `strong-sky-is-clear`**
- Headline: *"A wide-open day — the sky is clear."*
- Supporting line: *"Good for big asks, launches, and decisions you've been holding. Few days like this in a season."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — ≥ 6 factors PASS, no factor FAIL, no excluded ranges
- needs_vague_fallback: false

**Entry 2 — `strong-venus-jupiter-pair`**
- Headline: *"A rare, full-handed day."*
- Supporting line: *"Venus and Jupiter both in good standing — good for promises, partnerships, and starting things meant to last."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `venus_dignified_direct_well_aspected` PASS + `jupiter_angular_or_aspecting` PASS, both at weight_class ≥ high
- needs_vague_fallback: false

**Entry 3 — `strong-ruler-in-motion`**
- Headline: *"A bright day for setting things in motion."*
- Supporting line: *"The kind of stretch worth using on something you've been waiting for. Good for nearly anything you've been putting off."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `asc_ruler_strong` PASS + `house_ruler_dignified_well_placed` PASS + `jupiter_angular_or_aspecting` PASS
- needs_vague_fallback: false

#### Good (60–74) — the realistic win, the emotional target

**Entry 4 — `good-venus-warm`**
- Headline: *"A tender day for beginnings."*
- Supporting line: *"Venus is warm and dignified — good for soft conversations, small promises, and first steps. Hold the heaviest signings for clearer days."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — `venus_dignified_direct_well_aspected` PASS as the highest-weight factor
- needs_vague_fallback: false (already vague)

**Entry 5 — `good-mercury-clear`**
- Headline: *"A clear day for plain words."*
- Supporting line: *"Mercury runs clear — good for signing, sending, and saying what you mean. A workable stretch for paperwork."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `mercury_dignified_direct_not_combust` PASS as the highest-weight factor
- needs_vague_fallback: false

**Entry 6 — `good-moon-steady`**
- Headline: *"A steady day for what already exists."*
- Supporting line: *"The Moon holds its shape — good for tending ongoing work, follow-ups, and keeping promises already made."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `moon_waxing_increasing_light` PARTIAL or `moon_and_asc_ruler_in_good_aspect` PASS; no strong "beginnings" factor
- needs_vague_fallback: false

**Entry 7 — `good-jupiter-room-to-grow`**
- Headline: *"A day with room to grow."*
- Supporting line: *"Jupiter is in view — good for asking for more than you usually would. Workable for launches, applications, and openings."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `jupiter_angular_or_aspecting` PASS as the highest-weight factor
- needs_vague_fallback: false

**Entry 8 — `good-moon-toward-benefic`**
- Headline: *"A day for going further."*
- Supporting line: *"The Moon moves toward a kind meeting — good for reaching out and conversations meant to land well."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `moon_applying_to_benefic` PASS as the highest-weight factor
- needs_vague_fallback: false
- **Domain-expert revision** ⚠ — original supporting line ("good for trips, calls…, and small departures") conflated Moon-applying-to-benefic doctrine with Moon-as-traveler doctrine (Lilly Bk III on travel — separate principle). Generalized to relational/benefic-aspect actions; travel-specific actions belong to a future Moon-as-traveler entry if needed.

**Entry 9 — `good-moon-asc-accord`**
- Headline: *"A day of quiet accord."*
- Supporting line: *"The Moon and the planet that stands for you are in good aspect — good for mutual decisions, joint paperwork, and meeting halfway."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `moon_and_asc_ruler_in_good_aspect` PASS as the highest-weight factor
- needs_vague_fallback: false

#### Mixed / Caution (40–59) — needs Fork B strategies

**Entry 10 — `mixed-mercury-clear-jupiter-absent`**
- Headline: *"A day for plain words, not big asks."*
- Supporting line: *"Mercury runs clear, but Jupiter is absent — good for short messages and follow-ups; hold the big proposals for clearer days."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — `mercury_dignified_direct_not_combust` PASS + `jupiter_angular_or_aspecting` FAIL
- needs_vague_fallback: false
- **Post-hardening revision** ⚠ — original supporting line ended with "later in the week", which under the §5 hardened 3-day rule is a soft-concrete week reference and should be vague. Changed to "clearer days". Flagged for your review.

**Entry 11 — `mixed-venus-gentle-saturn-near`**
- Headline: *"Workable, with patience."*
- Supporting line: *"Venus is gentle but Saturn is nearby — good for finishing what's started; hold off on starting anything new today."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `venus_dignified_direct_well_aspected` PARTIAL + `house_free_of_malefic` PARTIAL or FAIL (Saturn present)
- needs_vague_fallback: false

**Entry 12 — `mixed-moon-void-until-noon`**
- Headline: *"A quieter morning, clearer after noon."*
- Supporting line: *"The Moon is between aspects until midday — time important calls for the afternoon."*
- horizon_class: `intraday`
- dominant_factors_hint: PROVISIONAL — intraday moon-void or moon-via-combusta ending before today's evening; the picker must verify intraday timing exists for today specifically
- needs_vague_fallback: true (when intraday horizon can't be computed cheaply, fall back to entry 13 or 20)

**Entry 13 — `mixed-moon-steady-sky-thin`**
- Headline: *"A day for tending, not building."*
- Supporting line: *"The Moon is steady but the sky is thin — good for follow-ups, edits, and small corrections. Save the launches for stronger days."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — `moon_waxing_increasing_light` PASS but most other dominant factors FAIL or PARTIAL
- needs_vague_fallback: false

**Entry 14 — `mixed-venus-bright-mercury-dim`**
- Headline: *"A mixed day — choose carefully."*
- Supporting line: *"Venus is bright but Mercury is dim — good for soft conversations; hold the signed paperwork."*
- horizon_class: `static`
- dominant_factors_hint: PROVISIONAL — `venus_dignified_direct_well_aspected` PASS + `mercury_dignified_direct_not_combust` FAIL
- needs_vague_fallback: false

#### Closed-by-exclusion — Moon void / retrograde / eclipse / malefic-on-angle dominates

**Entry 15 — `closed-moon-voc`**
- Headline: *"The Moon is between signs today."*
- Supporting line: *"A stretch where new starts don't take root — good for finishing, sorting, and waiting. Better days are nearby."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — `excluded_range` with `reason_id === "moon_voc"` covering today's daylight hours
- needs_vague_fallback: false

**Entry 16 — `closed-mercury-retrograde`**
- Headline: *"Mercury is sleeping."*
- Supporting line: *"Words need extra care until Thursday — good for re-reading and editing; hold the heavy signing for clearer days."*
- horizon_class: `concrete-date`
- dominant_factors_hint: PROVISIONAL — `excluded_range` with `reason_id === "mercury_retrograde"` AND Mercury direct-station date is ≤ 3 days away
- needs_vague_fallback: **true** — when Mercury direct station is > 3 days away, picker must fall back to a vague-variant ("Mercury is sleeping. Words need extra care for now — good for re-reading and editing; hold the heavy signing for clearer days.") that the architecture session will draft alongside this entry
- **Post-hardening revision** ⚠ — original headline read "Mercury is sleeping this week" and supporting line ended with "next week". The §5 hardened 3-day rule rejects both. Headline tightened to remove time frame; "next week" → "clearer days". Flagged for your review.

**Entry 17 — `closed-venus-retrograde`**
- Headline: *"Venus is resting."*
- Supporting line: *"A long quiet stretch for matters of the heart — good for tending what already exists; new commitments can wait."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — `excluded_range` with `reason_id === "venus_retrograde"` covering today
- needs_vague_fallback: false
- **Post-hardening revision** ⚠ — original headline read "Venus is resting this season" and supporting line ended with "not a season for new commitments". The §5 hardened 3-day rule rejects "this season" as a forbidden long-horizon promise that trains skipping. Both instances dropped. Flagged for your review.

**Entry 18 — `closed-eclipse-window`**
- Headline: *"An eclipse week — the sky asks for stillness."*
- Supporting line: *"Hold off on starts and big decisions while the eclipse passes. Better days are within reach."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — `excluded_range` with `reason_id === "eclipse_window"` covering today
- needs_vague_fallback: false
- **Post-hardening revision** ⚠ — original supporting line read "for the next few days". Ambiguous and potentially > 3 days. Changed to "while the eclipse passes" (which the user can verify each day by checking back). Flagged for your review.

**Entry 19 — `closed-malefic-on-angle`**
- Headline: *"A difficult planet sits on the angles today."*
- Supporting line: *"A charged stretch — better used for closing things than starting them. Tomorrow opens cleaner."*
- horizon_class: `concrete-date`
- dominant_factors_hint: PROVISIONAL — `excluded_range` with `reason_id === "malefic_on_angle"` covering today AND the malefic moves off the angle by tomorrow
- needs_vague_fallback: **true** — when the malefic remains on the angle past tomorrow, picker must fall back to a vague-variant ("Tomorrow opens cleaner" replaced with "Clearer days are within reach") that the architecture session will draft alongside this entry. "Tomorrow" is always ≤ 3 days and so within the rule, but the architecture must still verify the malefic actually clears by tomorrow.

**Entry 20 — `closed-long-quiet-stretch`**
- Headline: *"A long quiet stretch in the sky."*
- Supporting line: *"Not a day for new starts — good for sorting, naming, and getting your list straight before clearer days arrive."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — extended period of multiple overlapping excluded ranges or persistently low scores; the default closed-by-exclusion fallback when no single named reason dominates
- needs_vague_fallback: false (this IS the fallback)

**Entry 21 — `closed-moon-via-combusta`** *(added per domain-expert audit)*
- Headline: *"A more difficult Moon today."*
- Supporting line: *"The Moon walks the via combusta — good for closing things, sorting, and waiting. Better days are nearby."*
- horizon_class: `vague`
- dominant_factors_hint: PROVISIONAL — `excluded_range` with `reason_id === "moon_via_combusta"` covering today
- needs_vague_fallback: false
- **Domain-expert addition** ⚠ — `moon_via_combusta` is a reason_id present in `excluded-reasons.ts` (and listed in CLAUDE.md) but was uncovered by entries 15–20. Entry 15's "between signs" phrasing is VoC-specific; via combusta is the Moon in late Libra / early Scorpio, traditionally a charged stretch. This entry uses the CLAUDE.md-aligned translation ("walks the via combusta") in the supporting line so the daily note and moment-detail surfaces speak with one voice. Astrologer review (§11.4) should confirm the consumer-voice phrasing.

### 3.4 Summary of post-hardening revisions

Four entries were revised between the brainstorm review and this spec to bring them into compliance with the §5 hardened 3-day rule:

| Entry | What changed | Why |
|---|---|---|
| #10 | "later in the week" → "clearer days" | Soft-concrete week reference; vague is safer |
| #16 | Headline lost "this week"; supporting line: "next week" → "clearer days" | "Next week" is forbidden as concrete > 3 days; headline tightened for consistency |
| #17 | "this season" dropped from both headline and supporting line | Season-long horizon trains long-skipping; forbidden per §5 |
| #18 | "for the next few days" → "while the eclipse passes" | Ambiguous N-days potentially > 3; the eclipse-bounded phrasing is checkable day-by-day |

Plus two domain-expert revisions and one user-directed revision applied after the §11 audit pass:

| Entry | What changed | Why |
|---|---|---|
| #1 | "the sky makes room" → "the sky is clear" | "Makes room" carries cosmic-agency weight (auditor flag); "is clear" is unambiguously a condition |
| #8 | Supporting line: removed travel-specific actions ("trips… and small departures"); generalized to relational/benefic-aspect actions ("reaching out, asking for things…") | Original conflated Moon-applying-to-benefic doctrine with Moon-as-traveler doctrine — separate principles in tradition |
| #21 | New entry added for `moon_via_combusta` | Previously uncovered excluded-range case; entry 15's "between signs" phrasing is VoC-specific and doesn't fit via combusta |
| #8 | Supporting line trimmed from 145 → 98 chars: dropped the most instrumental of three near-synonymous actions ("asking for things you've been meaning to ask"); kept "reaching out" and "conversations meant to land well" — the phrasings most consonant with the headline | Lint-library test (§11.3) flagged the 145-char overflow against the 140 hard max; the trim resolves it without altering the doctrine fix made in the prior #8 revision |

These revisions are flagged so a reviewer can push back if the original phrasing was load-bearing for a reason. The astrologer-review pass (§11.4) should also check these specifically.

### 3.5 Activity eyebrow phrases (2026-06-02 — D3 Decision 1 Path B)

Added alongside the default activity preference feature (`docs/superpowers/specs/2026-06-02-activity-preference.md` §7 + plan Task 1.2 + plan Task 5.1). The daily-note hero gains a **tappable activity-line** between the date eyebrow and the headline, rendering one of these four phrases:

| Activity | Eyebrow phrase | Char count |
|---|---|---|
| `wedding` | *"for your wedding"* | 16 |
| `contracts` | *"for your contracts"* | 18 |
| `business_launch` | *"for your launch"* | 15 |
| `travel` | *"for your travels"* | 16 |

**Voice-check pass:**
- All four start with the same prepositional frame (`for your …`) — visual rhythm matches the three-tier hierarchy (eyebrow → activity-line → headline).
- Singular for wedding / launch (each a single event); plural for contracts (a partnership document set typically signed across two parties) and travels (a journey across stops). Singular vs plural is a per-activity intuition call, not a tradition claim.
- No forbidden words. No future-pointing. No agency / cosmic-weight verb.
- All ≤ 20 chars to keep the line short and visually anchored against the longer headline below.

**Where the strings live in code.** Source-of-truth in this voice spec (above). Mirrored to `apps/mobile/src/lib/activities.ts` as `ACTIVITY_EYEBROW_PHRASES`. Verify-in-sync discipline: when this section ships a revision (astrologer review or copy refinement), update both surfaces in the same PR.

**Astrologer-review scope (§11.4 addendum):** these four phrases are standalone framing copy, not factor-keyed entries. Review is for tone consistency with the §3.3 library; the phrases do not assert sky claims and so do not gate launch as BLOCKING items. Add to the "Important items (likely keep but verify — these do NOT gate launch)" section of §11.4.

**Not in scope here:**
- Activity-line **chevron + tap behavior** is implementation-level — design is fixed in feature spec §7 + plan Task 5.1.
- Activity-line **rendering when `hydrationStatus !== 'set'`** is governed by the gate cascade in feature spec §3 + §4; voice spec only owns the copy.

---

## 4. Unfavorable-Day Strategies (Fork B)

Real-world data: scores rarely exceed 72; many days are weak; many fully blocked. A daily note that says "bad day, don't try" every day trains users to stop opening the app. Fork B answers: **how do we stay honest about the sky while keeping the note worth reading?**

### 4.1 The principle — Specificity over verdict

Not a peer strategy. The underlying rule that makes the other strategies work: **never deliver a verdict on the day; name what it suits and what it doesn't.**

Verdicts ("bad day", "not recommended") fail the action test (§2.1 test 4) — the user has nothing to *do* with "bad". Specificity gives them somewhere to put the day:

- ✗ Verdict: "A poor day. Don't start anything."
- ✓ Specificity: "A day for sorting and naming, not building or starting."

Every Fork B example threads through this principle.

### 4.2 Strategy 1 — Redirect (the workhorse)

**When:** the day has mixed factors with at least one positive.

**Shape:** "Not a day for X — good for Y."

**Examples** (from library entries 10, 13, plus one new):

- "A day for plain words, not big asks. Mercury runs clear, but Jupiter is absent — good for short messages and follow-ups; hold the big proposals for clearer days."
- "A day for tending, not building. The Moon is steady but the sky is thin — good for follow-ups, edits, and small corrections."
- "Workable for paperwork, not for promises. Mercury is direct but Venus is muted — good for signing and sending; hold the personal asks."

**Strength:** electional in its bones — names two different action shapes the day fits and doesn't.

**Failure mode:** requires the picker to find at least one positive factor. When the day is uniformly poor, fall through to Strategy 2 or the closed-by-exclusion library.

### 4.3 Strategy 2 — Look-ahead (the relief valve)

**When:** the day is genuinely weak AND a concrete near horizon exists, OR no horizon exists but a vague pointer is still honest.

**Shape:** specificity for today + a forward pointer (concrete or vague).

**Examples** (from entries 12, 16, 19, 20):

- "A quieter morning, clearer after noon." (intraday horizon)
- "Mercury is sleeping. Words need extra care until Thursday — good for re-reading and editing; hold the heavy signing for clearer days." (concrete-date horizon)
- "A difficult planet sits on the angles today. A charged stretch — better used for closing things than starting them. Tomorrow opens cleaner." (next-day horizon)
- "A long quiet stretch in the sky. Not a day for new starts — good for sorting, naming, and getting your list straight before clearer days arrive." (vague horizon)

**Strength:** keeps the daily note honest about today while giving the user a place to put their attention.

**Failure mode — and the constraint that follows from it:** lying about a horizon the picker can't actually verify, OR naming a horizon so far out that users skip the intervening days.

**The 3-day rule applies here.** See **§5 for the formal constraint + lint definition.** This subsection USES the rule; §5 DEFINES it. Treat them as one rule with two homes, not two rules. In short: any concrete day/date named in a daily-note supporting line must be ≤ 3 days from today, and the picker must verify it before substituting; otherwise the entry's vague-variant fallback renders.

### 4.4 The cut — "Reframe as permission" ("Rest is a choice too")

**Cut explicitly. Replaced, not deleted.**

Why it fails the boundary rule:

- **Action test** (§2.1 test 4): the only response is "feel validated". You can't *do* "rest is a choice"; it's a feeling-frame. ✗
- **Subject test** (§2.1 test 1, imperative addendum): "Rest is a choice too" hides an imperative about the reader's inner state ("permit yourself to rest"). Mood-coaching, not electional. ✗
- **Voice register:** drifts into wellness-influencer / self-care territory. Adjacent to but distinct from CHANI/Co-Star — and either way, not the thoughtful-friend-who-knows-astrology voice `CLAUDE.md` locks.

**The concern is real.** Permission tried to solve a genuine problem: a daily note that just says "today is bad" trains users away. We need a replacement that addresses the same concern without horoscope drift.

**The replacement: Specificity + Vague-horizon Look-ahead.** When the day is truly dead, name something low-stakes the day still *is* good for (administrative work the sky can't ruin: sorting, naming, listing, editing, re-reading, getting your list straight), paired with an honest acknowledgment that clearer days are nearby. Example pattern from library entries 15 and 20:

> *"The Moon is between signs today. A stretch where new starts don't take root — good for finishing, sorting, and waiting. Better days are nearby."*

> *"A long quiet stretch in the sky. Not a day for new starts — good for sorting, naming, and getting your list straight before clearer days arrive."*

This solves what permission tried to solve — the user always has *something* to do with the day, and the note doesn't end on a verdict — without crossing into mood validation.

### 4.5 The unfavorable-day decision tree

The architecture session inherits this tree, **evaluated in order**:

1. **Day is closed by a named exclusion (Moon void, via combusta, retrograde, eclipse, malefic-on-angle)** → Closed-by-exclusion library (entries 15–21). These name the *exclusion* as the texture — itself a form of specificity. **Precedence rule:** this branch takes priority over branches 2–4 whenever both apply. Naming the cause beats naming generic weakness — and in real data, a day during Venus retrograde frequently *also* has weak factors generally; picking the named-exclusion entry is more informative than picking the generic-weakness entry.
2. **Day has at least one positive factor** → Strategy 1: Redirect (entries 10, 11, 13, 14).
3. **Day is uniformly weak AND a concrete horizon verifies within ≤ 3 days** → Strategy 2: Look-ahead with concrete horizon (entry 12 intraday, entry 16 concrete-date, entry 19 next-day).
4. **Day is uniformly weak AND no concrete horizon verifies** → Strategy 2: Specificity + vague-horizon look-ahead (entries 13, 15, 17, 18, 20). The permission replacement.

The tree is encoded as **provisional** in the architecture sense — the exact boundary between branches (e.g. what counts as "at least one positive factor"? what's the minimum score gap for "uniformly weak"?) must be hardened during the picker design. The branch-1-wins precedence rule, however, is **not provisional** — it's a domain-expert finding and should ship as the tree's first-evaluated branch.

---

## 5. The 3-Day Horizon Rule + Daily-Note / Status-Line Asymmetry

### 5.1 The rule

> **Concrete-horizon phrases in the daily note may render ONLY when the verified horizon is ≤ 3 days from today. Beyond 3 days, render the entry's vague-variant fallback. There is no exception.**

**Allowed concrete-horizon scopes on the daily-note surface:**
- "today"
- "tomorrow"
- "in N days" where N ≤ 3
- day-of-week name (e.g. "Thursday") ONLY if that day ≤ 3 days from today
- "this afternoon" / "later today" / "after noon" (intraday — always within the rule)

**Forbidden as concrete in the daily note (must render as vague):**
- "next week"
- "later this month"
- "after the retrograde station"
- "this season"
- "for the next few days" (ambiguous N; treat as forbidden)
- any day-of-week name where that day is > 3 days away

**Required vague substitutes (always safe):**
- "clearer days are nearby"
- "better days are within reach"
- "a stronger stretch is ahead"
- "for now" (for ongoing conditions)

### 5.2 Threshold reasoning

3, not 4. A 3-day named horizon means at most **2 intervening days** where the user might wait — within the gap a daily check-in habit can sustain. A 4-day horizon (3 intervening days) starts to break the habit. The threshold is **a hard retention constraint, not a style preference.** Tunable parameter the architecture session may revisit if data shows otherwise; until then it ships as 3.

### 5.3 The daily-note / status-line asymmetry — CRITICAL

> **The 3-day rule applies ONLY to the `surface: "daily-note"` surface. It does NOT apply to the `surface: "status-line"` for saved searches.**

**Why the asymmetry.** Saved-search status lines display information the user *opted into* — they've saved this moment and want to know when it is. Naming "Thursday" or "late November" for a saved wedding window is informational, not retention-eroding. The user opted in by saving.

The general daily note, by contrast, is a hook. Forward-pointing horizons in the hook train skipping. The rule guards the hook context only.

**How the asymmetry is encoded.** Every library entry and every status-line phrase carries a `surface` field. The lint reads this field. Without it, the lint cannot tell which rule to apply, and a future Claude session could "correct" a perfectly valid status line that names a 5-day-away Thursday — breaking a feature it didn't understand.

### 5.4 Lint integration

The lint rule lives in the translation-layer test suite (`workers/api-proxy/src/translations/__tests__/`), alongside the golden-file tests for `factors.ts`.

**Golden test fixtures** the lint must verify:

```ts
// Must-PASS fixtures
{
  id: "lint-pass-statusline-5day-named-day",
  surface: "status-line",
  phrase: "Wedding window — Tuesday.",
  today_offset_days: 5,         // Tuesday is 5 days away
  expected: "pass",             // status-line surface → 3-day rule does not apply
  reason: "Status lines are user-opted-in; the 3-day rule applies only to the daily-note surface."
}
{
  id: "lint-pass-dailynote-2day-named-day",
  surface: "daily-note",
  phrase: "Words need extra care until Thursday — hold the heavy signing for clearer days.",
  today_offset_days: 2,         // Thursday is 2 days away
  expected: "pass",
  reason: "Concrete horizon ≤ 3 days; allowed."
}
{
  id: "lint-pass-dailynote-vague-fallback",
  surface: "daily-note",
  phrase: "Words need extra care for now — hold the heavy signing for clearer days.",
  today_offset_days: 10,         // not applicable; vague phrase
  expected: "pass",
  reason: "Vague horizon; always allowed."
}

// Must-FAIL fixtures
//
// The `phrase` strings below are NEGATIVE EXAMPLES — they demonstrate what
// the lint must reject. They are NOT current §3.3 library entries. Several
// were chosen to mirror pre-hardening versions of current entries (the rule
// the spec hardened against), so the test catches exactly the regression we
// guarded against.
{
  id: "lint-fail-dailynote-5day-named-day",
  surface: "daily-note",
  phrase: "Words need extra care until Tuesday — hold the heavy signing for clearer days.",
  today_offset_days: 5,
  expected: "fail",
  reason: "Concrete horizon > 3 days on daily-note surface; must render vague fallback."
}
{
  id: "lint-fail-dailynote-next-week",
  surface: "daily-note",
  phrase: "Hold the big proposals for next week.",
  today_offset_days: null,
  expected: "fail",
  reason: "Forbidden phrase 'next week' on daily-note surface."
}
{
  // NEGATIVE EXAMPLE — this is the pre-§3.4-revision phrasing of Entry 17.
  // Entry 17's CURRENT phrasing is "Venus is resting." (no "this season").
  // The fixture exists to guard against regression to the §3.4-removed wording.
  id: "lint-fail-dailynote-this-season",
  surface: "daily-note",
  phrase: "Venus is resting this season.",
  today_offset_days: null,
  expected: "fail",
  reason: "Forbidden phrase 'this season' on daily-note surface."
}
{
  id: "lint-fail-dailynote-imperative-inner-state",
  surface: "daily-note",
  phrase: "Embrace today's quiet — be present with what is.",
  today_offset_days: null,
  expected: "fail",
  reason: "Imperatives about inner state fail the subject test (§2.1)."
}
```

The asymmetry between the first two PASS fixtures (status-line 5-day passes; daily-note 5-day FAILS in the parallel third FAIL fixture) **encodes the rule as a test**. Future Claude sessions running the lint cannot "fix" the asymmetry because the test would fail.

---

## 6. Empty State + Saved-Search Status Line (Fork C)

### 6.1 Empty-state separation

**Decision:** the daily note stays voice-pure for ALL users — new and returning. The "create your first search" invite lives in a **separate UI element** beside the daily note, present only when `saved_searches.length === 0`.

**Why.** If every daily note a new user sees has a CTA welded onto it, the note reads as an ad and the hook stops being a hook. Conversion is real, but separating the affordance from the voice preserves the daily note as the universal hook and the invite as a distinct, non-naggy element.

### 6.2 Empty-state invite copy

**Primary (recommended):**

> *"Choose a moment of your own →"*  *(28 chars)*

**Alternatives** (architecture session may select based on UI affordance preference):

| Variant | Length | Notes |
|---|---|---|
| "For a moment of your own — choose what to begin →" | 49 chars | Slightly more product-explaining |
| "When a specific moment matters, choose what to look at →" | 55 chars | Longest; most explicit about intent |
| "For a specific moment — yours to choose →" | 41 chars | Shorter; less explicit |

The primary keeps the voice consistent ("a moment of your own" mirrors the existing register), reads as a soft invitation (no urgency word), and is short enough to live as a quiet line under the daily note without competing for attention.

### 6.3 Status-line library

Pattern: `[Activity-noun] window — [temporal phrase].`

**Activity nouns** (for status lines):
- `wedding` → "Wedding window"
- `contracts` → "Contract window"
- `business_launch` → "Launch window"
- `travel` → "Travel window"

(Note: "Travel window" matches existing voice in `headlines.ts` and `NO_VIABLE_HEADLINES.travel`. Earlier drafts proposed "Trip window" for warmth/length, but code-archaeology audit flagged it as new vocabulary not present in existing voice. "Travel" wins on continuity.)

#### 6.3.1 Pre-window (countdown)

| When | Status line | Horizon class |
|---|---|---|
| Within the window today | "Your wedding window opens today." | static |
| Tomorrow | "Wedding window — tomorrow." | static |
| 2–3 days away | "Wedding window — in 2 days." OR "Wedding window — Thursday." | concrete |
| 4–7 days away | "Wedding window — later this week." | vague (≤ week-bounded) |
| 8–14 days away | "Wedding window — about a week away." | vague |
| 15–30 days away | "Wedding window — about 3 weeks away." | vague |
| 31–90 days away | "Wedding window — late November." | semi-concrete (month) |
| 90+ days away | "Wedding window — winter." OR "Wedding window — November." | semi-concrete (season or month) |

**The 3-day rule does NOT apply here** (see §5.3 asymmetry). Status-line context is exempt.

#### 6.3.2 In-window — EMPHASIZED (see §8.3)

The saved moment is happening RIGHT NOW. This is the emotional peak of the product.

| State | Status line |
|---|---|
| Window is open, > 1 hour left | "You're inside your wedding window." |
| Window is open, ≤ 1 hour left | "Wedding window — open for another hour." |
| Window is open, ≤ 15 minutes left | "Wedding window — closing soon." |

These three lines **must not render as a grey chip like the standard countdown.** They get deliberate accent treatment from Claude Design (gold rim, slightly elevated card, brief warmth — design's call, but it must not be neutral). See §8.3.

#### 6.3.3 New-window alert — EMPHASIZED (see §8.3)

Fired when a daily recalc surfaces a window that is *better than the previously known best window for this saved search*. Lasts 48 hours from surface, then collapses to the standard countdown line.

| Case | Status line |
|---|---|
| Concrete day ≤ 3 days away (status-line rule allows, but we keep this conservative) | "A stronger wedding window — Thursday afternoon." |
| Concrete day in 4–14 days | "A stronger wedding window — Thursday next week." |
| 14+ days, semi-concrete | "A stronger wedding window — late November." |
| No close horizon | "A clearer wedding window opened in your search." |

These also need accent treatment (a small "new" indicator, gentle pulse — design's call). See §8.3.

#### 6.3.4 Post-window

| When | Status line |
|---|---|
| ≤ 7 days since window closed | "Your wedding window has passed. Choose another?" |
| 7–30 days since closed | "Your search closed in March. Choose another moment?" |
| > 30 days since closed | "An older search — choose another moment to look at?" |

Post-window status lines render **visually muted** (~70% opacity, matching the "Passed" treatment on the Moments tab per `CLAUDE.md`). The voice is gentle but the visual signals "not active".

### 6.4 Multi-search stacking — design constraint

**Hard limit: render at most 3 status lines below the daily note. If `saved_searches.length > 3`, render the top 3 by proximity (in-window > new-window-alert > nearest pre-window > nearest post-window) and a "+N more →" overflow entry to a saved-searches list view.**

**Why a hard limit, not just "designer's preference".** A user with 8 saved searches without a cap pushes the daily note off the screen, breaks visual hierarchy, and turns the home screen into a list view by accident. The brainstorm explicitly asked for a number Claude Design can enforce in layout, not a guideline.

**Ordering rule** (provisional, for the architecture session to harden):

1. Any saved search currently in-window (emphasized).
2. Any saved search with an active new-window alert (emphasized).
3. Saved searches in pre-window state, ordered by ascending days-until-window.
4. Saved searches in post-window state, ordered by ascending days-since-closed.

This ordering pushes the most time-sensitive item to the top — almost always what the user came to check.

---

## 7. Character Limits

For Claude Design's layout work:

| Element | Target | Hard max | Wrap behavior |
|---|---|---|---|
| Daily-note headline (Fraunces display) | ≤ 35 chars | 48 chars | Two-line wrap acceptable on small screens |
| Daily-note supporting line (Inter body) | ≤ 100 chars | 140 chars | Three-line wrap acceptable on small screens |
| Status line (Inter small) | ≤ 38 chars | 48 chars | One-line, no wrap. **Bumped from the original 42-char hard max on 2026-05-29** to accommodate the `none-yet` horizon-precision templates (worst case: `Contract window — none yet through 31 September.` = 48 chars). Required for horizon honesty across surfaces — see PICKER-CONTRACT.md §1 amendment and `dictionary/status-lines.ts` STATUS_NONE_YET block. |
| Empty-state invite (Inter body) | ≤ 40 chars | 48 chars | One-line, no wrap |

Library entries exceeding the hard max are rejected by the lint. All 21 entries in §3.3 fit within these limits.

> **Scoping — read this before applying the lint.** These limits apply to **new daily-note library entries (§3.3) only**. The existing `NO_VIABLE_HEADLINES` at `workers/api-proxy/src/translations/headlines/headlines.ts:65-70` (used on the Today and No-Viable Windows screens, NOT the daily-note surface) contain lines up to 55 chars — *"These days ask for patience — the sky is between rooms."* — which exceed the 48-char headline cap. **Do NOT retroactively apply the daily-note limits to `NO_VIABLE_HEADLINES`.** They are a separate surface with their own constraints (per `headlines.ts` author's prior decisions, locked in CLAUDE.md). The lint must scope itself to `DailyNoteEntry` instances and skip pre-existing top-level headlines.

---

## 8. State Matrix for Claude Design

This section is the design handoff. Every cell renders real content from §3.3 and §6.3, not placeholders.

### 8.1 Element inventory

Four distinct components:

| Component | Presence | Variants | Source |
|---|---|---|---|
| Daily note | **Always present** | 4 quality buckets × 21 library entries | §3.3 |
| Empty-state invite | **Conditional**: `saved_searches.length === 0` | 1 entry, alternatives in §6.2 | §6.2 |
| Saved-search status line | **Conditional**: one per saved search, capped at 3 + overflow | ~14 states | §6.3 |
| Overflow entry ("+N more →") | **Conditional**: `saved_searches.length > 3` | 1 | §6.4 |

### 8.2 Standard composition matrix — 16 cells

4 day-quality buckets × 4 standard scenarios. (The two emphasized scenarios — in-window and new-window-alert — are broken out in §8.3 because they need accent treatment, not standard rendering.)

For readability, the daily-note content is fixed per quality bucket (one library entry chosen per bucket). The scenarios vary the conditional element below the note. In production any library entry from that bucket can render.

**Quality bucket assignments for the matrix:**
- Strong → Entry 1 (`strong-sky-makes-room`)
- Good → Entry 4 (`good-venus-warm`)
- Mixed → Entry 10 (`mixed-mercury-clear-jupiter-absent`)
- Closed → Entry 15 (`closed-moon-voc`)

**Saved-search activity used in scenarios:** `wedding` (most relatable; the pattern repeats for `contracts`, `business_launch`, `travel`).

---

#### Cell 1.A — Strong day, new user (0 saved searches)

```
A wide-open day — the sky is clear.
Good for big asks, launches, and decisions you've been holding.
Few days like this in a season.

Choose a moment of your own →
```

#### Cell 1.B — Strong day, returning user, 1 saved search pre-window (3 days away)

```
A wide-open day — the sky is clear.
Good for big asks, launches, and decisions you've been holding.
Few days like this in a season.

Wedding window — in 3 days.
```

#### Cell 1.C — Strong day, returning user, 1 saved search post-window (just passed)

```
A wide-open day — the sky is clear.
Good for big asks, launches, and decisions you've been holding.
Few days like this in a season.

Your wedding window has passed. Choose another?
```
*(post-window line renders muted, ~70% opacity)*

#### Cell 1.D — Strong day, returning user, 3 saved searches (multi-stack)

```
A wide-open day — the sky is clear.
Good for big asks, launches, and decisions you've been holding.
Few days like this in a season.

Wedding window — in 3 days.
Contract window — about a week away.
Travel window — late November.
```
*(if user had 5 saved, the bottom line would read "+2 more →" instead of "Travel window — late November.")*

---

#### Cell 2.A — Good day, new user (0 saved searches)

```
A tender day for beginnings.
Venus is warm and dignified — good for soft conversations, small
promises, and first steps. Hold the heaviest signings for clearer days.

Choose a moment of your own →
```

#### Cell 2.B — Good day, returning user, 1 saved search pre-window (3 days away)

```
A tender day for beginnings.
Venus is warm and dignified — good for soft conversations, small
promises, and first steps. Hold the heaviest signings for clearer days.

Wedding window — in 3 days.
```

#### Cell 2.C — Good day, returning user, 1 saved search post-window (just passed)

```
A tender day for beginnings.
Venus is warm and dignified — good for soft conversations, small
promises, and first steps. Hold the heaviest signings for clearer days.

Your wedding window has passed. Choose another?
```
*(post-window line muted)*

#### Cell 2.D — Good day, returning user, 3 saved searches

```
A tender day for beginnings.
Venus is warm and dignified — good for soft conversations, small
promises, and first steps. Hold the heaviest signings for clearer days.

Wedding window — in 3 days.
Contract window — about a week away.
Travel window — late November.
```

---

#### Cell 3.A — Mixed day, new user (0 saved searches)

```
A day for plain words, not big asks.
Mercury runs clear, but Jupiter is absent — good for short messages
and follow-ups; hold the big proposals for clearer days.

Choose a moment of your own →
```

#### Cell 3.B — Mixed day, returning user, 1 saved search pre-window (3 days away)

```
A day for plain words, not big asks.
Mercury runs clear, but Jupiter is absent — good for short messages
and follow-ups; hold the big proposals for clearer days.

Wedding window — in 3 days.
```

#### Cell 3.C — Mixed day, returning user, 1 saved search post-window (just passed)

```
A day for plain words, not big asks.
Mercury runs clear, but Jupiter is absent — good for short messages
and follow-ups; hold the big proposals for clearer days.

Your wedding window has passed. Choose another?
```
*(post-window line muted)*

#### Cell 3.D — Mixed day, returning user, 3 saved searches

```
A day for plain words, not big asks.
Mercury runs clear, but Jupiter is absent — good for short messages
and follow-ups; hold the big proposals for clearer days.

Wedding window — in 3 days.
Contract window — about a week away.
Travel window — late November.
```

---

#### Cell 4.A — Closed day, new user (0 saved searches)

```
The Moon is between signs today.
A stretch where new starts don't take root — good for finishing,
sorting, and waiting. Better days are nearby.

Choose a moment of your own →
```

#### Cell 4.B — Closed day, returning user, 1 saved search pre-window (3 days away)

```
The Moon is between signs today.
A stretch where new starts don't take root — good for finishing,
sorting, and waiting. Better days are nearby.

Wedding window — in 3 days.
```

#### Cell 4.C — Closed day, returning user, 1 saved search post-window (just passed)

```
The Moon is between signs today.
A stretch where new starts don't take root — good for finishing,
sorting, and waiting. Better days are nearby.

Your wedding window has passed. Choose another?
```
*(post-window line muted)*

#### Cell 4.D — Closed day, returning user, 3 saved searches

```
The Moon is between signs today.
A stretch where new starts don't take root — good for finishing,
sorting, and waiting. Better days are nearby.

Wedding window — in 3 days.
Contract window — about a week away.
Travel window — late November.
```

---

### 8.3 Emphasized states — accent treatment required (8 cells)

**These states are the emotional peaks of the product. They MUST NOT render as grey status lines like the standard countdown.** Claude Design designs deliberate accent treatment specific to each.

**In-window** = the user's saved moment is happening RIGHT NOW. This is the moment that justifies the whole product. The "your wedding window is open right now, this is the moment you've been waiting for" feeling must be visually celebrated, not buried.

**New-window alert** = a recalc surfaced a better window than the user previously had. This is the "good news" moment — also visually celebrated, distinct from the standard countdown.

**Design direction (not prescription — Claude Design decides specifics):**
- Both emphasized states warrant elevated surface treatment (lift off the surface stack), warmer accent (gold rim or gold-toned background), or subtle motion (one-time pulse, gentle fade-in).
- In-window leans **warm and steady** — the moment has arrived, hold it.
- New-window alert leans **bright and brief** — something new appeared, the alert dies in 48 hours.
- Neither should *flash* or *animate continuously* — this voice is dignified, not promotional.

---

#### Cell 1.E — Strong day, in-window (emphasized)

```
A wide-open day — the sky is clear.
Good for big asks, launches, and decisions you've been holding.
Few days like this in a season.

[ACCENT TREATMENT]
You're inside your wedding window.
```

#### Cell 2.E — Good day, in-window (emphasized)

```
A tender day for beginnings.
Venus is warm and dignified — good for soft conversations, small
promises, and first steps. Hold the heaviest signings for clearer days.

[ACCENT TREATMENT]
You're inside your wedding window.
```

#### Cell 3.E — Mixed day, in-window (emphasized)

```
A day for plain words, not big asks.
Mercury runs clear, but Jupiter is absent — good for short messages
and follow-ups; hold the big proposals for clearer days.

[ACCENT TREATMENT]
You're inside your wedding window.
```

#### Cell 4.E — Closed day, in-window (emphasized)

```
The Moon is between signs today.
A stretch where new starts don't take root — good for finishing,
sorting, and waiting. Better days are nearby.

[ACCENT TREATMENT]
You're inside your wedding window.
```

> **Note on Cell 4.E:** the daily note ("Moon between signs") and the in-window status ("you're inside your wedding window") might appear at odds — the sky is closed but the user's saved moment is open. This is real: the user's saved window is a specific *minute-to-multi-hour span*, the daily note describes the *day* as a whole. The architecture session may want a special-case stitch for this corner ("Your wedding window is open within a quieter day — make the most of it" — except "make the most of it" fails the imperative-inner-state test, so it would need rephrasing). **Flagged for architecture to consider; not designed here.** The default rendering above is correct.

---

#### Cell 1.F — Strong day, new-window alert (emphasized)

```
A wide-open day — the sky is clear.
Good for big asks, launches, and decisions you've been holding.
Few days like this in a season.

[ACCENT TREATMENT]
A stronger wedding window — Thursday afternoon.
```

#### Cell 2.F — Good day, new-window alert (emphasized)

```
A tender day for beginnings.
Venus is warm and dignified — good for soft conversations, small
promises, and first steps. Hold the heaviest signings for clearer days.

[ACCENT TREATMENT]
A stronger wedding window — Thursday afternoon.
```

#### Cell 3.F — Mixed day, new-window alert (emphasized)

```
A day for plain words, not big asks.
Mercury runs clear, but Jupiter is absent — good for short messages
and follow-ups; hold the big proposals for clearer days.

[ACCENT TREATMENT]
A stronger wedding window — Thursday afternoon.
```

#### Cell 4.F — Closed day, new-window alert (emphasized)

```
The Moon is between signs today.
A stretch where new starts don't take root — good for finishing,
sorting, and waiting. Better days are nearby.

[ACCENT TREATMENT]
A stronger wedding window — Thursday afternoon.
```

---

### 8.4 Summary of the 24 cells

| | A: new user | B: pre-window | C: post-window | D: multi-stack | E: in-window* | F: new-window alert* |
|---|---|---|---|---|---|---|
| **Strong** | Cell 1.A | Cell 1.B | Cell 1.C | Cell 1.D | Cell 1.E | Cell 1.F |
| **Good** | Cell 2.A | Cell 2.B | Cell 2.C | Cell 2.D | Cell 2.E | Cell 2.F |
| **Mixed** | Cell 3.A | Cell 3.B | Cell 3.C | Cell 3.D | Cell 3.E | Cell 3.F |
| **Closed** | Cell 4.A | Cell 4.B | Cell 4.C | Cell 4.D | Cell 4.E | Cell 4.F |

\* Columns E and F require accent treatment — see §8.3.

---

## 9. Voice Checklist (Consolidated)

A short list a drafter holds in their head while writing or reviewing a daily-layer phrasing. Extends `CLAUDE.md`'s tone-of-voice rules; does not replace them.

**Run every draft through:**

1. **The five boundary tests** (§2.1) — subject, verb, expiry, action, forbidden-words. Including the imperative addendum: imperatives about *actions in time* pass; imperatives about *inner state* fail.

2. **Voice continuity** — would this phrase belong in `factors.ts` or `headlines.ts` alongside *"Venus brings warmth", "The Moon is gathering light", "A clear day for plain words"*? If it feels foreign next to those, it's drifted. (Cheapest, fastest sniff test.)

3. **Headline rhythm** — fits one of the locked shapes: *"A [quality] day [for X / of Y]."* or *"[Sky-element] [is/does X]."*. If neither, justify.

4. **Supporting-line structure** — recommendation leads ("good for X; hold off on Y"); astrology backs in a short subordinate clause. If astrology drives the headline of the recommendation, restructure.

5. **3-day horizon rule** (daily-note surface only; NOT status-line — see §5.3). Concrete horizons allowed only when verified ≤ 3 days from today. Beyond → vague-only ("clearer days are nearby").

6. **Character limits** — within element hard max. Headline ≤ 48, supporting ≤ 140, status ≤ 42, invite ≤ 48 (§7).

7. **Action over verdict** — name what the day IS for; never end on "bad day", "don't try", or "wait it out". Replace verdicts with specificity, even if the specificity is "good for sorting and naming".

---

## 10. Out of Scope

This spec deliberately does NOT design:

- **How the daily note is computed** — which activity is implied (if any), which raw factors drive entry selection, the picker's selection algorithm, weight thresholds. The `dominant_factors_hint` field is provisional input to the architecture session, not a finished contract.
- **Horizon verification logic** — how the picker confirms a horizon is ≤ 3 days cheaply (calendar of upcoming planetary stations? per-day score lookup? both?). The §5 rule defines what the picker must enforce; how is the architecture session's call.
- **Caching, refresh frequency, credit cost** — daily note refresh policy, KV cache strategy, Cloudflare Worker rate-limit interaction. Architecture session.
- **UI layout** — visual treatment, spacing, typography weights, accent specifics for the emphasized states (§8.3 only directs *intent*, not pixel-level). Claude Design.
- **Push notification copy** — the next feature after this spec. Same voice rules apply; surface differs.
- **Activity-specific status-line variants beyond the four MVP activities** — surgery, agriculture, etc. are deferred to v1.4+.

---

## 11. Handoff

### 11.1 To the architecture session

**Deliverables this spec hands you:**

- The 21 library entries (§3.3) with `quality_bucket`, `horizon_class`, `dominant_factors_hint` (PROVISIONAL), `needs_vague_fallback`, `surface`.
- The status-line library (§6.3) covering pre-window / in-window / new-window-alert / post-window across all four activities.
- The empty-state invite copy (§6.2).
- The unfavorable-day decision tree (§4.5).
- The 3-day horizon rule (§5).
- The asymmetry contract: every entry carries `surface: "daily-note" | "status-line"`; the rule fires only when `surface === "daily-note"` (§5.3).
- The multi-search stacking limit: max 3 status lines + "+N more →" overflow (§6.4).

**What you must design:**

- The picker — which factors trigger which entry. The `dominant_factors_hint` is a starting point, not the answer. The picker must handle: tie-breaking when multiple entries match, score-to-bucket mapping with deterministic boundaries, exclusion precedence over raw score (per §4.5 branch-1-wins rule — not provisional).
- Vague-variant fallbacks for every entry with `needs_vague_fallback: true` (currently entries 12, 16, 19). Same voice, same structure, vague horizon only.
- Horizon verification — how the picker cheaply confirms a named day is ≤ 3 days away AND that the named day's condition holds (e.g. Mercury direct station actually is Thursday).
- Caching and refresh policy for the daily note (out of scope here per §10, but you'll need to design this).
- Status-line ordering — the §6.4 ordering rule is provisional; harden it.
- **Long-condition variation (domain-expert finding, important).** Mercury rx lasts ~3 weeks; Venus rx ~40 days; Mars rx ~80 days. Without variant phrasings within an exclusion bucket, users opening the app daily for 21 consecutive days see the **identical** headline. The vague-variant fallback (`needs_vague_fallback: true`) addresses the horizon-fail case but does NOT solve the same-day-after-day repetition problem. Design 2–3 sibling phrasings per long-running excluded-reason entry (16, 17, plus future Mars/Jupiter/Saturn retrograde entries) that rotate deterministically (e.g. by day-of-month modulo, or by date-seeded hash) so the daily note stays varied. Sibling phrasings stay within the same voice and the same astrological accuracy; they're rephrasings, not new claims.

### 11.2 To Claude Design

**Deliverables this spec hands you:**

- Character limits (§7).
- The element inventory (§8.1): four components, presence (always vs. conditional), variant counts.
- 16 standard composition cells (§8.2) with real content.
- 8 emphasized composition cells (§8.3) flagged for accent treatment.
- The multi-search stacking constraint: max 3 status lines visible, "+N more →" overflow for the rest (§6.4).

**What you must design:**

- The visual treatment of every cell in §8.2 and §8.3 — typography weights, vertical rhythm, spacing.
- The accent treatment for in-window and new-window-alert states (§8.3) — gold rim, elevated surface, brief pulse, your call. The constraint: must not flash, animate continuously, or feel promotional. Dignified celebration, not marketing.
- The visual treatment of post-window status lines (~70% opacity is the spec's suggestion; you may adjust as long as the muted-but-present intent holds).
- The "+N more →" overflow affordance (§6.4) — its position, weight, and the list view it leads to (the list view itself is a separate design task).
- Edge case in Cell 4.E (Closed day + in-window): the daily note and status line are emotionally at odds. The spec leaves stitching to architecture; the visual hierarchy should make the in-window celebration win without erasing the daily note.

### 11.3 To the lint / test suite

**Add to `workers/api-proxy/src/translations/__tests__/`:**

- Golden file `boundary-tests.golden.ts` — the must-pass / must-fail fixtures from §5.4 verifying the five boundary tests AND the 3-day rule's asymmetry between daily-note and status-line surfaces.
- Companion runner `boundary-tests.test.ts` — walks the golden array and asserts each fixture against the lint logic. **This runner is required; the golden file alone is just data.** Pattern note: the existing `__tests__/` uses vitest factory-style helpers (`factor()`, `window_()`, `envelope()`) — the boundary-tests pattern is new (golden-file-driven). Both styles will coexist; the test directory already supports vitest. Follow vitest conventions for the runner (`describe` / `it.each` over the golden array).
- Lint hook on every change to the daily-note library that runs the five boundary tests against new entries.
- Per-entry validation: `headline.length ≤ 48`, `supporting_line.length ≤ 140`, `surface` field present, `horizon_class` field present, `needs_vague_fallback` field present (and if true, the fallback entry must exist). **Scope:** these validations apply to `DailyNoteEntry` instances only — do NOT apply to existing `NO_VIABLE_HEADLINES` in `headlines.ts` (see §7 scoping note).

**The asymmetry test is critical:** the lint must include both a passing status-line case with a > 3-day named day AND a failing daily-note case with the same construction. Without both sides, a future session might "correct" valid status-line content.

### 11.4 To the astrologer review (~3 hours before launch — REVISED UPWARD from 2h)

Per `CLAUDE.md`'s Translation Layer policy, the astrologer reviews this library before it ships. **Time estimate revised from ~2 hours to ~3 hours** following the domain-expert audit pass — the auditor surfaced enough specific items that a deeper review is warranted.

**🚨 LAUNCH-BLOCKING items — must be ruled on before MVP launch**

**These are not review questions. They are decisions that must land, with a recorded ruling, before the daily-note feature can ship.** Domain-expert audit surfaced two phrasings that may misrepresent traditional electional astrology on user-facing surfaces. Because each phrasing appears on BOTH the daily-note (this spec) AND the moment-detail screen (existing `excluded-reasons.ts`), shipping with the current wording risks the product stating potentially-wrong astrology to users planning **weddings** — an MVP activity, and exactly the case where understating an electional warning is most consequential.

The §11.4 review does not pass — and the feature does not launch — until each is ruled on. Auditor's findings are training-knowledge, not community-verified, so the astrologer's ruling is final.

---

**[🚨 BLOCKING #1] Entry 16 `mercury_retrograde` — current phrasing: *"Mercury is sleeping."***

Domain-expert reading: "sleeping" is the canonical traditional metaphor for *combustion* (a planet "under the Sun's beams" / "in the heart of the Sun" — Lilly *Christian Astrology* III explicitly uses this register; "as a man buried" for the opposite of cazimi). Retrograde is traditionally *reversal / walking backward / review* (Lilly III; Bonatti *Liber Astronomiae* Tr. 7). Risk: (a) entry 16 semantically overlaps with the *combust* reason_id (added mid-2026 per CLAUDE.md), making the two states indistinguishable on the moment-detail screen; (b) the daily note misses retrograde's actual electional guidance (revisit, re-sign, re-read, don't initiate).

**Astrologer rules on (must pick one):**
- **(A)** Keep *"Mercury is sleeping."* — overrules domain-expert. Required: a one-sentence reason captured back into this spec (e.g. "consumer voice intentionally prioritized over technical accuracy").
- **(B)** Adopt *"Mercury is turning back."* (domain-expert's primary recommendation)
- **(C)** Adopt *"Mercury is retracing its steps."* (domain-expert's alternative)
- **(D)** Astrologer's own phrasing — write it in.

**If the ruling is B / C / D — coordinated PR required across THREE artifacts (do NOT change one without the others):**
1. This spec, Entry 16's headline.
2. `workers/api-proxy/src/translations/dictionary/excluded-reasons.ts`, currently: `"Mercury is sleeping — communication needs extra care this week."`
3. `CLAUDE.md`'s locked excluded-reasons translations section.

Changing the daily-note surface alone, without the moment-detail translation, produces a worse failure mode than the current state: the same user reads two different phrasings for the same condition on two different screens.

---

**[🚨 BLOCKING #2] Entry 17 `venus_retrograde` — current phrasing: *"Venus is resting."***

Domain-expert reading: "resting" reads as passive/optional/neutral. Tradition treats Venus rx as actively *contraindicated for marriage, engagement, signing love/partnership contracts, buying valuables, beginning friendships* (Bonatti Tr. 7; Lilly Bk III on marriage). For a `wedding`-activity user, understating this warning is exactly the consequential failure case. Connotation should be *reviewing/reconsidering/withdrawing love and value* — not "resting".

**Astrologer rules on (must pick one):**
- **(A)** Keep *"Venus is resting."* — overrules domain-expert. Required: a one-sentence reason captured back into this spec.
- **(B)** Adopt *"Venus is looking back."* (domain-expert's primary recommendation)
- **(C)** Adopt *"Venus is reconsidering."* (domain-expert's alternative)
- **(D)** Astrologer's own phrasing — write it in.

**If the ruling is B / C / D — same three-artifact coordinated PR:**
1. This spec, Entry 17's headline.
2. `workers/api-proxy/src/translations/dictionary/excluded-reasons.ts`, currently: `"Venus is resting — not a season for new commitments."` *(note: this dictionary entry still says "season", which §5 forbids on the daily-note surface; the lint exempts this entry as it serves the moment-detail surface, not the daily-note surface — see §7 scoping. If the entry changes here, consider dropping "season" too.)*
3. `CLAUDE.md`'s locked excluded-reasons translations section.

---

---

**[🚨 BLOCKING #3] Picker selection breadth — entry-reachability gap (empirical finding 2026-06-01)**

Post-`§12.1` empirical batch (June 2026 Kyiv, n=30; December spot-check, n=10) showed **16 of 21 §3.3 library entries never fire** in a real-data 30-day window — 5 of 6 `good-bucket` entries, 4 of 5 `mixed-bucket` entries. The picker's `pickByDominantFactor` (in `workers/api-proxy/src/translations/daily-notes/picker.ts`) maps top-window factors to entries using factor combinations the spec described gedanken-experiment style; real upstream top windows lead with different factors (e.g. `moon_waxing`, `house_ruler_dignified`) than the spec's keyed venus/mercury/jupiter patterns. Result: most entries are unreachable, and the few else-fallthroughs over-fire (see §12.2 for full data).

Variant-pool diffusion has been applied to the two over-threshold fallthroughs (`mixed-moon-steady-sky-thin`, `strong-ruler-in-motion`) as a temporary measure. The structural fix needs astrologer ruling.

**Astrologer rules on (must pick one):**
- **(A)** Keep the existing factor-to-entry mappings — accepting that 16/21 entries are unreachable. Required: a one-sentence reason captured back into this spec, and ideally a recommendation on whether the unreachable entries should be removed from the library.
- **(B)** Rewrite the existing entries' `dominant_factors_hint` to match real upstream factor distributions (e.g. rekey `good-venus-warm` to fire on the realistic top-window factor pattern for "Venus-led day"). Provide the revised hints; voice review pass follows.
- **(C)** Extend `pickByDominantFactor`'s branch coverage so more entries are reachable on real factor combinations (e.g. add a "moon_waxing-led with no benefic" → `good-moon-steady` branch). Provide the proposed factor-to-entry mapping; engineer wires it; voice review pass follows.
- **(D)** Author NEW entries that match real-data factor patterns and retire unreachable ones. Triggers a full voice review for any new entries.

**If the ruling is B / C / D — coordinated PR required:**
1. This spec, §3.3 entries' `dominant_factors_hint` lines (B/D) or the picker logic (C).
2. `workers/api-proxy/src/translations/daily-notes/picker.ts` `pickByDominantFactor`.
3. `workers/api-proxy/src/translations/dictionary/daily-notes.ts` for any entries added/removed.
4. Re-run the 30-day empirical batch after landing; confirm distribution improves before sign-off.

This is a structural item, not a copy item — the ruling shapes architecture, not phrasing.

---

**These three items are the currently launch-blocking gates in the spec.** They are not advisory; they gate MVP launch. The astrologer's recorded ruling closes them.

---

**Variant pool sizing — calibration rule (clarified 2026-06-01)**

The working rule across this spec has been: *any §3.3 entry firing more than 4 times in a 30-day window is a retention risk and needs a sibling-variant pool.* That rule was calibrated against **specific-pattern entries** — entries whose `dominant_factors_hint` describes a particular sky configuration (e.g. "Mercury combust + Venus dignified"). Those entries SHOULD be rare because the conditions they describe are rare; if one fires >4×/month in real data, something has misfired upstream or the spec's frequency assumption was wrong.

**Else-fallthrough entries are structurally different.** In `pickByDominantFactor` (see `workers/api-proxy/src/translations/daily-notes/picker.ts`), each quality bucket has 2-3 specific-pattern branches followed by an else-clause that picks a default entry (`strong-ruler-in-motion` for the strong bucket, `mixed-moon-steady-sky-thin` for the mixed bucket). Those default entries catch the *base case* of "bucket is X but no specific-pattern branch matched." They will inherently fire more often than specific-pattern entries because they catch more conditions.

**Sizing rule for else-fallthrough entries:** pool size proportional to empirical catch rate, not the abstract 4× threshold.

| Else-fallthrough firing rate (per 30 days) | Recommended pool size | Rationale |
|---|---|---|
| ≤ 4 | No pool needed | Within absolute threshold |
| 5 – 8 | 4 siblings (primary + 3 variants) | Max-per-variant ≈ 1-2, comfortably under 4× |
| 9 – 16 | 6 siblings (primary + 5 variants) | Max-per-variant ≈ 2-3, under 4× |
| 17 – 24 | 8 siblings (primary + 7 variants) | Max-per-variant ≈ 2-3, under 4× |
| ≥ 25 | First fix BLOCKING #3 (picker breadth) — pool diffusion can't carry this volume; the entry is doing structural work the spec didn't intend |

The empirical-batch evidence for `mixed-moon-steady-sky-thin` (17 firings / 30 June 2026 Kyiv days) sized its pool to 6 siblings — math: 17/6 ≈ 2.8, max ~3-4 per variant, under threshold. `strong-ruler-in-motion` (6 firings) sized to 4 siblings — math: 6/4 = 1.5, max ~3 per variant, under threshold.

**This is calibration, not loosening discipline.** Specific-pattern entries still need to stay rare (because their CONDITIONS are rare). Fallthrough entries need pool size proportional to their actual catch rate. Both serve the same goal: no user sees the same phrasing more than ~3 times in a month.

**Until BLOCKING #3 lands:** else-fallthrough entries carry more weight than the spec gedanken design assumed. Pool them accordingly. Once picker breadth is refined, fallthrough firing rates should drop and pools may be revisited.

---

**Important items (likely keep but verify — these do NOT gate launch):**

- **Are all 21 entries' factor-bucket mappings astrologically sound?** Does `entry 4 (good-venus-warm)` actually fire on the right Venus configurations? Does `entry 16 (closed-mercury-retrograde)` correctly trigger on retrograde AND not on combust (which is a different `reason_id` per `excluded-reasons.ts`)?
- **The four §3.4 §5-hardening revisions** — are the revised phrasings still astrologically accurate? Specifically: does "Mercury is sleeping" (without "this week") still read as honest about a 3-week condition? Does dropping "this season" from #17 lose load-bearing duration meaning?
- **The three §3.4 audit revisions** — does Entry 1's "the sky is clear" hold? Does Entry 8's generalized supporting line correctly avoid Moon-as-traveler conflation while still reading as warm? Does Entry 21 cover via combusta in the right register (CLAUDE.md's translation "the Moon walks the via combusta — a charged stretch worth waiting out" is what we aligned to)?
- **The Fork B decision tree (§4.5)** — does the branch-1-wins precedence rule (named exclusion beats uniformly-weak) hold in tradition? Lilly's distinction between *"the time is unfit"* (no good significator) and *"the matter is impeded"* (Moon void/combust/besieged) supports this — please verify.
- **Lot of Fortune in `factors.ts`** — domain-expert flagged that the literal phrase "Lot of Fortune" / "Part of Fortune" sits adjacent to the locked forbidden word *fortune*, and is opaque to non-astrologers in L1 voice. Review the existing `part_of_fortune_in_good_house` factor translation; consider whether to translate away from the literal term. This is a `factors.ts` concern, not a daily-note spec concern, but the audit surfaced it and it should be in scope for the review.
- **Entry 18 eclipse window** — domain-expert noted eclipse effects in tradition are often described as lasting *the lunation cycle* (days-to-a-fortnight either side), not "a week". Is "eclipse week" acceptable consumer simplification, or should it stretch?
- **§3.5 ACTIVITY_EYEBROW_PHRASES (4 phrases).** Added 2026-06-02 alongside the default activity preference feature (Decision 1 Path B — Today-tap → change activity). Standalone framing copy ("for your wedding", "for your contracts", "for your launch", "for your travels"), not factor-keyed sky claims. Review for tone consistency with the §3.3 library. Not BLOCKING — these don't assert sky doctrine. Mirror in `apps/mobile/src/lib/activities.ts` `ACTIVITY_EYEBROW_PHRASES`; if revised here, update both surfaces in the same PR.
- **The activity-asymmetric severity hints in §12.4 (D3 rescue) — 12 confirmed + 4 pending = 16 total strings.** Added 2026-06-02 alongside the default activity preference feature (`docs/superpowers/specs/2026-06-02-activity-preference.md`). 12 confirmed (Venus Rx, Mercury Rx, day-dominant Moon VOC × 4 activities). 4 pending astrologer ruling on whether intraday Moon VOC (Entry 12) warrants the same activity-asymmetric treatment as day-dominant Moon VOC (Entry 15). These are **refinements of cited traditional stances**, not novel astrological claims — each hint applies a documented Lilly/Bonatti/Dorotheus/Frawley severity gradient (Venus Rx, Mercury Rx, Moon VOC) to a specific MVP activity. Sources cited inline in the D3 audit doc (`docs/superpowers/expert/2026-06-02-default-activity-d3-audit.md`) and KB (`docs/superpowers/expert/_knowledge-base/astrology-electional.md`). **Treat as pending verification, NOT as new BLOCKING #4-#15.** Astrologer review confirms (a) the activity-severity mapping matches tradition, (b) the consumer phrasings are appropriate, and (c) travel correctly reads as the "tolerant outlier" for Venus Rx and Moon VOC per the cited sources. If any of the 12 needs revision, the same coordinated-PR discipline as BLOCKING #1/#2 applies — both this spec (§12.4) and the Worker dictionary (`workers/api-proxy/src/translations/dictionary/severity-hints.ts`) must change together.

**Nice-to-have (do not gate launch):**

- **Empty-state invite** — does "a moment of your own" carry the right valence in an electional context?
- **Entry 8's "kind meeting" framing** — accurate to Moon-applying-to-benefic per Dorotheus / Sahl / Bonatti / Lilly, but worth confirming the consumer paraphrase doesn't lose precision.

### 11.5 To the next session (push notification copy)

Push notification copy comes next. The same voice and same five boundary tests apply. The differences to design then:

- Push has a stricter character budget (~30-40 chars for title, ~100 chars for body).
- Push fires on a *change* (new strong window, window opening today, window closing in 1 hour) — so the voice is event-shaped, not day-shaped.
- Push needs a frequency cap so users don't get pinged daily.

This spec's §3 and §6 libraries are *not* push-ready as-is; the next session will draft a push-specific library that shares voice with this one.

---

## 12. Post-MVP empirical discoveries

This section is appended as findings emerge from real-data validation. Each entry names what was assumed, what was measured, and how the system was corrected. Future maintainers should read this before treating §4.5 (the decision tree) or §3.3 (the entry library) as static.

### 12.1 Branch-1 precedence assumption — partial-day exclusions (2026-06-01)

**Assumption.** §4.5's branch-1-wins rule ("any named exclusion covering today → closed bucket, regardless of score") treated all named exclusions as day-dominating. The spec's Lilly citation supported this for *full-day* impediments (full-day Moon void, eclipse, Mercury retrograde, etc.) but did not distinguish the *partial-day* case.

**Measurement.** Empirical curl batch against the Worker `/daily-note` endpoint for 30 consecutive Kyiv dates (June 2026):

- 66.7% (20/30) of days were classified `closed` — far above the ~25-35% rate traditional electional (Lilly Bk III, Bonatti Tr. 7, Brennan 2017) implies.
- 95% of closed days (19/20) fired the same `closed-moon-voc` entry with the same headline ("The Moon is between signs today") — both a misclassification signal and a retention-killing repetition.
- Probing upstream `/electional/search` directly on 5 of those `closed-moon-voc` days surfaced top windows scoring 80, 81, 85, **94**, and 88 outside the partial-day void periods (which lasted 90 minutes to a few hours). Upstream's `summary.no_viable_windows` was `false` on every one — upstream had already determined viable elections existed.

**Correction.** The picker's `assignBucket` now uses `summary.no_viable_windows` as the authoritative closed signal, NOT the mere presence of a named exclusion:

| `no_viable_windows` | Named exclusion | Bucket |
|---|---|---|
| true | (any) | `closed` |
| false | none | by score (`strong` / `good` / `mixed`) |
| false | present | `mixed` (regardless of score) |

Partial-day exclusions with viable windows now route through the §3.3 mixed-bucket entries (#10-14). Those entries were already designed for "positive factors with a caveat" — structurally what a partial-void high-score day IS. No new entries were authored; the existing voice library got more use.

**Variant pools added in the same coordinated commit.** `closed-moon-voc` (post-fix still fires ~10 days/month) and `closed-eclipse-window` (2-3 multi-day stretches/year) each got 3 sibling phrasings in `DAILY_NOTE_VARIANT_POOLS`, so the date-seeded rotation diffuses headlines across consecutive same-condition days. Moon void of course and eclipse stillness are uncontroversial across traditional schools, so these did not require pre-launch astrologer review.

**Lesson for future maintainers.** If a decision-tree rule names a single authoritative signal (e.g. "X means Y"), verify that the signal really IS authoritative against real-world distributions before relying on it. Upstream contracts can carry richer state than first-glance reading suggests; `summary.no_viable_windows` was always there — it just wasn't load-bearing in our reading until the data made it so.

### 12.2 Picker selection breadth — entry-reachability gap (2026-06-01)

**Assumption.** §3.3's 21-entry library was written gedanken-experiment style — each entry described a factor pattern (e.g. "Venus dignified PASS + Mercury combust" → entry 14) under the implicit assumption that real upstream data would distribute top-window factors roughly uniformly across those patterns. `pickByDominantFactor` in `picker.ts` was then written to mirror those patterns, with else-fallthroughs to a default-of-bucket entry.

**Measurement.** Post-§12.1-fix empirical batch (June 2026 Kyiv, n=30) and December spot-check (n=10):

- **16 of 21 library entries never fired** in the June window. 5 of 6 `good-bucket` entries dead. 4 of 5 `mixed-bucket` entries dead.
- **The else-fallthrough entries dominated.** `mixed-moon-steady-sky-thin` fired 17/30 (June) and 7/10 (December). `strong-ruler-in-motion` fired 6/30 (June). Both exceeded the spec's working >4×-in-30-days retention threshold (see §11.4 "Variant pool sizing — calibration rule", which was clarified at the same time as this finding to distinguish specific-pattern entries from else-fallthrough entries — the threshold applies absolutely to the former but else-fallthrough entries need pools sized to their empirical catch rate). The retention-risk pattern §12.1 fixed in `closed-bucket` reappeared in `mixed` and `strong` — same problem in different buckets.
- **Real-data factor distributions don't match spec assumptions.** Top windows in Kyiv real data lead with factors like `moon_waxing` and `house_ruler_dignified`, not the venus/mercury/jupiter combinations §3.3 entries were keyed on.

**Immediate diffusion (this PR + follow-up PR).** Variant pools added for `mixed-moon-steady-sky-thin` (sized to 6 siblings — primary + 5 variants — for its 17/30 catch rate per the §11.4 sizing rule) and `strong-ruler-in-motion` (sized to 4 siblings — primary + 3 variants — for its 6/30 catch rate). Same date-seeded rotation pattern as §12.1's pools, voice-spec-faithful, no astrologer pre-review since the claims are uncontroversial. The 6-sibling sizing for `mixed-moon-steady-sky-thin` came from a deterministic hash simulation of the 17 June-batch dates against a 4-sibling pool: max-per-variant 6/30 still crossed the >4× threshold, so the pool was expanded.

**Deferred to astrologer brief (BLOCKING #3 in §11.4).** The deeper picker-selection refinement — making good/mixed-bucket entries reachable so users see variety — requires astrologer ruling on what factor patterns SHOULD map to which entries. The spec was a thought experiment; real factor distributions differ. Possible outcomes include rewriting entries (their factor-requirement hints) and/or extending `pickByDominantFactor`'s branch coverage. Either way: new voice review territory.

### 12.3 Process lesson — empirical validation as a gate

§12.1 and §12.2 are the second and third structural findings the unit-test-and-audit pass missed but a real-data batch caught. (The first was iOS shadow alpha-rendering on the mobile daily hero: the renderer stripped the alpha tuned for CSS rgba, making moods indistinguishable on device — caught only by cycling through StatePicker on a real iOS build, not by any test.) The pattern is consistent: **assumptions about how the system would behave under real data are systematically more optimistic than actual behavior.**

Empirical batch — direct `/electional/search` probing plus a multi-week `/daily-note` curl across a real city — should be treated as a gate, not a polish step. The unit tests verify *what we asked the system to do*; the empirical batch verifies *what the system actually does on the real distribution*. Both are needed before declaring a daily-note feature complete.

For future daily-note-touching work: run the 30-day batch (with at least one summer + one winter month, ideally one Northern + one Southern hemisphere location) before sign-off. The cost is ~5 minutes of curl + a histogram script; the catch rate has been 100% so far for findings unit tests missed.

### 12.4 D3 reopened — activity-asymmetric severity hints (2026-06-02)

**Assumption.** The brainstorm for default activity preference (`docs/superpowers/specs/2026-06-02-activity-preference.md`) initially proposed (as decision D3): the daily-note's base sky-state sentence is *activity-agnostic* across all 4 MVP activities. Only the call-to-action and framing differ. Architectural payoff: 1× voice spec instead of 4× per-activity variants.

**Audit finding.** Domain-expert pre-flight audit (`docs/superpowers/expert/2026-06-02-default-activity-d3-audit.md`) stress-tested D3 against traditional electional sources and returned **WEAKENS (borderline FAILS)**. Three conditions break the activity-agnostic claim with citations:

- **Venus retrograde** — Severity asymmetric across activities (Frawley significator rule on Skyscript; CHANI 2026 dates-to-avoid post applies Venus Rx primarily to wedding + business, not travel; Susan Miller: *"you can go on vacation when Venus is retrograde"*). Wedding/business/contracts severe; travel tolerant.
- **Mercury retrograde** — Severity asymmetric (Lilly Bk III, Bonatti Tr. 7; modern practitioner consensus — Big Sky Astrology, YourTango — that wedding Mercury Rx is mitigatable via legal-paperwork-outside-ceremony workaround). Contracts catastrophic (Mercury IS the significator); travel/business cautionary; wedding mitigatable.
- **Moon void of course** — Severity asymmetric (Lilly's dignified-Moon exceptions in Cancer/Taurus/Sagittarius/Pisces; modern practice that journey-during-VOC is fine, *booking* during VOC is the problem). Wedding/contracts/business severe; travel tolerant for the journey, not for the booking.

All other ~18 sky conditions covered by the §3.3 voice library remain genuinely activity-agnostic in tradition. D3's strict "1× voice across all conditions" does not hold; D3's spirit — *"avoid 4× spec explosion"* — is preserved via a thin asymmetry layer.

**Correction (architectural).** Adopt **"uniform base sentence + optional one-line severity hint per activity"** for the three asymmetric conditions only. The base headline + supporting_line of the relevant §3.3 entries (Entry 16 `closed-mercury-retrograde`, Entry 17 `closed-venus-retrograde`, Entry 15 `closed-moon-voc` and intraday Entry 12 `mixed-moon-void-until-noon`) stay activity-agnostic. A new optional `severity_hint` field is added to the entry schema (extending §3.1), keyed by `Activity`. When the picker selects one of these entries AND the request carries an `activity`, the Worker composes the response with the corresponding hint as a third body line. When activity is absent (Phase A Worker fallback — see activity-preference spec §6), the Worker omits the hint slot and logs the fallback.

**Schema extension (§3.1 entry schema).** Three §3.3 entries (the three asymmetric conditions) carry an additional optional field:

```ts
{
  // existing fields from §3.1 ...
  severity_hints?: {
    wedding: string;          // ≤ 140 chars, follows §9 voice checklist
    contracts: string;        // ≤ 140 chars
    business_launch: string;  // ≤ 140 chars
    travel: string;           // ≤ 140 chars
  };
}
```

Entries WITHOUT `severity_hints` (~18 of 21) render unchanged. Entries WITH `severity_hints` render the matching activity's string as a third body line in `text-muted` (not `text-subtle` — see activity-preference spec EC-9).

**The 12 severity-hint strings (locked draft, pending astrologer verification per §11.4).**

Each hint applies a cited tradition-stance to a specific activity. None introduce novel astrology; each is a refinement of a documented severity gradient. All pass the §9 voice checklist (no forbidden words, ≤140 chars, declarative + practical voice, no future-pointing). Travel is the explicit tolerant outlier for Venus Rx and Moon VOC per audit Constraint 4.

#### Entry 16 (Mercury retrograde) — `closed-mercury-retrograde.severity_hints`

| Activity | Severity hint string |
|---|---|
| `wedding` | *"For a wedding, tradition is gentler here than for a contract — the vows themselves are less impacted than the legal documents that accompany them."* |
| `contracts` | *"For a contract, this is the stretch tradition asks you to wait through — words and agreements made now tend to need rewriting."* |
| `business_launch` | *"For a launch, the announcements and the early outreach don't land the way they will in a few weeks. Better held."* |
| `travel` | *"For travel, the trip itself is fine — but build buffer for delays, and double-check the tickets and the times."* |

Source: Lilly *Christian Astrology* Bk III on Mercury and contracts; Bonatti *Liber Astronomiae* Tr. 7 on retrogradation; Frawley significator-of-matter rule (Mercury is the natural significator for words and agreements — contracts most affected, weddings less so since Venus is their natural significator).

#### Entry 17 (Venus retrograde) — `closed-venus-retrograde.severity_hints`

| Activity | Severity hint string |
|---|---|
| `wedding` | *"For a wedding, this is the stretch tradition asks you to wait through — Venus governs marriage, and her support is withdrawn now."* |
| `contracts` | *"For a contract, this matters most for partnerships and anything tied to money — renewing an old agreement holds; beginning a new one strains."* |
| `business_launch` | *"For a launch, this stretch sits across the things you want this venture to attract — revenue, customers, goodwill. Better to wait."* |
| `travel` | *"For travel, this matters less than it does for the other beginnings — a trip during this stretch is fine to take."* |

Source: Frawley *The Real Astrology* (significator-of-matter rule — strengthen the planet naturally associated with the task; Venus is wedding's natural significator); Bonatti *Liber Astronomiae* Tr. 7 (retrogradation as universal affliction, severity scaling with which house ruler is afflicted); Lilly *Christian Astrology* Bk III on marriage elections. Travel tolerance: Susan Miller via [Glam](https://www.glam.com/1268856/astrologer-susan-miller-wedding-date-hack-venus-retrograde/) — exact quote: *"You can go on vacation when Venus is retrograde, but I don't want you getting married..."*

#### Entry 15 (Moon void of course) — `closed-moon-voc.severity_hints`

| Activity | Severity hint string |
|---|---|
| `wedding` | *"For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days."* |
| `contracts` | *"For a contract, today is the day to hold signing — the matter begun now tends to need revisiting or quietly fall away."* |
| `business_launch` | *"For a launch, the announcement made today tends to land softly or get reshuffled later — wait for the Moon to settle into the next sign."* |
| `travel` | *"For travel, the journey itself is fine — but if you're booking a ticket, wait until the Moon reaches the next sign."* |

Source: Lilly *Christian Astrology* Bk III on VOC — canonical definition via [Anthony Louis](https://tonylouis.wordpress.com/2021/02/27/lillys-definition-of-the-void-of-course-moon/); Cancer/Taurus/Sagittarius/Pisces dignity exceptions (Bonatti aphorism 64 + Lilly) via [Lee Lehman](https://leelehman.com/wp/index.php/2003/10/21/the-void-of-course-moon-from-linear-time-to-lunar-time/); Bonatti's Considerations on impediments via Dykes translation of *Liber Astronomiae*. Travel tolerance per modern practitioner consensus: journey-during-VOC fine, *booking* during VOC is the impeded act.

**Intraday Moon VOC — Entry 12 (`mixed-moon-void-until-noon`)**

Entry 12 is intraday (the void ends before evening) rather than day-dominant. Its severity_hints follow the same activity-asymmetric pattern but with the intraday horizon class preserved:

| Activity | Severity hint string |
|---|---|
| `wedding` | *"For a wedding, time the vows for the afternoon — the morning hours aren't held by the sky the way the afternoon will be."* |
| `contracts` | *"For a contract, hold the signing until after midday — the morning void doesn't carry agreements."* |
| `business_launch` | *"For a launch, time the announcement for the afternoon — the morning hours land softer than the rest of the day."* |
| `travel` | *"For travel, the morning is fine to be in motion — but hold any new bookings or reservations for the afternoon."* |

This brings the total to 16 strings if Entry 12 is treated as an asymmetric condition (the brainstorm's "12 strings" figure assumed 3 entries × 4 activities; including Entry 12 as a 4th asymmetric entry yields 4 entries × 4 activities = 16). **Decision to include Entry 12 in the asymmetry layer is itself pending astrologer verification** — Entry 12 was added during §3.3 hardening for the intraday case and may or may not warrant the same activity-asymmetric treatment as Entry 20.

**Where the strings live in code.** Source-of-truth in this spec (above). Mirrored to `workers/api-proxy/src/translations/dictionary/severity-hints.ts` with the same verify-in-sync discipline as `status-lines.ts` per CLAUDE.md's translation-layer policy. The Worker reads the matching string at composition time based on the picked entry id + the request's `activity` param.

**QA gate (split sampling rule — replaces the prior §12.4 placeholder).**

The activity-preference spec's per-activity batch QA gate must use **split sampling** to be meaningful. A flat "sample 1 day across 4 activities" is too narrow — on a moon-dominated day, the 4 activities surface the same top factor and the same headline + body, with only the eyebrow CTA differing. The asymmetry layer only fires on the 3 (or 4) asymmetric conditions, which are not the everyday case.

| Sample category | Description | Minimum sample size | What to verify |
|---|---|---|---|
| **Convergent (moon-dominated)** | A typical day with no asymmetric condition — e.g. a clean Moon waxing day, no retrograde, no VOC | 1 day × 4 activities | Headline + body + supporting line are **identical** across the 4 activities. Only eyebrow CTA and activity-noun differ. NO severity hint rendered. |
| **Divergent (significator-asymmetric)** | A day where one of the 3 (or 4) asymmetric conditions fires | 1 day × 4 activities × 3 conditions (= 12 sample cells, minimum) | Headline + body activity-agnostic AND identical across 4 activities. Severity hint **differs across the 4 activities**, with travel reading tolerant for Venus Rx + Moon VOC per Constraint 4. |
| **Venus Rx 2026 (mandatory)** | At least one sample date in October–November 2026 (Venus Rx period covering MVP launch window) | 1 date × 4 activities | All 4 hints render. Wedding/business/contracts read severe; travel reads tolerant. |
| **Phase A fallback case** | A Worker request without `?activity=` during Phase A migration | 1 request × 1 asymmetric date | Severity hint slot is OMITTED (Worker doesn't compose it when activity is absent). `[daily-note] severity-hint composed with fallback activity` warn fires. |

Without the split, QA either over-fires on every flat day (false positive — the 4 are supposed to converge) or misses the asymmetry case (false negative — the 4 should diverge but the sample didn't catch it). The split makes both halves of the gate verifiable.

**Lesson for future maintainers.** Architectural payoff claims that rest on a single load-bearing astrological doctrine (here, "sky state is activity-agnostic in tradition") need stress-testing against the doctrine itself before the spec text locks. The D3 audit was the cheap version of that test — it ran in ~5 minutes and caught a load-bearing weakening before the brainstorm wrote 4× scope into the spec. The 12-string rescue is the cheap fix — O(asymmetric_conditions × activities), not O(all_conditions × activities). If a future feature makes a similar "X is uniform across activities" claim, run the equivalent stress-test before the architectural commitment.

---

*End of spec.*
