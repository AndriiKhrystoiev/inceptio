# Inceptio Design — v2.1 Recalibration Brief

**Context for Claude Design:** I've now verified the real astrology-api.io v3 responses with 7 production queries (wedding/contracts/business_launch/travel across multiple time windows in Kyiv). The verified data significantly differs from the assumptions in the original v2 brief. This document specifies the targeted changes needed across the 9 existing screens to align design with reality.

**No need to rebuild from scratch.** Mystical Premium direction is locked. Palette, typography (Fraunces + Inter), tone of voice, and component primitives all stay. This is a calibration pass, not a redesign.

---

## What we learned from real API data

Before the screen-by-screen changes, the four reality-checks that drive everything below.

### 1. Score distribution is much lower than designed for

In real Kyiv data, across 7 queries spanning 7 days to 6 months, the **highest score we ever found was 72**. Most "best" results sit in the **60–72 range** with grade `fair`. The 90+ "excellent" bucket essentially doesn't appear for typical month-long searches.

This means: **fair (60–74) is the realistic win-state, not a consolation.** The design currently treats fair as a middle bucket between good and caution. It needs to become the headline state.

### 2. "No viable windows" is a frequent, not edge-case scenario

In a 7-day wedding search in June 2026, the API returned `viable_windows_count: 0` and `no_viable_windows: true`. The user still gets the *best available* in `top_windows[]` but with `grade: caution` and lower scores. Short searches (under 2 weeks) regularly produce this state.

This means: **the design needs a graceful "no viable, but here's the closest" state** in Today, Calendar, and Results — not just an empty/error state.

### 3. Most days in long searches are fully blocked

In a 6-month wedding search, 85 of 184 days were fully blocked (Moon void of course, eclipse window, Venus retrograde, etc.). Venus retrograde blocked all of October and November 2026 for wedding.

This means: **the Calendar heatmap is mostly blocked cells, not a smooth gradient.** Design must elegantly handle a calendar where the dominant visual state is "blocked with a friendly reason," not "warm gradient."

### 4. Top windows are often extremely short — sometimes 1 minute

Real `duration_minutes` values from the API include 90, 25, 10, 5, and **1 minute**. The pristine "electional moment" in traditional astrology is sometimes just a single minute when the sky aligns.

This means: **Moment Detail must comfortably present sub-10-minute windows without making them look broken.**

### 5. Loading times can hit 42 seconds for cold searches

One real cold-cache wedding query for a 30-day window took **42 seconds** to compute server-side. Cached responses return in 8ms. The current loading screen ("Looking at the sky for you...") works for 3–10 seconds, but breaks down for 30–60 second waits.

This means: **Loading state needs progressive messages** to reassure users during long cold-cache computations.

---

## Screen-by-screen changes

For each screen below, I'll specify: what stays (most things), what changes, and the exact microcopy where it matters.

---

### Screen 00 — Onboarding / Welcome

**Status:** No changes. Microcopy stays:
- "Find the right time to begin."
- "Inceptio reads the sky to help you choose your moment."
- "No account needed."

Welcome screen is identity-setting, not data-bound. Leave it.

---

### Screen 01 — Today (recalibrate)

This screen needs the most attention. Currently the design assumes a clean score like "94 — A tender day for beginnings." In reality, scores typically sit at 35–55, occasionally peaking at 65–72.

**Three states the Today screen must support** (currently the design only handles state A):

**State A — Today has a viable window (score ≥ 60):**

- Hero number: actual score (e.g. 68)
- Headline (Fraunces): warm sentence tuned to grade
  - 75+ : "A strong day to begin."
  - 60–74 : "A gentle window opens today."
  - Subhead (Inter, muted): brief explanation
    - "Venus is warm and Jupiter holds steady this evening."
- CTA: "See the window →" (deep-link into Moment Detail)

**State B — Today has only caution windows (score 40–59):**

- Hero number: still shown, but with caution-gold tint instead of mint
- Headline (Fraunces): "A day for reflection, not commitment."
- Subhead (Inter): "There's a moment this afternoon, but it asks for care. See what to weigh."
- CTA: "See the moment →"

**State C — Today is fully blocked (no viable, all hard-stop reasons):**

- No score shown — replace with a small glyph (moon void / retrograde / eclipse, depending on `blocked_reasons[0]`)
- Headline (Fraunces): warm explanation, not error
  - moon_voc : "The Moon is between signs today."
  - mercury_retrograde : "Mercury is sleeping."
  - venus_retrograde : "Venus is resting."
  - eclipse_window : "We're inside an eclipse window."
- Subhead (Inter): "Efforts begun today don't take root the way they do on other days. Tomorrow looks different."
- CTA: "See this week's best →" (jumps to Calendar)

**Design action:** add three states to Today screen. The current design is State A only. Show all three in the same layout, with clear visual distinction (state B uses warmer gold, state C uses muted indigo with a single glyph instead of a score number).

---

### Screen 02 — Activity Picker

**Status:** No changes. Current four warm cards (Wedding / Business / Contracts / Travel) and headline "What do you want to begin?" stay.

---

### Screen 02b — Date Range Picker

**Status:** No changes. Microcopy "About 2 months, 5 days" stays.

But add a **subtle hint** beneath the duration label:

- For ranges under 14 days: small muted text "Shorter windows may not contain viable moments — try a wider range if results are sparse."
- For ranges over 90 days: "Looking far ahead — this may take a few seconds to compute."

These are gentle, not warnings. They prepare users for the empty-state and the loading state.

---

### Screen 02c — Location Picker

**Status:** No changes.

---

### Screen 03 — Calendar (Heatmap) — RECALIBRATE

This is the second most-affected screen. Current design shows a smooth violet-to-gold gradient across all days. In reality, the calendar is dominated by **blocked days** — they outnumber viable days roughly 3:1 in month-long wedding searches.

**Three cell states needed (currently design has two):**

**Cell state 1 — Blocked (most cells in many searches):**

- Background: very muted dark indigo (`#1F1838` at 40% opacity)
- No number
- Tiny glyph centered:
  - 🌑 moon (filled circle) for `moon_voc` and `moon_via_combusta`
  - ⊘ for retrogrades (mercury / venus / saturn)
  - ◐ partial-disc for eclipse
  - ★ for fixed_star_on_angle
  - ⚹ for malefic_on_angle
- These glyphs should be **simple, dignified, not emoji**. Use the existing Glyph component primitive.
- Tappable: opens a small bottom-sheet with the friendly reason

**Cell state 2 — Viable, score 0–74:**

- Gradient from muted-indigo (low) to warm-violet (mid) to gold-tint (high-fair)
- Score number shown in the cell
- Tappable: jumps to Moment Detail

**Cell state 3 — Viable, score 75+ (rare, celebrate when found):**

- Full gold ring (existing "excellent" cell design)
- Subtle glow / halo
- Score number prominent
- This is the user's payoff for searching. Make it feel earned.

**Header changes:**

Current header reads "About 2 months, 5 days · 9 viable windows found"

Change to dynamic context-aware copy:

- If `viable_windows_count >= 5` : "9 viable windows in your range"
- If `viable_windows_count` 1–4 : "Just **3** viable windows in your range — they're worth attention"
- If `viable_windows_count == 0` : "No viable windows in this range. The closest moments still exist — see below."

**Legend strip at bottom of Calendar:**

Add a small legend strip (Inter 12px muted) explaining the three cell types:

> Glyphs mark days the sky doesn't favor. Filled cells show available windows. Gold rings mark the strongest moments.

This teaches the user how to read the calendar without a tutorial.

---

### Screen 04 — Moment Detail — RECALIBRATE

Currently the design assumes a multi-hour window (e.g. "14:32–17:48"). In reality, top windows are often **1–25 minutes long**.

**Changes to time display:**

Old format: `Sat, Jun 27 · 14:32–17:48`

New format (depending on duration):

- **Long window (> 60 min):** `Sat, Jun 27 · 14:32–17:48 (3h 16m)`
- **Medium window (10–60 min):** `Sat, Jun 27 · 14:32 · **25 minutes**` (highlight duration)
- **Short window (< 10 min):** `Sat, Jun 27 · 14:32 · **10 minutes**` with subhead "A precise window — set a reminder."
- **Single-minute window (1 min):** `Sat, Jun 27 · **14:32 exactly**` with subhead "A single, pristine moment. Be ready."

The microcopy "A precise window — set a reminder" or "A single, pristine moment. Be ready." should appear only for short/single-minute windows, to reassure the user this isn't an error.

**Score block:**

Currently shows the number prominently. Add a small grade pill beneath it:

- 75+: gold pill — "Strong"
- 60–74: warm violet pill — "Fair · Good window"
- 40–59: muted gold pill — "Caution"
- < 40: dim rose pill — "Poor"

The pill **explicitly names the grade** so users don't have to guess "is 68 good?" — the answer is right there.

**Narrative paragraphs (the four-paragraph friendly summary):**

The current design has four paragraphs that all assume positive factors. In reality, **every wedding moment had at least one `fail` factor** (`moon_applying_to_benefic`, `asc_and_house_ruler_in_reception_or_aspect`) and some had several. The narrative needs to gracefully integrate fails.

Structure of narrative (in Inter, paragraphs separated by 16px):

1. **Opening — the strongest factor:** Pull the highest-`contribution` passing factor and lead with it.
   - Example: "Venus brings warmth to this window. She rests in Leo, where she's dignified, and her light favors connection."

2. **Supporting note — the second strongest:** Add another passing factor for depth.
   - Example: "The Moon is waxing, gaining light, which traditional astrology favors for new beginnings."

3. **What to know — the nuance:** Frame one of the `fail` or `partial` factors gently. Never sound alarmist.
   - Example: "Worth noting: the Moon doesn't make a soft connection to Venus or Jupiter at this moment. The window holds itself rather than being lifted by them."

4. **Closing — recommendation:** Plain advice.
   - Example: "If your ceremony falls within this window, it's a thoughtful choice. If you have flexibility, the window on June 22 is slightly stronger."

The fourth paragraph is **comparative** — it lightly references the next-best alternative. This is huge for UX: users can decide between options without leaving the screen.

---

### Screen 03b — NEW: "No Viable Windows" Results State

We don't have this screen yet. We need it.

When `summary.no_viable_windows == true` and the user came from Activity Picker → Date Range → Location → Search, instead of dropping them into a Calendar full of grey cells, we show this dedicated state.

**Layout:**

- Top: hero illustration (use existing Starchart primitive, but dimmer)
- Headline (Fraunces, 28px): "The sky doesn't offer ideal moments this week."
  - Variant for 2-week+ ranges: "No ideal moments in this range — but there are alternatives."
- Body (Inter, 16px, 3 short paragraphs):
  1. Explain the dominant blockers: "Mercury is retrograde from June 29, and the Moon is between signs much of the week."
  2. Acknowledge the user's flexibility: "You have a few options."
  3. Three CTAs (stacked, full-width buttons with soft borders):
     - "See the closest moment anyway →" (jumps to Moment Detail for `top_windows[0]`, even though it's caution-grade)
     - "Widen the date range →" (returns to Date Range Picker)
     - "Try a different city →" (returns to Location Picker)
- Bottom: small muted text — "Wedding windows are rare — Inceptio finds them, even when they're brief."

**Why this matters:** Without this screen, the user hits a calendar of grey cells and feels the app is broken. With this screen, they understand the sky has spoken and they have agency to respond.

---

### Screen 05 — Your Moments

**Status:** No changes.

Microcopy stays: "Moments you've saved", "3 ahead, 2 behind you in time."

But quietly add: if a saved moment has now passed and its outcome would have been worth comparing, the moment card should show its **completed state** subtly:

- Past moments: 70% opacity
- A tiny muted Inter 11px label beneath the time: "Passed" — no judgment, just a fact

---

### Screen 06 — Paywall

**Status:** Mostly unchanged.

But the feature list needs one addition reflecting what we now know:

Old list:
> Unlimited searches / Save unlimited moments / Calendar heatmap view / Export to your phone's calendar / Quiet — no ads, no account

New list (add one item):
> Unlimited searches / Save unlimited moments / **Search up to 12 months ahead** / Calendar heatmap view / Export to your phone's calendar / Quiet — no ads, no account

The new item ("Search up to 12 months ahead") creates a tangible free-tier limit: free users get 1-month windows, Pro users get 12-month windows. Long-range searches are expensive on the API (5 credits, slower), so they should be a Pro feature.

This also reflects the reality that **the best wedding windows are often months away** (in our test: best Kyiv wedding window in the next 6 months was August 20). Pro users can find these. Free users have to settle for what's near.

---

### NEW microcopy: Loading state (progressive)

The current loading screen shows "Looking at the sky for you…" indefinitely. For 42-second cold queries, this becomes uncomfortable.

**Implement progressive loading messages** that change every ~5 seconds:

- 0–5s : "Looking at the sky for you..."
- 5–15s : "Reading the planets' positions..."
- 15–30s : "Considering each window..."
- 30–60s : "Almost there — the sky takes its time..."

All in Fraunces 22px italic, centered. Smooth fade between messages (300ms opacity).

Also add a **subtle progress ring or pulse** beneath the loading message — it should feel meditative, not anxious. Pulse rate ~1 cycle per 2 seconds.

---

## Component primitive updates

Three small additions to existing component primitives:

### Glyph component — extend with new variants

Currently the Glyph primitive supports: sun, moon, planets, signs.

Add these blocking-reason glyphs (single-line SVG, no fill):
- `glyph-moon-void` (filled crescent within thin circle)
- `glyph-retrograde` (rounded R with curve back)
- `glyph-eclipse` (half-occluded disc)
- `glyph-fixed-star` (8-point compass star, thin lines)
- `glyph-malefic-angle` (small sharp triangle)

These need to read clearly at 12px and 24px sizes.

### StatusLine — add grade pill variant

The StatusLine component currently shows generic info. Add a **grade pill** variant that renders:

- Score number (16px Fraunces)
- Pill background colored by grade (gold / warm-violet / muted-gold / dim-rose)
- Grade label (10px Inter, all caps, letter-spaced)

Used in: Moment Detail, possibly Today hero.

### WindowCard — add duration emphasis

WindowCard currently shows date and time range. Add conditional emphasis:

- If `duration_minutes <= 10`, time shown in larger weight + the word "minutes" beside it
- If `duration_minutes == 1`, time shown with "exactly" suffix

Small thing, big UX win.

---

## What's NOT changing (locks)

To be explicit so Claude Design doesn't drift:

- **Palette is locked.** Deep midnight indigo, warm mystical violet, moonlight gold, mint, muted rose. Do not introduce new accent colors.
- **Typography is locked.** Fraunces for display, Inter for UI. No monospace on consumer screens.
- **Tone of voice is locked.** Warm, dignified, poetic-but-specific. No "magic", "destiny", "fortune", "stars align."
- **Tab structure is locked.** Today / Calendar / Moments / You.
- **Microcopy from v2 brief stays** unless explicitly changed above.
- **Component primitives stay** — only the additions noted above.

---

## How to approach this in Claude Design

I'd suggest tackling the screens in this order (highest impact first):

1. **Screen 01 (Today) — three states** — this is what users see first
2. **Screen 03 (Calendar) — three cell states** — this is the data view
3. **Screen 03b (No Viable Windows) — NEW screen** — this is the missing escape valve
4. **Screen 04 (Moment Detail) — duration variants & narrative structure** — this is the detail view
5. **Loading state progression** — small but visible
6. **Component primitives** — only after the screen designs need them

After each screen, take a look at it and ask: would a regular person (not an astrologer) understand what they're looking at?

If yes, ship it. If no, iterate.

---

*This is v2.1 — a calibration of v2 against verified API data. v2.2 will follow once the translation layer's friendly phrases are written and we know exactly what microcopy slots need to be filled per factor.*
