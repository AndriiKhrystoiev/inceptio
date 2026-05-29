# Daily Note — picker / backend data contract (authoritative)

Everything the **Today daily-note section** needs the backend to return for the
rendered states to work, plus an explicit split of what the **mobile client
computes locally**. This is the source of truth for the architecture session.

Locked copy (spec §6/§7) is referenced as text; the fields below are the
*structured data* behind it.

---

## 1. Saved-search lifecycle — the state set

`state` is an enum on each saved search. The picker owns it (it is the
authority on viability/timing). Five values:

| `state` | Meaning | Where in lifecycle | Visual tier |
|---|---|---|---|
| `none-yet` | **Active search, no viable window found yet** in the searched range. | **Start of life, and recurring** — set the moment a search is saved and the picker has run with zero qualifying windows; also re-entered if the only window passes and nothing else in range qualifies. Mutually exclusive with `pre-window`. | quiet row — "Travel window — none yet" |
| `pre-window` | A viable upcoming window exists; counting down to it. | After `none-yet`, once a window is found. | quiet row — "Wedding window — in 3 days" |
| `new-window` | A **newly found window that is stronger** than the one previously surfaced. Transient until acknowledged. | Overlays `pre-window`. | **emphasized · bright** card |
| `in-window` | **Now** is between the window's start and end. Transient/time-boxed. | During the window. | **emphasized · warm** card |
| `passed` | The window's end is in the past and it wasn't acted on. | After the window. | quiet row — "Wedding window — passed" |

> **`none-yet` is the new state** (it was not in §6's library). Trigger: search
> is active + picker returned **zero viable windows** in the current search
> range. It sits **alongside/just before `pre-window`** as the pre-result
> counterpart, and can recur post-window. It is **not** an error — the search is
> still working, there's just nothing to surface yet.
>
> **OPEN PRODUCT QUESTION (deferred — not a contract item):** is
> "Travel window — none yet" enough on its own (the user just saved the search,
> so context is fresh), or does the row need to carry a "searched through
> August" affordance from `searched_through`? Decision deferred to the
> architecture session; `searched_through` stays in the contract either way so
> the field exists if the affordance is chosen.

Transitions (per search):
```
saved ─▶ none-yet ─▶ pre-window ─▶ in-window ─▶ passed
                 ▲        │
                 │        └─▶ new-window (stronger one found; → back to pre-window on ack)
                 └──────────── (window passes, nothing else qualifies)
```

---

## 2. Backend MUST return

### Daily note (one object per day)
| Field | Type | Notes |
|---|---|---|
| `mood` | `strong \| good \| mixed \| closed` | **Derived, not independently selected** — returned on the *same object* as the chosen phrase and computed from that phrase's `quality_bucket` metadata. Single source of truth: mood can never drift from the chosen phrase. Drives the tinted dot + hero moon halo. |
| `moon_phase` | 8-phase enum¹ | **Backend only** — ephemeris/astronomy. Drives the hero moon glyph (today hardcoded). Client cannot/should not compute this. |
| `date` | ISO date | The day the note is for. Client formats the "saturday, may 23" eyebrow. |
| `headline` | string ≤ 48 | Locked copy, picker-selected. |
| `supporting` | string ≤ 140 | Locked copy. |
| `exclusion_reason` *(optional)* | enum | Only if a glyph on `closed` days is wanted later. Not required by current design. |

¹ `new · waxing-crescent · first-quarter · waxing-gibbous · full · waning-gibbous · last-quarter · waning-crescent`

### Saved-search status (array; one per saved search)
| Field | Type | Notes |
|---|---|---|
| `id` | stable id | Keying, dedup, ack. |
| `activity` | `wedding \| contract \| business \| travel` | Emoji marker + petal tint. |
| `state` | the §1 enum | Picker is the authority. |
| `window_start` | **timezone-aware** ISO timestamp | Null for `none-yet`. Carries the **event location's** offset (see §4). Client derives relative phrase, day-name, part-of-day. |
| `window_end` | **timezone-aware** ISO timestamp | Null for `none-yet`. Drives "Open until 4:08 this afternoon". |
| `is_stronger` *(or `new_score` + `prior_best_score`)* | bool / ints | Required for `new-window` — the alert claims "stronger"; needs the comparison, not just a new window. |
| `alert_id` + `acknowledged`/`seen` | id + bool | So the `new-window` alert fires **once** and doesn't re-trigger on reopen (spec: "no flash"). Client posts the ack. |
| `priority` / `sort_key` | sortable | Which searches fill the top-3 quiet stack when a user has many. |
| `searched_through` *(optional)* | ISO date | For `none-yet`, enables a future "searched through August" affordance. **Kept in the contract** pending the open UX question (§1) — do not omit. |

### Top level
| Field | Type | Notes |
|---|---|---|
| `total_saved_count` | int | Drives "+N more →". May be the array length if **all** searches are returned; needed explicitly if the array is paginated/capped. |

---

## 3. Client COMPUTES locally

These must **not** arrive as prebuilt strings — they go stale between fetches,
and the locked §6 copy must stay correct. The client composes them from the
structured fields above + the locked template:

| Computed | From | Rule |
|---|---|---|
| Relative phrase — "in 3 days" / "in 2 weeks" / "in a month" / "none yet" | `window_start` vs now (or `state === 'none-yet'`) | Standard relative-time buckets. |
| Day name — "Thursday" | `window_start` | In the **event** timezone. |
| Part-of-day — "morning / afternoon / evening" | `window_start` hour **× backend-defined cutoffs** | The client *applies* the bands but **does not define them**. The hour→band cutoffs are **backend-owned config**, not client config — they must match the Translation Layer's moment-detail `phrase_short` part-of-day rendering, or the same window reads "afternoon" here and "morning" in moment-detail. They're also an astrology-policy choice (where "afternoon" begins is tradition, not UI). Live alongside the synthesizer config in `workers/api-proxy/src/translations/`; the client consumes them. |
| "Open until 4:08 this afternoon" | `window_end` | Time + part-of-day, event tz. |
| The full status string | locked §6.3 activity-noun mapping + the above | `{Activity} window — {relative}`, where the noun (Wedding / Contract / Launch / Travel) is mapped client-side from the `activity` enum per the locked §6.3 library. |
| in/out-of-window self-check | `window_start`/`window_end` vs now | Backend `state` is authoritative; client may self-transition between `pre-window`/`in-window`/`passed` against the timestamps to avoid a forced refetch. |
| "+N more →" count | `total_saved_count` − visible | — |

---

## 4. Cross-cutting flag — timezones

`window_start` / `window_end` must be **timezone-aware in the event location's
zone**, not the device's. "Thursday afternoon" and "Open until 4:08" are in the
local time of *where the event happens* (each saved search has a location). If
timestamps arrive as naive/UTC, the day-name and part-of-day derivations break
for users searching a moment in another city.

---

## 5. Summary — minimum viable additions to the picker output

If nothing else, these are the fields not already implied by existing screens:

1. `moon_phase` (daily note)
2. `state` including the new **`none-yet`** value
3. `window_start` + `window_end` as **tz-aware timestamps** (not strings)
4. `is_stronger` (or score pair) for `new-window`
5. `alert_id` + `acknowledged` for once-only alerting
6. `priority`/`sort_key` and `total_saved_count` for the bounded stack

`activity_label` is **deliberately not** in the contract — the activity-noun
mapping is locked in spec §6.3 and derived client-side from the `activity`
enum, so it can't drift from the audited library.

---

## 6. Forward-looking — library versioning & cache invalidation

*(Not a contract field — a note for the architecture session.)*

When the astrologer rules on BLOCKING #1/#2 and the locked copy library is
updated, **old phrasings must not linger in client cache** after the
coordinated PR ships. The cache layer needs an **invalidation hook keyed to a
library version** (e.g. a `library_version` stamp the client checks, busting
cached daily-note/status copy and the part-of-day cutoffs together) so that a
library update and the part-of-day config in
`workers/api-proxy/src/translations/` roll over atomically — no window can read
the old phrase in one surface and the new one in another.
