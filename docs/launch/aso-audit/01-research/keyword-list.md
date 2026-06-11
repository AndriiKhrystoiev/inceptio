# Inceptio — Keyword Research & Gaps

Based on live iTunes search-surface data (2026-06-11) and the competitor split in `competitor-analysis.md`.

---

## Keyword opportunity matrix

Volume = rough intent traffic (qualitative, from how saturated the search surface is). Competition = strength of apps currently ranking. Fit = relevance to Inceptio's actual job-to-be-done.

| Keyword | Volume | Competition | Fit | Verdict |
|---|---|---|---|---|
| `electional` | Low | **None by name** | Perfect | **Own it.** Uncontested, exact-match for the method. |
| `auspicious` | Med | Vedic utilities only | High | **Own it.** Broadly understood, premium-compatible, weak field. |
| `muhurat` | Med | Vedic, weak | Medium ⚠️ | **Conditional** — traffic mismatch risk (see decision below). |
| `moment` | Med | Diffuse | High | Take it — on-brand, low contention. |
| `wedding` | High | General apps | High | Take it — top activity, intent-qualified. |
| `launch` | Med | Generic | High | Take it — business-launch activity. |
| `timing` | Med | Horaly et al. | High | In title. |
| `astrology` | Very High | **Brutal** (CHANI/Nebula) | Med | Include once; don't anchor on it. |
| `horoscope` | Very High | Brutal | Low | Token presence only; not our intent. |
| `zodiac`/`moon`/`planet` | High | Saturated | Med | Cheap relevance signals; keep. |
| `lucky` | High | Generic/Vedic | Med | Discovery-only (never in UI copy). Keep. |
| `calendar` | High | Mixed | High | Strong — Inceptio *is* a timing calendar. |
| `panchang`/`choghadiya`/`rahu kaal` | Med | Vedic | **None** | **Avoid** — we don't deliver these; bad reviews if we rank. |

---

## The `muhurat` decision (flag for stakeholder)

`muhurat` is the highest-volume *intent-matched* term in the niche — but its searchers are looking for **Vedic Panchang** (Tithi, Choghadiya, Rahu Kaal, Nakshatra). Inceptio uses **Western/Hellenistic traditional electional** astrology. Ranking for `muhurat` will pull traffic whose expectations the app does not meet → risk of 1–3★ "where is the Panchang?" reviews that depress the rating that matters most early.

**Recommendation:** keep `muhurat` in the keyword field for v1.0 (it's the single biggest niche term and the downside is review-noise, not rejection), **but** monitor early reviews. If mismatch complaints appear, swap it for `ceremony` or `journey`. Revisit as a deliberate localization play (a real Vedic mode) in a later version rather than borrowing the keyword now. Do **not** put `muhurat` anywhere user-facing.

---

## Recommended keyword field (unchanged from quick pass — validated against real data)

```
astrology,electional,moment,horoscope,zodiac,moon,planet,lucky,date,wedding,launch,muhurat,calendar
```
99/100 chars · singular forms · no spaces · no title/subtitle overlap.

**Tighter alternative if dropping `muhurat`** (Western-pure, 97/100):
```
astrology,electional,moment,horoscope,zodiac,moon,planet,lucky,date,wedding,launch,ceremony,calendar
```

## Gaps the incumbents leave wide open
- **Intent verbs:** "best time to start", "when to begin", "right day to" — nobody owns the *decision* framing. Carry it in subtitle + screenshots (indexed via subtitle, reinforced by captions).
- **Activity-specific timing:** "wedding date", "business launch date", "contract signing day", "travel day" — long-tail, high-intent, zero dedicated apps.
- **Western traditional timing for consumers:** the entire lane between CHANI's warmth and the Vedic utilities' function.
