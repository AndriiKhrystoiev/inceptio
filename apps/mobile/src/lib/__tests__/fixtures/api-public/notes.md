# api-public fixture notes
Captured: 2026-06-23

## Confirmed envelope shape (200)

Top-level keys: `success`, `data`, `metadata`, `warnings`, `pagination`

```
{
  "success": true,
  "data": {
    "top_windows": [...],
    "summary": {
      "viable_windows_count": <int>,
      "no_viable_windows": <bool>,
      ...
    },
    "heatmap": [...],
    "excluded_ranges": [...]
  },
  "metadata": {
    "cache_hit": <bool>,
    "calculation_time_ms": <int>,
    ...
  },
  "warnings": [...],
  "pagination": {...}
}
```

### search-200.json provenance

Request that produced `search-200.json`:
- Method: POST
- URL: https://api-public.astrology-api.io/api/v3/electional/search
- Payload: `{"activity":"wedding","date_range":{"start_date":{"year":2026,"month":7,"day":1},"end_date":{"year":2026,"month":7,"day":7}},"location":{"year":2026,"month":7,"day":1,"hour":12,"minute":0,"latitude":50.45,"longitude":30.52,"timezone":"Europe/Kyiv","city":"Kyiv"},"top_n_windows":10}`
- HTTP result: 200
- `data.top_windows` count: 10 (all grade `caution`, scores 38–48)
- `summary.no_viable_windows`: true (no windows scored ≥ 60 in 7-day wedding range for Kyiv in July 2026)

Wider-range attempts (business_launch/travel 2026-07-01 to 2026-09-30; contracts 2026-07-01 to 2027-06-30) returned `top_windows: []` — the 7-day wedding result was the only one with populated `top_windows` and is the canonical fixture.

Per CLAUDE.md: `no_viable_windows: true` + populated `top_windows[]` (caution grade) is normal behavior for short searches. Task 2.x tests should cover both states.

### top_windows[0] shape (representative)

Each window object has: `rank`, `start`, `end`, `duration_minutes`, `score`, `grade`, `factors[]`

Each factor has: `factor_id`, `category`, `observation`, `contribution`, `weight_class`, `status`, `score`, `rationale_short`, `details`

Verified factor_ids present in the fixture: `venus_dignified_direct_well_aspected`, `moon_waxing_increasing_light`, `moon_applying_to_benefic`, `house_ruler_dignified_well_placed`, `asc_and_house_ruler_in_reception_or_aspect`, `jupiter_angular_or_aspecting`, `planetary_hour_match`, `house_free_of_malefic`, `mercury_dignified_direct_not_combust`, `asc_ruler_strong`, `no_malefic_on_angle`, `part_of_fortune_in_good_house`

Note: `duration_minutes: 1` window observed — minimum window confirmed. Duration-aware display in Moment Detail is warranted.

---

## 422 detail shape

`search-422.json` — HTTP 422, Content-Type: application/json

FastAPI validation error format:
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "<field_name>"],
      "msg": "Field required",
      "input": { <original_input> }
    }
  ]
}
```

Error mapping rule: `HTTP 422` → surface as validation / bad-request error; `detail[].msg` is suitable for debug logging but not user-facing.

---

## 429 shape

**429 WAS observed.** Triggered at ~5–6 rapid successive requests.

**Critical finding: The 429 is a Cloudflare-layer rate limit, NOT a FastAPI-level 429.**

- HTTP status: 429
- Content-Type: `text/plain; charset=UTF-8` (NOT `application/json`)
- Body verbatim: `error code: 1015`
- Headers include: `retry-after: 10`, `server: cloudflare`
- Cloudflare error 1015 = "You are being rate limited"

**Implication for Task 2.x error mapping:**
- Cannot parse body as JSON on 429
- Must detect 429 from HTTP status only
- Should respect `retry-after` header (value: `"10"` seconds observed)
- The soft-block logic must handle `content-type: text/plain` body safely (no JSON.parse)
- This is a CDN/infrastructure rate limit, not an API quota. The actual upstream API may have its own rate limits that are not yet characterized.

---

## Action items

1. **EXTERNAL BLOCKER (Phase 4):** Confirm with astrology-api.io that the keyless public tier (`api-public.astrology-api.io`) is a supported permanent mode. The OpenAPI spec still declares `BearerAuth` security — unclear if the public endpoint is an intentional free tier or a temporary/development convenience. This must be resolved before production launch.

2. **Task 2.x error mapping:** The 429 response body is plain text (`error code: 1015`), not JSON. The fetch client must not assume JSON on non-2xx responses. Recommend: check `Content-Type` or wrap `response.json()` in try/catch, fallback to `response.text()`.

3. **Task 2.x tests:** Include a no-viable-windows scenario (fixture: `search-200.json` already has `summary.no_viable_windows: true`). Add a separate fixture for a viable-windows response if needed (requires a future call with a more favorable astrological period or different location).
