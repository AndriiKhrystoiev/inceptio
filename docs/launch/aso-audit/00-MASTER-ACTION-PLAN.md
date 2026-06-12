# Inceptio — ASO Master Action Plan

Generated 2026-06-11 · Audit Mode · Competitor data: live iTunes Search API (US)

> **Start here.** This plan is grounded in a real App Store pull, not assumptions. Drill-downs live in `01-research/` and `03-launch/`.

---

## TL;DR — the strategic call

**Inceptio owns an empty quadrant: premium, Western, intent-led electional astrology.** Don't compete with CHANI/Nebula on "astrology" (you'll lose). Don't impersonate the Vedic muhurat utilities (you'll mismatch). Win the one job nobody serves well: **"tell me the best moment to *begin* this specific thing, beautifully."**

The single line that should drive every store asset:
> **Inceptio tells you *when* to begin — not just *what*.**

---

## What the market actually looks like (verified)

- **Broad astrology terms are owned by giants serving a different job.** CHANI (54k ratings, 4.9), Nebula (170k), TimePassages (44k) rank for "electional"/"wedding date astrology"/"best day astrology" but sell birth charts & horoscopes — **none does election search.**
- **The timing-intent niche is real but weak and Vedic.** "Muhurat"/"auspicious time" results are low-design utilities, mostly 0–18 ratings (Drik Panchang at 5.6k is the exception). They prove demand and cede design + Western framing entirely.
- **No direct competitor.** _[Correction 2026-06-12]_ An earlier "one cousin to watch — *Horaly: Planetary Hours*" note was a **misidentification** (horary tools, a separate branch — horary ≠ electional). No consumer electional app exists; the only adjacents are professional *desktop* tools (Father Time, AstroApp, Time Nomad). See `01-research/competitor-analysis.md`.

Full detail → `01-research/competitor-analysis.md`, `01-research/market-gaps.md`.

---

## Metadata — LOCKED (single source of truth; do not duplicate here)

Metadata is **LOCKED**. To stop this plan drifting from the real values, it does **not** copy
them — reference only:

- **iOS source of truth → [`../app-store-metadata.md`](../app-store-metadata.md)** — Title,
  Subtitle, Keywords, Promo, Description.
- **Play variant → [`../play-store-metadata.md`](../play-store-metadata.md)**
- **Keyword decisions → [`01-research/keyword-pressure-test.md`](01-research/keyword-pressure-test.md)** — `muhurat` = **EXCLUDE v1**.

---

## Action sequence

| # | Action | Command | Status |
|---|---|---|---|
| 1 | ~~Stakeholder sign-off: title direction + `muhurat`~~ — **RESOLVED** (title & subtitle locked; `muhurat` = EXCLUDE v1) | — | ✅ |
| 2 | Set up ASC credentials (`~/.aso/` not present yet) | `/aso-connect setup` | ⏳ blocked |
| 3 | Generate screenshot specs (highest conversion lever) | `/aso-assets screenshots` | ⏳ |
| 4 | Generate legal docs | `/aso-manage legal` | ⏳ |
| 5 | Create version + sync metadata | `/aso-release create 1.0.0` → `/aso-connect sync` | ⏳ |
| 6 | Verify readiness | `/aso-connect status` | ⏳ |
| 7 | Submit (consider phased release) | `/aso-release submit` | ⏳ |
| 8 | Watch reviews for Vedic/`auspicious` mismatch + empty-result signals | `/aso-manage reviews --negative` | ⏳ post-launch |

Detailed gating → `03-launch/prelaunch-checklist.md`.

---

## Highest-leverage moves (in priority order)
1. **Screenshots that sell the *when*.** In a keyword-poor category, the screenshot promise converts more than the keyword field. Lead caption: "Know *when* to begin."
2. **Lean on the honest trust anchor.** TimePassages weaponizes "real astrologers, not AI." Pre-review, Inceptio's honest anchor is **"real planetary positions + the centuries-old method"** — say *that* plainly now. The **astrologer-reviewed** claim is the same asset *once earned*, but is **gated on the astrologer ruling (§11.4)** — don't claim it until the review is done (no-overclaim rule).
3. **Own `electional` + `auspicious` now**, before anyone else names them.
4. **Frame empty results as wisdom** in copy/screenshots, so the product's frequent "no viable windows" state reads as integrity, not failure.

---

## Output files
```
outputs/inceptio/
├── 00-MASTER-ACTION-PLAN.md        ← you are here
├── apple-metadata.md               (SUPERSEDED — see banner; use ../app-store-metadata.md)
├── 01-research/
│   ├── competitor-analysis.md      (live App Store pull, tiered)
│   ├── keyword-list.md             (SUPERSEDED snapshot — see banner)
│   └── market-gaps.md              (positioning map + differentiators)
└── 03-launch/
    └── prelaunch-checklist.md      (full gating checklist)
```
