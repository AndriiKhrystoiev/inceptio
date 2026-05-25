# Inceptio — Postman Verification Guide

> Verify the 5 critical assumptions about astrology-api.io v3 before the React Native sprint starts.
> Expected time: 60-90 minutes total.

---

## Setup (5 minutes)

### Step 1. Get an API key

1. Go to https://astrology-api.io
2. Sign up for the free tier (50 requests/month)
3. Get your API key from the dashboard
4. Save it somewhere safe — we'll use it in every request

### Step 2. Configure Postman environment

Create a new environment in Postman called **"Astrology API"** with these variables:

| Variable | Initial Value | Notes |
|---|---|---|
| `BASE_URL` | `https://api.astrology-api.io/api/v3` | Production endpoint |
| `API_KEY` | `your-key-here` | Replace with your actual key |

Save the environment and make sure it's active (top-right dropdown in Postman).

### Step 3. Pre-flight check

**Quick smoke test** — make sure the API responds at all.

**Request:**
- Method: `GET`
- URL: `{{BASE_URL}}/health`
- Headers: `X-API-Key: {{API_KEY}}`

**Expected:** 200 OK with some kind of status response. If you get 401, the API key is wrong. If you get 404, the health endpoint doesn't exist — that's fine, skip this step and go to Request 1.

If the API doesn't respond at all, **stop here** and check API status / contact support before doing the rest.

---

## The 5 critical questions

Each request below tests one specific assumption. Run them in order, save results, then we'll analyze together.

---

### Request 1 — Does the response include a `heatmap[]` array?

**This is the highest-risk question.** Calendar screen depends entirely on this.

**Method:** `POST`
**URL:** `{{BASE_URL}}/electional/search`
**Headers:**
```
Content-Type: application/json
X-API-Key: {{API_KEY}}
```

**Body (raw JSON):**
```json
{
  "activity": "wedding",
  "date_range": {
    "start_date": { "year": 2026, "month": 6, "day": 1 },
    "end_date": { "year": 2026, "month": 6, "day": 30 }
  },
  "location": {
    "year": 2026,
    "month": 6,
    "day": 1,
    "hour": 12,
    "minute": 0,
    "city": "Kyiv",
    "country_code": "UA"
  },
  "top_n_windows": 5
}
```

**What to check in the response:**

1. **Status code 200?** If not — copy the error response and stop.
2. **Search for a top-level key called `heatmap`** (Cmd+F in the response panel)
3. If found:
   - Is it an array?
   - How many entries does it have? (Should be 30 — one per day in June 2026)
   - What's the structure of each entry? Document the fields you see.
4. If NOT found:
   - Is there a similar field like `daily_scores`, `day_grades`, `pass_one`, or anything date-keyed?
   - Document what you DO see at the top level (list all keys)

**Save this response.** Name it `heatmap-check.json` and keep it.

---

### Request 2 — Does each window include a `factors[]` array with names and weights?

**This determines whether the translation layer is feasible.**

Use the **same response from Request 1** — no new API call needed.

**What to check:**

1. Find the `windows[]` array (or whatever the API calls it — might be `results`, `moments`, `best_times`)
2. Take the first window
3. **Search for a key called `factors`** inside the window object
4. If found, document the structure of each factor. We expect something like:
   ```json
   {
     "name": "Venus trine Jupiter",
     "weight": 18,
     "direction": "positive",
     "observation": "..."
   }
   ```
   But the real shape may differ — write down whatever fields you actually see.
5. If `factors` is NOT there, check for: `breakdown`, `components`, `aspects`, `reasons`, `rationale_items`.

**Critical sub-questions:**
- Are factor `name` fields **technical** (like "Venus △ Jupiter") or **already friendly** (like "Strong Venus")?
- Are weights numeric (`+18`, `-4`) or qualitative (`"strong"`, `"weak"`)?
- Is there a `direction` field (positive/negative) or only weight sign?

**Save:** screenshot the structure of the first 3 factors. Or paste them into a notes file.

---

### Request 3 — Is moon phase data included?

**This affects whether we need a separate library for the moon glyph.**

Use the **same response from Requests 1-2** — no new call.

**What to check:**

1. Search the response for these keys: `moon_phase`, `lunar_phase`, `moon`, `phase`
2. Check both at the top level AND inside individual windows
3. If found, what's the format? Likely options:
   - Named string: `"waxing_crescent"` or `"first_quarter"`
   - Numeric: `0.27` (where 0 = new, 0.5 = full)
   - Object: `{ "phase": "waxing", "illumination": 0.34 }`
4. If NOT found — that's OK, we have a local fallback.

**No save needed.** Just document yes/no and format.

---

### Request 4 — What's the actual latency for typical queries?

**This determines UX expectations and caching strategy.**

Run **3 separate requests** to measure latency:

#### Request 4a — Short range, single window

Same as Request 1, but change `top_n_windows` to `1` and `date_range` to 7 days only:

```json
{
  "activity": "contracts",
  "date_range": {
    "start_date": { "year": 2026, "month": 5, "day": 25 },
    "end_date": { "year": 2026, "month": 6, "day": 1 }
  },
  "location": {
    "year": 2026, "month": 5, "day": 25, "hour": 12, "minute": 0,
    "city": "Kyiv", "country_code": "UA"
  },
  "top_n_windows": 1
}
```

**Record:** Time in Postman (bottom right of response panel)

#### Request 4b — Medium range, 5 windows

Same as Request 1 (3 months, 5 windows).

**Record:** Time.

#### Request 4c — Long range, 10 windows

```json
{
  "activity": "wedding",
  "date_range": {
    "start_date": { "year": 2026, "month": 6, "day": 1 },
    "end_date": { "year": 2026, "month": 12, "day": 1 }
  },
  "location": {
    "year": 2026, "month": 6, "day": 1, "hour": 12, "minute": 0,
    "city": "Kyiv", "country_code": "UA"
  },
  "top_n_windows": 10
}
```

**Record:** Time.

**Then immediately re-run Request 4c.** Cache hit should be MUCH faster.

**Save:** Four latency values:
- 4a (7 days, 1 window) cold: _____ ms
- 4b (3 months, 5 windows) cold: _____ ms
- 4c (6 months, 10 windows) cold: _____ ms
- 4c (6 months, 10 windows) cached: _____ ms

---

### Request 5 — What does the freemium quota actually look like?

**This affects our cost projections.**

1. Open your Astrology API dashboard
2. Find the section showing your **API usage** / **request count**
3. Document:
   - How many requests have you used (after running Requests 1-4, should be 5-6)
   - What's the monthly limit?
   - Is there a daily limit?
   - When does it reset?
   - What happens when limit is reached? (Soft cap with warnings, hard 429, etc.)
4. Look at pricing page — what are the paid tier limits? (Document the first 1-2 paid tiers.)

**No new API call needed.** Just dashboard exploration.

---

### Bonus Request 6 — Excluded ranges (Mercury retrograde)

The screen shows "Mercury is sleeping" callouts. Check that the API returns this.

In Request 1's response, search for keys: `excluded_ranges`, `exclusions`, `retrograde_periods`, `cautions`.

**Document:**
- Are excluded periods returned?
- What's the structure? (start_date, end_date, reason?)
- Does the reason include the technical name (`"mercury_retrograde"`) or friendly (`"Mercury retrograde"`)?

**No save needed.** Just yes/no + structure.

---

### Bonus Request 7 — Activity validation

Test that the 4 MVP activities we plan to use are actually accepted.

For each activity below, run Request 1 with that activity name. Just check **status code** — don't dig into response.

| Activity name to try | Expected status |
|---|---|
| `wedding` | 200 |
| `contracts` (note: plural) | 200 |
| `business_launch` | 200 |
| `travel` | 200 |

If any returns 400 with "invalid activity", **the name is different**. Try common variants: `contract` (singular), `business`, `launch`.

Document any mismatches.

---

## Result reporting template

After running all requests, fill out this summary and send back. It'll let me make final architectural decisions.

```
=== INCEPTIO API VERIFICATION RESULTS ===

Date verified: _______________

=== Q1: HEATMAP ===
Heatmap array present?       YES / NO
Top-level key name:          _________________
Number of entries:           ____
Sample entry structure:
  {
    "______": "______",
    "______": "______"
  }

=== Q2: FACTORS ===
Factors array present in windows?  YES / NO
Key name in window:               _________________
Fields per factor:
  - name:        present? YES/NO    sample value: _________________
  - weight:      present? YES/NO    type: number/string
  - direction:   present? YES/NO    sample value: _________________
  - observation: present? YES/NO    
  - other:       _________________
  
Factor names look like:
  [ ] Technical (e.g. "Venus △ Jupiter")
  [ ] Semi-friendly (e.g. "Strong Venus")  
  [ ] Fully friendly (e.g. "Venus brings warmth")

=== Q3: MOON PHASE ===
Moon phase data present?     YES / NO
Where:                       top-level / per-window / both
Format:                      ____________
Sample value:                ____________

=== Q4: LATENCY ===
Q4a (7 days, 1 window) cold:        ____ ms
Q4b (3 months, 5 windows) cold:     ____ ms
Q4c (6 months, 10 windows) cold:    ____ ms
Q4c (6 months, 10 windows) cached:  ____ ms

=== Q5: QUOTA ===
Free tier:
  Monthly limit:          ____
  Daily limit:            ____  (or "none")
  Reset day:              ____
  Limit-reached behavior: ____

Paid tier 1:
  Price:           $____ / month
  Monthly limit:   ____ requests

=== Q6: EXCLUDED RANGES ===
Returned?                    YES / NO
Field name:                  ____________
Sample reason value:         ____________

=== Q7: ACTIVITY NAMES ===
wedding:         OK / 400 (actual name: _______)
contracts:       OK / 400 (actual name: _______)
business_launch: OK / 400 (actual name: _______)
travel:          OK / 400 (actual name: _______)

=== OPEN QUESTIONS / SURPRISES ===
Anything else weird, unexpected, or worth flagging:
_______________________________________________
_______________________________________________
```

---

## Tips while running requests

**Save every response.** Even ones that seem boring. Use Postman's "Save Response → Save as Example" feature. Later, we can read these examples to design exact TypeScript types and Zod schemas.

**Don't waste your 50 free requests.** Each of Requests 1-4 + bonus = ~8 calls. You have plenty. But avoid re-running things you already have answers for.

**Format JSON in responses for readability.** Postman has a "Pretty" button at the top of the response panel.

**If something looks weird, screenshot it.** Don't try to interpret — just capture and we'll figure out together.

**If you hit an error you can't explain, paste the full response into our chat.** Don't guess.

---

## What I'll do with your results

Once you send back the filled-out summary above, I'll:

1. **Confirm or revise the v2 architecture** in CLAUDE.md
2. **Write exact Zod schemas** for the API response based on real data
3. **Decide on heatmap fallback strategy** if `heatmap[]` isn't returned
4. **Calibrate the translation layer dictionary** to match real factor names from API
5. **Set realistic latency targets** for the React Native UI (skeleton screen timing, etc.)
6. **Plan the freemium → paid tier transition** point for scaling

After verification, we'll have **everything** needed to start the React Native sprint with no unknowns.

---

## Time estimate

- Setup: 5 min
- Requests 1-3: 10 min (same response, just inspecting)
- Request 4 (latency): 15 min (4 calls + waiting)
- Request 5 (quota): 5 min (dashboard)
- Requests 6-7: 15 min
- Filling out the summary: 10 min

**Total: 60 minutes**, give or take. Plus 30 min buffer for surprises.

Set aside an unhurried hour and walk through it. When done, paste the filled summary back here.

---

*Verification guide for astrology-api.io v3 electional endpoint. Date: project pre-sprint phase.*
