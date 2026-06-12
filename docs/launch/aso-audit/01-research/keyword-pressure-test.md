# Inceptio — Keyword field pressure-test (en/US iOS)

> **Status: PROPOSAL.** Stakeholder decides. Does not modify any locked decision in
> `docs/launch/app-store-metadata.md`.
> **Baseline under test** (the real locked field, from `app-store-metadata.md`):
> `electional,astrology,timing,wedding,launch,travel,planetary,ceremony,moon,start,date,zodiac` (91/100)
> The `astrology,electional,moment,horoscope,...,muhurat,calendar` field in
> `keyword-list.md` is the older furkancingoz audit-snapshot — **superseded reference**,
> reconciled below, not the decision.

Scope: en/US, iOS only. Play + de/fr/es-419/pt-BR stay deferred to the localization pass.

---

## What's already indexed elsewhere (don't spend keyword chars on these)

Apple indexes Name, Subtitle, and the keyword field separately, then builds search
phrases by **combining words across all three**. So these are already working and must
**not** be duplicated in the keyword field:

- **Name** `Inceptio: Find Your Moment` → `inceptio`, `find`, `your`, `moment`
- **Subtitle** `Find auspicious days to begin` → `auspicious`, `days`(→`day`), `begin`, `to`

Consequences: `moment`, `auspicious`, `day`/`days`, `begin` are **off-limits** for the
keyword field (the old snapshot wasted a slot on `moment` — correctly dropped in baseline).
Every keyword-field word should earn its place *and* combine well with the above
(`auspicious wedding`, `best day`, `find date`, etc. form for free).

---

## Bottom line (proposed)

**Tightened field (98/100):**
```
electional,astrology,timing,wedding,launch,travel,contract,planetary,moon,start,date,calendar,best
```

**Diff vs baseline:** `+contract` `+calendar` `+best` · `−ceremony` `−zodiac`
(12 → 13 terms, 91 → 98 chars). Rationale per slot below.

---

## Per-slot scoring

Volume / Competition / Fit are qualitative (no live rank data — pre-launch). "4.3/brand"
is the App-Store-Guideline-4.3 + premium-positioning dilution risk the contested terms
carry. Verdict is the proposal.

| Slot | Vol | Comp | Fit | 4.3/brand risk | Verdict |
|---|---|---|---|---|---|
| `electional` | Low | **None** | Perfect | none | **KEEP** — own it. Method exact-match, uncontested anchor. |
| `astrology` | V.High | Brutal | Med | low (1 token) | **KEEP** — single category-relevance token; powers `electional astrology`, `wedding astrology`. Don't anchor on it. |
| `timing` | Med | Diffuse | High | none | **KEEP** — core JTBD; `wedding timing`, `astrology timing`. |
| `wedding` | High | General | High | none | **KEEP** — top activity, intent-qualified. |
| `launch` | Med | Generic | High | none | **KEEP** — business-launch activity; `launch date`. |
| `travel` | Med | Generic | High | none | **KEEP** — travel activity; `travel date`. |
| `planetary` | Med | Light | Med-High | none | **KEEP** — trust anchor ("real planetary positions"); `planetary hours` (a traditional-timing term), `planetary timing`. |
| `moon` | High | Saturated | High | low | **KEEP** — genuinely on-method (VOC / moon-between-signs is core); `moon calendar`, `moon phase`. Not a mismatch term. |
| `start` | Med | Diffuse | High | none | **KEEP** — intent verb; `start date`, "best time to **start**". |
| `date` | High | Mixed | High | none | **KEEP** — combinatorial powerhouse: `wedding date`, `launch date`, `travel date`, `start date`, `best date`. |
| `ceremony` | Low | Light | Med | none | **DROP** → bench. Largely redundant with `wedding` (`wedding ceremony` partly covered by `wedding`+combos); lowest marginal volume. Frees 9 chars. |
| `zodiac` | High | Saturated | Low-Med | **medium** | **DROP** → bench. Identity-astrology intent (`zodiac sign`) — a *milder horoscope problem*: cheap volume but pulls "who am I" searchers, reinforces "looks like every astro app" (4.3) and dilutes the electional/premium lane. Defensible to keep for raw reach → bench, not banned. |
| `contract` | Med | **None** | High | none | **ADD**. The 4th MVP activity (contracts) had **no keyword** — real gap. High-intent (`contract signing day`), uncontested. |
| `calendar` | High | Mixed | High | low | **ADD** (reinstated). Prior research rated it "Strong — Inceptio *is* a timing calendar"; dropped from baseline with no recorded reason. Honest functional term; `wedding calendar`, `astrology calendar`, `moon calendar`. |
| `best` | High | Generic | High | low | **ADD**. Unlocks the uncontested intent phrases `market-gaps.md` flags nobody owns: `best date`, `best day`, `best moment`, `best wedding date`. One token, broad combinatorial payoff. |

---

## The contested high-volume terms (explicit traffic vs relevance/brand/4.3)

The three you flagged are **already absent** from the baseline. Confirming the calls and
quantifying the tradeoff so the reasoning is on record:

### `horoscope` — **EXCLUDE** (confirm)
- **Traffic:** very high.
- **Against:** searchers want *daily horoscopes* Inceptio doesn't serve → asymmetric
  early **1–3★ "where's my horoscope?"** reviews on a zero-review buffer; worsens **4.3**
  ("looks like every astrology app"); directly dilutes the electional/premium positioning
  that *is* the moat. The volume is real but flows to the wrong intent.
- **Verdict:** stay out. The relevance/brand cost dominates the traffic gain.

### `lucky` — **EXCLUDE** (confirm)
- **Traffic:** high, generic/Vedic.
- **Against:** kitsch — collides head-on with the locked voice ("never a fortune-teller").
  Even "discovery-only," it attracts a fortune-seeking reviewer cohort whose expectations
  the honest/"sometimes the answer is *not yet*" product deliberately frustrates → review
  mismatch + brand erosion.
- **Verdict:** stay out.

### `muhurat` — **EXCLUDE for v1** (default holds; quantified)
- **Traffic:** the single **highest-volume intent-matched** niche term.
- **Against:** searchers want **Vedic Panchang** (Rahu Kaal, Choghadiya, Tithi, Nakshatra);
  Inceptio is **Western/Hellenistic electional** and delivers none of it. Ranking pulls
  traffic whose expectations the app structurally cannot meet → asymmetric early
  **1–3★ "where's the Panchang?"** reviews. With **zero review buffer**, early rating
  depression gates *all* downstream conversion — the downside is front-loaded and
  compounding, the upside (niche installs) is not.
- **Re-open only if:** post-launch, once a review buffer exists, OR as a deliberate
  **Vedic-mode** feature/localization that actually serves the intent. Borrowing the
  keyword without the feature is the trap.
- **Verdict:** exclude v1. (On the bench at #6 strictly to track, not to ship.)

---

## Ranked backup bench (swap candidates)

Use if early reviews / ASA search-term reports say so. Ordered by readiness to promote.

1. **`ceremony`** (8) — re-add to reinforce the wedding vertical (`wedding ceremony`) if
   wedding is the proven top converter and you want depth over breadth.
2. **`zodiac`** (6) — cheap broad-reach re-add if purity is visibly costing top-of-funnel
   volume and the 4.3/dilution risk proves overblown post-launch.
3. **`hour`** (4) — forms `planetary hour` / `best hour`; captures the traditional
   daily-timing surface. Adjacent intent (daily timing ≠ election search),
   so bench not core.
4. **`journey`** (7) — softer, on-voice synonym for the travel activity; swap for
   emotional/"fresh start journey" searches.
5. **`business`** (8) — qualifies `launch` into `business launch`; generic on its own,
   so lower priority.
6. **`muhurat`** (7) — **track only.** Promote only under the re-open conditions above.

**Do-not-add list** (explicitly rejected, keep off even the bench):
`horoscope` (mismatch + 4.3), `lucky` (off-brand), `moment` / `auspicious` / `day`
(already indexed via Name/Subtitle — duplication waste).

---

## Reconciliation: three fields at a glance

| Term | Old snapshot (`keyword-list.md`) | Baseline (`metadata.md`) | Proposed | Note |
|---|:--:|:--:|:--:|---|
| electional | ✓ | ✓ | ✓ | anchor |
| astrology | ✓ | ✓ | ✓ | 1-token relevance |
| timing | — | ✓ | ✓ | JTBD |
| wedding | ✓ | ✓ | ✓ | activity |
| launch | ✓ | ✓ | ✓ | activity |
| travel | — | ✓ | ✓ | activity |
| **contract** | — | — | **✓** | **4th activity — gap fixed** |
| planetary | — | ✓ | ✓ | trust anchor |
| ceremony | — | ✓ | → bench | redundant w/ wedding |
| moon | ✓ | ✓ | ✓ | on-method |
| start | — | ✓ | ✓ | intent verb |
| date | ✓ | ✓ | ✓ | combo powerhouse |
| zodiac | ✓ | ✓ | → bench | identity-astro dilution |
| **calendar** | ✓ | — | **✓** | **reinstated (was "Strong")** |
| **best** | — | — | **✓** | **unlocks "best …" intent combos** |
| moment | ✓ | — | — | already in Name |
| horoscope | ✓ | — | — | EXCLUDE (mismatch/4.3) |
| planet | ✓ | — | — | `planetary` chosen instead |
| lucky | ✓ | — | — | EXCLUDE (off-brand) |
| muhurat | ✓ | — | — | EXCLUDE v1 (Vedic mismatch) |

---

## Final char-count check

`electional,astrology,timing,wedding,launch,travel,contract,planetary,moon,start,date,calendar,best`
= **98/100** · singular forms · no spaces after commas · zero overlap with Name/Subtitle.
2 chars spare for safe re-validation in App Store Connect at entry.
