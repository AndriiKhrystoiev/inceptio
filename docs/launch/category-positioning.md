# Inceptio — Category Positioning (full analysis)

> Decision summary lives in `app-store-metadata.md` → ## Category. This file is the
> reasoning behind it. Pre-launch, iOS, en/US first.

## Decision
- **Primary: Lifestyle** — honest fit, right audience, only realistic featuring surface.
- **Secondary: Utilities** — genuine timing-tool surface, weak competition, free discovery.

## Evidence (live iTunes Search API, US, 2026-06-11)
Every premium consumer astrology app is **Lifestyle primary**:

| App | Primary | Genres |
|---|---|---|
| CHANI | Lifestyle | Lifestyle, Health & Fitness |
| Co–Star | Lifestyle | Lifestyle, Social Networking |
| Nebula | Lifestyle | Lifestyle, Reference |
| The Pattern | Lifestyle | Lifestyle |
| Sanctuary | Lifestyle | Lifestyle, Reference |
| Moonly | Lifestyle | Lifestyle, Health & Fitness |

The Vedic timing utilities (muhurat / auspicious-time / planetary-hours) sit in
**Utilities**.

**[Correction 2026-06-12]** An earlier draft justified the split via "**Horaly** — the
closest cousin — straddles Lifestyle + Utilities, so mirror it." That precedent is **void**:
"Horaly" was a misidentification (horary tools, a separate branch; no consumer electional
competitor exists — see `01-research/competitor-creative-teardown.md`). The
**Lifestyle-primary + Utilities-secondary split stands on its own merits**, not on any
competitor precedent — Lifestyle for audience-match + editorial featuring; Utilities as a
genuine timing-tool surface with weak competition and free discovery.

## Candidates evaluated

| Option | Truth fit | Competition | Audience | Featuring | Verdict |
|---|---|---|---|---|---|
| **Lifestyle** | High (6/6 leaders here) | Fortified (CHANI, Nebula 170k) | High | **High** | **Primary** |
| **Utilities** | High (it is a timing tool) | **Weak** (mostly 0–18 ratings) | Medium | Low | **Secondary** |
| Reference | Low (not a reference work) | Sleepy | Low | Low | Fallback only |
| Health & Fitness | Low–Med | — | Low | Med | **Avoid** (5.1.1 risk) |

## Why Lifestyle primary despite an unwinnable chart
The category framework says "pick the highest audience-match category where you can
plausibly reach top-100 in 6 months." By that strict test Lifestyle *fails* (fortified)
and Utilities *wins* (rankable). Recommendation is still Lifestyle because:

- For a **solo, no-paid-UA, pre-launch** app, top-100 charts are out of reach in *either*
  category near-term → chart-rankability is a weak tiebreaker.
- What's left — audience-match, search relevance, **editorial featuring** — all point to
  Lifestyle. Featuring is one of the only free growth levers, and Apple curates astrology
  / "new beginnings" there (New Year intentions, wedding season). Inceptio's fresh-start
  angle fits those collections.
- Utilities as **secondary** still fishes the rankable, weak-competition niche surface
  for free.

## Risks & mitigants
- **4.3 (duplicate/spam)** is the real review threat in crowded Lifestyle. Mitigant:
  electional-not-horoscope differentiation + "real planetary positions, never predictions"
  voice → clean review narrative. Lean on it in the review notes.
- **Health & Fitness avoided** specifically to stay clear of 5.1.1 medical scrutiny —
  consistent with surgery being deferred to v1.4 for App Store medical-content risk.
- **Don't over-index on featuring.** Pitch it (worth the email), but the plan is search
  relevance + word of mouth; featuring is upside, not the channel.

## Post-launch revisit
Set once now (no re-indexing cost pre-launch). If 8–12 weeks show Inceptio charting in a
Utilities sub-surface AND Lifestyle featuring hasn't materialized, *then* test
Utilities-primary. Not before.

## Play Store (later, for de/fr/es-419/pt-BR)
No astrology category on Play either → **Category: Lifestyle**. _[Correction 2026-06-12]_
Play **tags come from Google's fixed per-category list, not free text** — you cannot tag
literal "electional"/"timing"; pick the closest available Lifestyle tags. Carry the
electional/timing intent in the **indexed title + short description + full description**
instead (Play indexes all three — that's where the keywords live). Handle in the localization
pass. See `play-store-metadata.md`.

## Next handoffs
- `app-store-featured` — featuring lives in Lifestyle; this is the biggest free lever.
- `aso-audit` — pressure-test the full listing now the category frame is set.
