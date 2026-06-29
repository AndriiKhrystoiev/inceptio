# Release checklist — Inceptio (local builds, no EAS)

Boss requires **local builds**. EAS Build is not used (the `eas.json` in the repo is inert).
This is the repeatable runbook for every store release. Source: ios-local-deploy-runbook
(v1.0.0 build 1, 2026-06-24) + Play deploy (2026-06-25).

---

## 0. Bump version (do this first, commit it)

All versions live in **`apps/mobile/app.json`** (the `package.json` version is npm-only, ignore it):

| Field | Bump rule |
|---|---|
| `expo.version` | Marketing version. Feature release → minor (`1.0.0` → `1.1.0`). Bugfix → patch (`1.0.1`). |
| `ios.buildNumber` | **Unique per upload.** Increment every time you push to ASC, even on re-submits. |
| `android.versionCode` | Integer, **strictly greater** than the last uploaded. Increment every Play upload. |

> Current: `1.1.0`, iOS build `2`, Android versionCode `2`.

---

## 1. Pre-build, both platforms

```sh
# Node 22 — the non-interactive shell defaults to an ancient nvm Node. ALWAYS prefix:
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
```

**Neutralize the .env dev-key leak** (Metro inlines `EXPO_PUBLIC_*` into the Hermes bundle even
in prod). In `apps/mobile/.env`:
1. Back up the file.
2. Blank **only** `EXPO_PUBLIC_ASTROLOGY_BASE_URL` and `EXPO_PUBLIC_ASTROLOGY_DEV_KEY`.
3. Restore after the build.

Production is keyless (`api-public.astrology-api.io`); the dev key must never ship.

> ⚠️ **Do NOT blank `EXPO_PUBLIC_VERSION_POLICY_URL`.** It MUST be baked into the prod bundle —
> if it's empty, the update gate goes inert (fail-open, never force-upgrades) and you lose the
> ability to force old builds to update. It must be the **mutable** gist raw URL (no commit SHA),
> so editing the gist takes effect live without an app release:
> `https://gist.githubusercontent.com/AndriiKhrystoiev/27a47a7bfd5c3f34ee8a9b113397561c/raw/version-policy.json`
> Verify it survived the build: `strings ios/main.jsbundle | grep gist.githubusercontent` → must print the URL.

---

## 2. iOS → App Store Connect

App: **Inceptio**, bundle `io.inceptio.app`, app id `6783891298`, Team `T29RJZB64F`.

```sh
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8        # pod install fails on ASCII-8BIT otherwise
cd apps/mobile

npx expo prebuild --clean -p ios                  # syncs version from app.json into ios/
# Point Xcode's bundle phase at Node 22 (else it grabs the old nvm node):
echo 'export NODE_BINARY=/Users/user/.nvm/versions/node/v22.14.0/bin/node' > ios/.xcode.env.local

cd ios && pod install && cd ..
```

Then archive + export + upload (auto-signing, `-allowProvisioningUpdates`):
- `xcodebuild archive` with `DEVELOPMENT_TEAM=T29RJZB64F CODE_SIGN_STYLE=Automatic`
- `xcodebuild -exportArchive -exportOptionsPlist ios/exportOptions.plist` (method `app-store-connect`)
- `xcrun altool --validate-app` then `--upload-app`

ASC API key: `.p8` at `~/.appstoreconnect/private_keys/AuthKey_8NQS9JA767.p8`.
JWT helper: `node ~/.config/inceptio/asc-jwt.mjs` (Key ID + Issuer baked in).

**Verify the dev key is gone before uploading:**
```sh
strings ios/main.jsbundle | grep ask_   # must print nothing
```

---

## 3. Android → Google Play

Account **Red Rocket Software** (can publish straight to production — no testers/14-day rule).
Build on **JDK 17** (`/opt/homebrew/opt/openjdk@17`), NOT JBR 21 — Gradle 9 crashes on the mismatch.

```sh
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
cd apps/mobile

npx expo prebuild --clean -p android              # set android.versionCode in app.json first
cd android && ./gradlew :app:bundleRelease
# → app/build/outputs/bundle/release/app-release.aab
```

Release signing reads `-PINCEPTIO_UPLOAD_*` props from the upload keystore.
**Upload keystore (BACK UP — loss = cannot ever update the app):**
`~/.config/inceptio/inceptio-upload.keystore`, alias `inceptio-upload`,
passwords in `~/.config/inceptio/keystore-credentials.txt`.

**Upload is manual via Play Console UI** — the API path is blocked (Android Publisher API not
enabled in the Cloud project; owner-only fix). Upload the `.aab`, then promote to the target track.

---

## 4. Post-build

- Restore `apps/mobile/.env` from backup.
- Commit the version bump + tag (`git tag v1.1.0`).
- iOS: fill "What's New", submit for review in ASC.
- Android: fill release notes, roll out in Play Console.

### Update gate — only AFTER the new version is live in the stores

The gate policy is the gist at the mutable URL above. To force/soft-nudge users off old builds,
edit the gist (takes effect live, no app release). Decision logic (`src/lib/update-gate/decision.ts`):
`installed < minVersion` + `forceEnabled` → hard gate; `installed < latestVersion` → soft banner.

```json
{ "forceEnabled": true,
  "ios":     { "minVersion": "1.1.0", "latestVersion": "1.1.0", "storeUrl": "https://apps.apple.com/app/id6783891298" },
  "android": { "minVersion": "1.1.0", "latestVersion": "1.1.0", "storeUrl": "https://play.google.com/store/apps/details?id=io.inceptio.app" } }
```

> ⚠️ **Sequencing:** never set `minVersion` to a build that isn't downloadable yet — you'll lock
> users out with no upgrade available. Ship → wait until live in BOTH stores → then raise minVersion.
> The gate only fires in production builds, never in `__DEV__`/Expo Go (use the dev simulator there).

---

## Known cleanups (not blockers)

- Release archive still bundles `expo-dev-client`/`-launcher`/`-menu` (inert in Release, just bloat) —
  move `expo-dev-client` to devDependencies for a cleaner prod build.
- Consider moving `EXPO_PUBLIC_*` out of `.env` into `app.json` `extra` so the neutralization
  step isn't needed every release.
</content>
</invoke>
