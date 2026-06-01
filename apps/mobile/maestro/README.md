# Maestro UI Automation

Automated UI walkthroughs for stakeholder demos and smoke tests. Each flow is independently runnable and records cleanly to video.

## Setup (one-time)

```bash
brew tap mobile-dev-inc/tap
brew install maestro
maestro --version  # 2.6+ tested
```

## Important: Expo Go workflow

These flows target `appId: host.exp.Exponent` because Inceptio currently
runs **inside Expo Go** during development, not as a standalone install.
Maestro's `simctl get_app_container io.inceptio.app` fails when the
production bundle id isn't installed, so we target Expo Go's bundle id
and rely on Expo Go remembering the last-loaded project.

Each `launchApp` uses `clearState: false` deliberately — clearing Expo
Go's state forgets which project to open, and the simulator would land
on the Expo Go login / project list. As a safety net, every flow has a
fallback `runFlow` that taps `"Inceptio"` if it detects the
`"Recently opened"` header from Expo Go's project list.

### Before running a flow

1. Start the dev server: `cd apps/mobile && npx expo start`
2. Press `i` in Metro to open the iOS Simulator — this launches Expo Go
   and loads Inceptio
3. Wait until Inceptio is fully loaded (you should see the onboarding
   screen, not the Expo Go home / project list)
4. In a separate terminal, run the flow:

```bash
maestro test apps/mobile/maestro/flows/01-wedding-full.yaml
```

### Switching to a custom dev client or production build

When you later build a standalone binary (`npx expo run:ios` for a
development client, or `eas build` for a release build), change the
top-of-file in each flow:

```yaml
appId: io.inceptio.app
```

…and you can switch `clearState: false` back to `true` since the
standalone build owns its own AsyncStorage and clearing it gives a
deterministic cold start. The Expo-Go fallback `runFlow` block can be
removed at that point — it does nothing on a standalone build because
the `"Recently opened"` text never appears.

The flow runs against the foreground simulator. Don't touch the simulator while it executes — input collisions cause flaky failures.

## Recording a video

```bash
maestro record apps/mobile/maestro/flows/01-wedding-full.yaml
```

The recording is saved as an .mp4 under `~/.maestro/tests/recordings/` and uploaded to Maestro Cloud for a shareable link (login optional; local file is always written).

## Debugging a flow

```bash
maestro studio
```

Opens a browser UI mirroring the current simulator screen. Hover over any element to see the selectors Maestro can match against — useful when a `tapOn: "..."` fails because the text doesn't match exactly.

For ad-hoc element inspection without writing YAML:

```bash
maestro hierarchy
```

Dumps the current screen's view hierarchy as JSON.

## Flows in this repo

| File | Duration | What it shows |
|---|---|---|
| `flows/01-wedding-full.yaml` | ~90s | Full end-to-end: onboarding → activity → date → GPS location → search → list → detail → save → moments tab |
| `flows/02-travel-quick.yaml` | ~30s | Smoke test using manual city typing instead of GPS |
| `flows/03-list-view-demo.yaml` | ~45s | Focuses on the clustered list view (per-day cards) |

## Label conventions

Maestro matches by visible text. The flows use **exact strings** from screen JSX where possible, and **substring matches** where the screen text contains tricky characters:

- `"Find a moment for…"` (Today CTA) uses a typographic ellipsis (U+2026). Flows match the substring `"Find a moment for"` to avoid character-encoding issues.
- Activity titles are matched in full ("Wedding or engagement", "Travel or move", etc.) — emoji prefixes live in sibling Text nodes, not the title string.
- Grade pills on cards use the per-screen label set: `"Strong"`, `"Favorable"`, `"Move with care"`, `"Not recommended"`, or `"Exceptional"`. Flow 01 ORs them all so any result set matches.

## Common issues

| Symptom | Likely cause |
|---|---|
| `tapOn` fails with "no element matching" | Label doesn't match exact on-screen text. Run `maestro studio` and inspect. |
| "Allow While Using App" never appears | Location permission already granted from a previous run. The `runFlow.when.visible` guard handles this — flow continues. |
| Loading step times out | Cold Cloudflare Worker + cold KV miss can take 40s+. The flows already budget 60s. If still failing, check `wrangler tail` for upstream API issues. |
| Tab bar "Calendar" tapped instead of toggle pill "Calendar" | Both render the same text. Flow 01 sidesteps this by being on the Calendar screen when it taps "List" (the pill that toggles back is the only "Calendar" in the header area). |
| `clearState: true` doesn't reset onboarding | Onboarding state isn't persisted — `App.js` boots into `'onboarding'` unconditionally on every launch. Nothing to reset. |

## Updating flows after UI changes

If a screen label changes, the matching flow step will fail with "no element matching". Find the new label in the screen JSX and update the corresponding `tapOn` value. The `# 4. Activity Picker — pick Wedding.` style comments in each flow map steps to screen files so you know where to look.
