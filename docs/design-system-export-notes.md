# Inceptio — React Native (Expo)

A 1:1 port of the HTML/React mobile UI kit into a runnable Expo app. Same eleven screens, same visual language, native primitives all the way down.

```
expo/
├── App.js                   # entry — fonts, screen router, tab bar
├── app.json
├── package.json
├── babel.config.js
└── src/
    ├── theme.js             # colors / fonts / spacing / radii / glow tokens
    ├── components/
    │   ├── Starfield.js     # static, never animated
    │   ├── HeroGradient.js  # radial-ish warm-indigo wash (SVG)
    │   ├── Moon.js          # 8 phases, gold halo
    │   ├── Glyph.js         # blocking-reason glyphs + reason map
    │   ├── ScorePill.js
    │   ├── StatusLine.js    # score + STRONG/FAIR/CAUTION/POOR
    │   ├── WindowCard.js    # duration-emphasis row
    │   ├── PrimaryButton.js
    │   ├── SecondaryButton.js
    │   ├── ActivityChip.js
    │   ├── TabBar.js        # BlurView frosted glass
    │   ├── MoonRiseHeader.js
    │   ├── Pulse.js         # loading indicator
    │   ├── IconBtn.js
    │   └── StatePicker.js   # design-time multi-state preview
    └── screens/
        ├── OnboardingScreen.js       # 00
        ├── TodayScreen.js            # 01  · 3 states (viable/caution/blocked)
        ├── ActivityPickerScreen.js   # 02
        ├── DatePickerScreen.js       # 02b · short/normal/long
        ├── LocationPickerScreen.js   # 02c
        ├── LoadingScreen.js          # 03a · 4-stage progressive copy
        ├── CalendarScreen.js         # 03  · heatmap + bottom-sheet
        ├── NoViableScreen.js         # 03b
        ├── MomentDetailScreen.js     # 04  · 4 duration variants
        ├── YouScreen.js              # 05
        └── PaywallScreen.js          # 06
```

## Run it

```bash
cd expo
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code with the **Expo Go** app on your phone. Fonts download on first run.

## Translation notes

| Web                                   | React Native                                              |
|---------------------------------------|-----------------------------------------------------------|
| `<div>`                               | `<View>`                                                  |
| `<span>`, `<p>`, raw text             | `<Text>` (you cannot render text outside `<Text>`)        |
| `<button>`                            | `<Pressable>` (preferred) or `<TouchableOpacity>`         |
| `<svg>`                               | `react-native-svg`                                        |
| `radial-gradient()` background        | `<HeroGradient/>` (SVG `<RadialGradient>` full-bleed)    |
| `linear-gradient()`                   | `expo-linear-gradient`                                    |
| `backdrop-filter: blur`               | `expo-blur` `<BlurView>`                                  |
| `text-shadow: …`                      | `textShadowColor / textShadowOffset / textShadowRadius`   |
| `box-shadow: 0 0 24px …`              | `shadowColor + shadowRadius` (iOS), `elevation` (Android) |
| `cursor: pointer`                     | n/a — `<Pressable>` shows a pressed state                 |
| `@keyframes`                          | `Animated.timing` / `Animated.loop` (see `Pulse.js`)      |
| Google Fonts via `<link>`             | `@expo-google-fonts/*` + `expo-font` `useFonts`           |
| `lucide` inline SVGs                  | `lucide-react-native`                                     |
| `localStorage`                        | `@react-native-async-storage/async-storage` (not used)    |

## Conscious limitations

- **Colored shadows** (the primary CTA's violet glow, score halos) render on iOS but not Android. Android falls back to elevation. Replace with `react-native-shadow-2` if you need parity.
- **`text-shadow` halos** on the gold ≥90 score work cross-platform via `textShadow*` on `<Text>`. We don't currently apply them — real API distribution rarely produces 90+ scores anyway (per v2.1 calibration).
- **Backdrop blur on Android** falls back to a translucent solid via `expo-blur`'s `intensity` tweak. The visual is close but not identical.
- **In-app routing** is a flat `useState`-driven switcher in `App.js` — fine for review, but swap to `@react-navigation/native` (with `@react-navigation/native-stack` and `@react-navigation/bottom-tabs`) for production. Screen names map 1:1; each screen takes a `go(id)` prop you can replace with `navigation.navigate`.

## Design-time state pickers

Five screens have multiple states (Today, Date, Calendar, Loading, Moment Detail, NoViable). Each renders a small `<StatePicker>` near the top of the screen so a reviewer can flip variants. **Remove these before shipping** — production picks state from API data, not a button row. Each `StatePicker` is a single component import to delete.

## NativeWind (optional)

The brief mentioned NativeWind. This port uses plain `StyleSheet` for portability — every style is co-located with the component that uses it. Migrating to NativeWind is straightforward: each `style={{...}}` becomes a `className="…"`. Add `nativewind` + a `tailwind.config.js` mirroring `theme.js` and you can refactor incrementally.

## What's intentionally missing

- **App icon / splash artwork** — placeholder colors in `app.json`. Drop real `assets/icon.png` (1024×1024) and `assets/splash.png` (1284×2778) and add the paths back to `app.json`.
- **Real astrology API calls.** All scores and reasons are hand-tuned per v2.1 calibration. Wire up `astrology-api.io v3` at the screen edges (Calendar, Today, MomentDetail).
- **Real persistence.** Saved moments on `YouScreen` are hard-coded; wire to AsyncStorage or your backend.
- **Onboarding birth-data capture.** The brief specced Onboarding as identity-only; the chart input flow is a future screen.
