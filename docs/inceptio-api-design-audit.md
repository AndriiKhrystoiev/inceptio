# Inceptio v2 — API ↔ Design Audit

> Final compatibility analysis: does astrology-api.io v3 electional endpoint support everything we designed?

---

## TL;DR

**Yes, the API supports ~90% of the design out of the box.** The remaining ~10% splits into two buckets:

- **5% — copy translation layer** that lives on our side (Cloudflare Worker), not the API. The API returns technical names like "Venus trine Jupiter +18"; we translate to "Venus brings warmth to this window."
- **5% — local features** that don't need the API at all (saved moments, free counter, history, paywall logic).

There's **one architectural decision to make**: where the "friendly translation layer" lives. I recommend on the Worker (server-side), not in the mobile app.

There's **one open question**: does the API actually return the `heatmap[]` array of day-level scores, or do we need to compute it from the windows? This must be verified in Postman before the first sprint.

---

## Screen-by-screen compatibility

### 00 — Onboarding

**What the screen shows:** Wordmark, headline, CTA, "No account needed" footer.

**API requirement:** None. Pure marketing screen.

**Verdict:** ✅ No dependency. Ship as-is.

---

### 01 — Today

**What the screen shows:**
- Headline: "A tender day for beginnings"
- Score-grade label: "Highly favorable" with sparkle
- Score value: "94 ✨ out of 100"
- Body: "Venus brings warmth to today..."
- Date: "Saturday, November 22"
- Moon glyph (waxing crescent)

**API requirement (per request):**
1. Call `/electional/search` with `date_range = today` (start=today, end=tomorrow), location = user's saved default, activity = "general" or last-used preset, `top_n_windows = 1`.
2. Extract the single window, its score, factors, and rationale.

**Compatibility:**
- ✅ Score 0-100 → directly maps to API's score field
- ✅ Status label ("Highly favorable") → we derive from score:
  - 90-100 → "Highly favorable"
  - 75-89 → "Favorable"
  - 60-74 → "Moderate"
  - 40-59 → "Wait"
  - 0-39 → "Difficult"
- ⚠️ "A tender day for beginnings" → **this is NOT what the API returns**. The API returns either a technical rationale or factor list. We need to **synthesize this poetic headline** from the top factors. Two options below.
- ✅ Body paragraphs ("Venus brings warmth...") → translation layer from factor names (see below)
- ❓ Moon phase glyph → **not directly in `/electional/search` response.** We need either a separate API call (probably `/lunar/phase`), or compute locally from the date. Verify.

**Headline synthesis options:**
- **Option A (simpler)**: Static lookup table by (score bucket × activity). "Highly favorable + Wedding" → "A tender day for beginnings". 5 buckets × 4 activities = 20 hand-written headlines. Cheap, predictable.
- **Option B (richer)**: LLM call with top factors as input, prompting it to produce a one-line poetic headline. More natural, but adds latency + cost + variability.

Recommendation: **Option A for MVP**. Move to B in v1.2 if users want freshness.

**Verdict:** ✅ Feasible. Requires the translation layer (always required, see below). One verify item: moon phase data source.

---

### 02 — Activity Picker

**What the screen shows:** 4 cards (Wedding / Contract / Business / Travel) with emoji icons + subtitles.

**API requirement:** None for rendering. The user's choice becomes the `activity` parameter for the next API call.

**Compatibility:**
- ✅ The API supports 12 activities. We expose 4 in MVP; the wording "Eight more coming soon" is accurate.
- ✅ Each card → API activity mapping:
  - "Wedding or engagement" → `wedding`
  - "Contract or agreement" → `contracts`
  - "Business or launch" → `business_launch`
  - "Travel or move" → `travel`

**Verdict:** ✅ No issues. Pure UI screen.

---

### 02b — Date Range

**What the screen shows:**
- Two date inputs (From / To) in Fraunces, e.g. "Saturday, June 14, 2026"
- Range summary: "About 2 months, 5 days"
- Quick presets: Next month / 3 months / 6 months / 1 year
- Helper: "Wedding searches favor weekends and afternoons by default"

**API requirement:** None for rendering. Selection becomes `date_range = { start_date, end_date }` for the search call.

**Compatibility:**
- ✅ API accepts arbitrary date ranges up to 367 days
- ✅ "Wedding favors weekends and afternoons" → this is implemented as `filters: { days_of_week: ["sat", "sun"], hours_from: 10, hours_to: 20 }`, set per-activity on our side. Hidden from the user.

**Note on "About 2 months, 5 days":** This is computed locally on the client from the date math. Trivial.

**Verdict:** ✅ No issues.

---

### 02c — Location Picker

**What the screen shows:**
- Search input with autocomplete (Nominatim or similar — our side)
- 3 results with location pins
- Coordinates in mono ("50.4501°N · 30.5234°E")
- "Use current location" button
- Helper: "The sky's view depends on where you are."

**API requirement:** Selected location becomes `location` for the search call (city + country_code OR lat/lng).

**Compatibility:**
- ✅ API accepts city name + country code OR explicit coordinates
- ⚠️ The API does NOT provide geocoding (city → coordinates). We need **Nominatim** (free, OpenStreetMap) or **Mapbox Geocoding** for the autocomplete UX shown on the screen. **This is documented in CLAUDE.md already.**

**Verdict:** ✅ Feasible. Geocoding is on our side, as planned.

---

### 03 — Calendar (Heatmap)

**What the screen shows:**
- Calendar grid (June 2026) with day cells colored by score
- Each cell shows day number + score value (e.g., "21" with "94" below)
- Mercury retrograde days shown with diagonal hatch pattern
- Saturday June 21 has a soft glow (hero moment)
- Legend: poor / ok / good / excellent / caution period
- "5 moments above 'favorable' threshold" stat

**API requirement:** Day-level scores for every day in the date range.

**Compatibility — and the one open question:**
- ✅ The API does compute scores for every day (Pass 1 produces a heatmap)
- ❓ **Open question: is the heatmap returned as part of `/electional/search`, or is it a separate endpoint?**
  Looking at API docs: marketing language says "0-100 scoring, calendar heatmaps" — implying it's returned. But until verified in Postman with a real request, treat as unverified.
  
  **Two scenarios:**
  - **Scenario A (best case)**: `/electional/search` response includes `heatmap[]` field with per-day scores. We render directly.
  - **Scenario B**: Heatmap is implicit and we must compute per-day scores ourselves from the windows[] array, OR call a separate endpoint per day (would be slow + expensive).
  
  **Action**: First sprint task — verify with a real Postman call. If Scenario B, talk to API provider about exposing heatmap data, OR reduce calendar resolution (color by week instead of day).

- ✅ Mercury retrograde / eclipse highlighting → API returns `excluded_ranges[]` with reason. We translate "Mercury retrograde" → "Mercury is sleeping" in display copy. Hatch pattern is pure visual.
- ✅ Glow on hero day (score 94) → client-side rendering based on threshold (score ≥ 90).
- ✅ "5 moments above 'favorable' threshold" → count windows with score ≥ 75 from the windows[] array.

**Verdict:** ⚠️ Depends on heatmap availability. **Highest-priority verification task.**

---

### 04 — Moment Detail (Level 2 — Friendly)

**What the screen shows:**
- Status pill "Highly favorable ✨"
- Date "Saturday, June 21"
- Time + location "Afternoon · 2:32 — 4:08 / Kyiv, Ukraine"
- "Why this moment" section with 4 friendly paragraphs:
  > "Venus brings warmth to this window. Love and growth move together..."
  > "The Moon is in Cancer, grounded and steady..."
  > "Mercury runs clear, so communication will flow easily..."
  > "There's one small thing to know: Mars and Saturn cross paths late..."
- "See technical details →" link
- Add to calendar / Save / Share buttons

**API requirement:** Per-moment factor list with names, weights, and direction (positive/negative).

**Compatibility — the BIG ONE:**

The API returns this kind of data (from documentation):
```json
{
  "windows": [
    {
      "start_utc": "2026-06-21T11:32:00Z",
      "end_utc": "2026-06-21T13:08:00Z",
      "score": 94,
      "rationale": "Strong Venus trine Jupiter, Moon domicile in Cancer, Mercury direct...",
      "factors": [
        { "name": "Venus △ Jupiter", "weight": 18, "direction": "positive", "observation": "Applying trine, orb 2°" },
        { "name": "Moon in Cancer", "weight": 14, "direction": "positive", "observation": "Domicile, waxing" },
        { "name": "Mercury direct", "weight": 10, "direction": "positive" },
        { "name": "Mars □ Saturn", "weight": -4, "direction": "negative", "observation": "Separating square" }
      ]
    }
  ]
}
```

The API returns **technical** names and weights. **The screen shows friendly paragraphs.** That's the translation layer.

**The translation strategy:**

Approach: **factor-to-phrase dictionary on the Cloudflare Worker.**

```typescript
// worker/src/translations.ts
const FRIENDLY_PHRASES = {
  "Venus △ Jupiter": {
    short: "Venus brings warmth",
    full: "Venus brings warmth to this window. Love and growth move together — a particularly tender energy for new beginnings."
  },
  "Moon in Cancer": {
    short: "Moon grounded in Cancer",
    full: "The Moon is in Cancer, grounded and steady. A good foundation for lasting promises."
  },
  "Mercury direct": {
    short: "Mercury clear",
    full: "Mercury runs clear, so communication will flow easily throughout the day."
  },
  "Mars □ Saturn": {
    short: "Mars-Saturn friction",
    full: "There's one small thing to know: Mars and Saturn cross paths. A bit of friction is possible — manageable, not blocking."
  },
  // ... ~50-80 entries to cover the most common factor combinations
};
```

**This is feasible but is real work**, not free. Estimated effort:
- 50-80 friendly phrase entries hand-written
- Each ~2 versions (short for cards, full for detail screen)
- 4-8 hours of copywriting work
- Should be done by someone with both astrological literacy and good editorial sense

**Coverage strategy:**
- The API has 31 factors. With ~10 most common factor names and their inverses (square / trine / sextile / opposition / conjunction), realistic coverage is ~50-60 unique strings.
- For factors not in the dictionary, fall back to a generic short phrase: "[Factor name] adds to this moment's character."

**Level 3 (technical view):** For users who tap "See technical details", show the raw API response with mono font — exactly as we designed in v1 Cosmic Brutalism. No translation needed.

**Verdict:** ✅ Feasible with translation layer. **Critical infrastructure** — should be built into Worker early, not as an afterthought. Treat the phrase dictionary as a content asset, not just code.

---

### 05 — Your Moments

**What the screen shows:** Saved moments list (Coming up / Behind you) with friendly quotes.

**API requirement:** None for rendering. All data is local (MMKV).

**Compatibility:**
- ✅ Each saved moment stores: window data, friendly quote, score grade
- ✅ When the user saves a moment, we snapshot the API response and the translated phrases — no need to call the API again to display the card.
- ✅ "in 3 days" countdown — computed locally from current time vs. saved window.

**Verdict:** ✅ Zero API dependency. Pure local feature.

---

### 06 — Paywall

**What the screen shows:** Pro upsell with plan selection, feature list, Continue / Restore CTAs.

**API requirement:** None. RevenueCat handles purchases.

**Verdict:** ✅ No dependency.

---

## Cross-screen architectural concerns

### 1. Where does the translation layer live?

**Options:**
- **Client-side**: Phrase dictionary bundled into the mobile app. Pro: works offline. Con: every microcopy update requires an App Store release.
- **Server-side (Cloudflare Worker)**: Worker calls API, translates factors to phrases, returns "enriched" response. Pro: instant copy updates, no App Store cycle. Con: requires online state.

**Recommendation: Server-side, with offline cache.**

The Worker becomes the **content authority**. Mobile app receives pre-translated, friendly responses. This means:
- Copywriters can iterate on phrases without engineering deploys
- One translation system serves all platforms (when web companion comes later)
- API key still protected on Worker (as already planned)

**Update to CLAUDE.md**: Add "Translation layer" to Worker responsibilities.

### 2. Caching strategy with translations

The Worker already caches `/electional/search` responses in KV for 7 days. **The translated responses can be cached too**, but we need a versioning scheme:
- Cache key: `{request_hash}:{translations_version}`
- When phrase dictionary updates → bump `translations_version` → cache invalidated naturally

This way, copy updates don't require manual cache flushing.

### 3. Moon phase data — open item

The screen shows a waxing-crescent moon glyph as ambient decoration. We need to know the actual moon phase for any given date to display correctly.

**Options:**
- ❓ Check if `/electional/search` includes moon phase metadata per window (likely yes — it's a core electional factor)
- If not: compute locally using a small JS library (~5KB) like `moonphase` or `lune` — moon phases are deterministic and cheap to compute client-side

**Recommendation:** Compute locally. No API dependency, accurate, instant.

### 4. Notifications copy (v1.3 feature, not MVP)

For "Favorable window in 3 days" notifications, the friendly phrase needs to be saved at the moment of saving. Worker should return both the technical response AND the pre-translated friendly version — we store both in MMKV at save time. This way, push copy is identical to what user saw when they saved.

---

## What the API does NOT give us (intentional, designed-around)

The following are **not API problems** — they're features we deliberately moved out of API scope:

| Feature | Where it lives | Reason |
|---|---|---|
| Saved moments storage | Local MMKV | Privacy-first, no account |
| Search history | Local MMKV | Same |
| Free search counter | RevenueCat anon attributes | Anti-abuse |
| Geocoding (city → lat/lng) | Nominatim / Mapbox | API expects coordinates |
| Moon phase | Local computation | Deterministic, cheap |
| Friendly translations | Cloudflare Worker | Copy authority on server |
| "About 2 months, 5 days" formatting | Client-side date math | Trivial |
| Calendar countdown ("in 3 days") | Client-side | Real-time |

This is all by design. The API does one thing well (electional scoring) and we wrap it with consumer UX.

---

## What I recommend verifying in the first sprint

Before writing a single line of React Native code, run these checks against the actual API:

1. **Does `/electional/search` return a `heatmap[]` array of day-level scores?**
   - If yes: Calendar screen works out of the box
   - If no: Need to talk to API provider or reduce Calendar resolution

2. **Does the response include `factors[]` with names, weights, directions, and observations?**
   - If yes: Translation layer is straightforward
   - If no: Need to use only `rationale` text field, harder to map to friendly phrases

3. **Does the response include moon phase or lunar info per window?**
   - If yes: Skip local moon calculation
   - If no: Use local library

4. **What's the latency for a 3-month search range with `top_n_windows=10`?**
   - Target: under 2 seconds with cold cache
   - If higher: pre-warm KV cache for common queries (popular cities + common ranges)

5. **What's the actual freemium quota? 50 requests/month is what marketing says — confirm.**
   - With 7-day Worker KV cache, real consumption is much lower
   - But we need to know absolute limits

**This is a 1-day task with Postman.** Should happen in Day 1 of development sprint.

---

## Final verdict

**The API and the design fit together well**, with three caveats:

1. **The translation layer is mandatory infrastructure**, not optional polish. Without it, the app reverts to v1 Cosmic Brutalism territory.

2. **Heatmap data availability needs verification.** Highest-risk unknown.

3. **CLAUDE.md needs an update** to capture the v2 architecture decisions:
   - Server-side translation layer
   - Phrase dictionary as content asset
   - Local moon phase computation
   - Reduced API call frequency due to translation caching

**My estimate for the v2 design vs. API compatibility: 92%** (with translation layer built; 60% without).

The good news: the translation layer is well-bounded work (a few days of copywriting + a Worker module), not an architectural rewrite. The v2 design **does not require a different API or a re-think of data model** — only a better wrapping of what the API already produces.

---

## What to do next

1. **Verify the 5 questions** above with Postman (1 day)
2. **Begin phrase dictionary** for the translation layer (parallel work, 2-3 days)
3. **Update CLAUDE.md** with v2 architecture decisions
4. **Show the boss the 9-screen design** with this audit attached as backup — proves the design is buildable, not just pretty
5. **Then begin React Native sprint** per the Roadmap in CLAUDE.md

---

*Audit completed against astrology-api.io v3 electional endpoint. Architecture: mobile (Expo) → Cloudflare Worker (proxy + translation + cache) → astrology-api.io.*
