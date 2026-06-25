# Inceptio — Google Play production checklist (paste-ready)

Account: Red Rocket Software (corporate, has prod apps → no 12-tester/14-day rule).
App: **io.inceptio.app**, internal-testing build **1 (1.0.0)** already live.
API upload is blocked (owner-only Cloud access) → everything below is done in the **Play Console UI**.

The temporary name "io.inceptio.app (unreviewed)" disappears once the Main store listing is filled and the app passes review → the real name shows.

---

## 1. Main store listing  (Grow → Store presence → Main store listing)

- **App name** (≤30): `Inceptio: Timing to Begin`
  - _Alt (cross-store brand match, weaker Play SEO):_ `Inceptio: Find Your Moment`
- **Short description** (≤80):
  `Find the best day to start a wedding, business, contract or trip.`
- **Full description** (≤4000):

```
Inceptio tells you when to begin — not just what's in the stars. Pick what you're planning and a range of dates, and Inceptio finds the days and hours that genuinely favor it.

Most astrology apps describe who you are. Inceptio answers a different question: when is the right time to begin a wedding, a business, a contract, or a journey? This is electional astrology — the centuries-old Western tradition of choosing a favorable moment to start something — made simple, on your phone.

✨ What Inceptio does
• Reads the real sky: pick an activity, a date range, and a place, and Inceptio uses the real positions of the planets to find the moments that favor your plans.
• Explains every moment in plain words: each window comes with a warm, clear reason — no jargon, no doom.
• Covers what matters: weddings, business launches, contract signings, and travel.
• Shows a calendar you can read: a heatmap reveals the best day at a glance across your whole range.
• Is honest about waiting: some days the answer is simply "not yet," and Inceptio will say so. Knowing when to wait is part of good timing.
• Goes as deep as you like: a calm summary for most, the full chart and factors for anyone who wants the detail.

🌙 Real sky, real method
Inceptio works from the real positions of the planets and the traditional technique astrologers have used for centuries to pick an auspicious moment. It is timing — not prediction, not fortune-telling, not your daily horoscope.

🔒 Private by design
No account. No sign-up. Your moments stay on your device.

Find the right time to begin. Download Inceptio and find your moment.

Whether you're looking for the right day to marry, a good time to launch a business, the best day to sign a contract, or an easy day to travel, Inceptio is built for that one decision: when to begin. (Astrologers call it electional astrology; you can just call it good timing.)
```

### Graphics  (in `docs/launch/play-assets/`)
- **App icon** (512×512): `play-icon-512.png`
- **Feature graphic** (1024×500, required): `play-feature-1024x500.png`
- **Phone screenshots** (min 2, up to 8): reuse `docs/screenshots/appstore/*.png` (1290×2796 — Play accepts them). Recommended order: 01-onboarding, 02-calendar, 03-moment-exceptional, 04-list, 05-today, 06-saved, 07-activity, 09-share.

---

## 2. Store settings  (Grow → Store presence → Store settings)
- **App category:** Lifestyle
- **Tags:** pick the closest Lifestyle tags Google offers (no free-text; "electional" lives in the description, not tags)
- **Contact email:** andriikhr@procoders.tech
- **Website:** https://andriikhrystoiev.github.io/inceptio-legal/ (or https://redrocket.software/)

---

## 3. App content  (Policy and programs → App content)

- **Privacy policy:** `https://andriikhrystoiev.github.io/inceptio-legal/privacy.html`
- **App access:** All functionality is available without special access (no login/account).
- **Ads:** No, my app does not contain ads.
- **Content rating** (questionnaire): email andriikhr@procoders.tech; category "Utility / Reference"; answer **No** to violence, sexual, profanity, drugs, gambling, fear; no user interaction beyond standard → result ~ **Everyone / PEGI 3**.
- **Target audience and content:** target age groups **18+** (also 13–17 acceptable); app is **not** designed for children → "Appeal to children: No". This keeps it out of Families policy.
- **Data safety:** see §4.
- **Government apps:** No.  **Financial features:** None.  **Health:** not a health app.  **News:** No.

---

## 4. Data safety  (the form Google scrutinizes most)

- Does your app collect or share required user data? → **Yes**
- Data type collected: **Location → Precise location** (GPS) and/or **Approximate location** (typed city).
  - Collected: **Yes** · Shared: **No** (sent only to our calculation provider to fulfill the request — a service provider, not third-party sharing)
  - Purpose: **App functionality** (only)
  - Linked to user identity: **No** (no account)
  - Used for tracking / advertising: **No**
  - Processed ephemerally: you may mark **No** (the upstream may cache) — safe either way
- Is all data encrypted in transit? → **Yes** (HTTPS)
- Can users request data deletion? → No server-side user data; data lives on-device and is removed on uninstall. (Answer per the form: no account data to delete.)
- No other data types (no name, email, contacts, identifiers, photos, files, messages, analytics).

> Reality check (verified in code): no analytics/ads/tracking SDKs, no account, device id stays on-device. Only Location leaves the device, to astrology-api.io, for the search.

---

## 5. Production release  (Test and release → Production → Create new release)
- **Bundle:** promote the existing internal build **1 (1.0.0)** to Production (Releases → "Promote release"), OR upload `app-release.aab` again.
- **Release name:** `1 (1.0.0)`
- **Release notes** (`<en-US>`): `First release. Find the right day to begin — weddings, business launches, contracts, and travel.`
- **Countries/regions:** select all (or your target markets) under Production → Countries/regions.
- **Review release → Start rollout to Production** → submit for review.

> Localized listings (de/fr/es-419/pt-BR) = a later pass, like iOS. Not required to ship en.
