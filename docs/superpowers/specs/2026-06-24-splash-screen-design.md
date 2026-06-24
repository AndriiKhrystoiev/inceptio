# Спека: статичный брендовый splash screen

**Дата:** 2026-06-24
**Статус:** согласован (с учётом 2 пре-флайт-аудитов), готов к плану реализации
**Топик:** брендовый сплэш-экран (знак Inceptio + вордмарк) для мобильного приложения

**Аудиты:** `docs/superpowers/library-audit/2026-06-24-splash-screen-design.md` (library/API); code-archaeology — встроена в §4–§8 ниже.

---

## 1. Цель

Показать брендовый сплэш — **знак Inceptio + вордмарк «Inceptio»** по центру на фоне `#0F0A1F` — пока приложение грузит шрифты и хранилище, без белой вспышки. Сейчас нативный сплэш задан без картинки (только тёмный фон), т.е. это пустой тёмный экран.

## 2. Контекст (текущее состояние)

- `expo-splash-screen` `~55.0.21` уже установлен.
- `app.json` → `expo.splash` = `{ backgroundColor: "#0F0A1F", resizeMode: "contain" }` — **без `image`**.
- `App.js` уже держит нативный сплэш: `SplashScreen.preventAutoHideAsync()` ([App.js:50](../../../apps/mobile/App.js)) и `SplashScreen.hideAsync()` после готовности шрифтов+хранилища ([App.js:181](../../../apps/mobile/App.js)). **Тайминг трогать не нужно.**
- Ассеты: `assets/icon-ios.png` (1024², с плашкой), `assets/icon-android-foreground.png` (1024², **прозрачный символ** ✓). Отдельного логотипа/вордмарка нет.
- Бренд (Mystical Premium): фон `bg-deep #0F0A1F`, текст `text-primary #F5EFE4` (cream), display-шрифт **Fraunces** (italic-ось; .ttf лежат в `node_modules/@expo-google-fonts/fraunces`). `userInterfaceStyle: "dark"` (приложение только тёмное).

## 3. Зафиксированные решения

- **Тип:** статичный нативный сплэш (одна PNG-картинка), не анимированный интро.
- **Контент:** знак (символ) + вордмарк «Inceptio» одним PNG.
- **Источник ассета:** первичный композит собираю из существующего символа (`icon-android-foreground.png`) + текст «Inceptio» в Fraunces. Финальный дизайнерский PNG позже подменяет тот же файл без правок конфига.
- **Android 12+ (вариант A, принят):** на Android 12+ системный сплэш показывает центрированную иконку, **обрезанную в круг** — там виден только **знак** (через adaptive icon), без надписи. iOS и Android ≤11 показывают полный знак+вордмарк через `expo-splash-screen` image. JS-оверлей для надписи на Android 12 — НЕ делаем (вне «статичного»).

## 4. Архитектура

Три независимых юнита.

### 4.1 Сборка ассета (воспроизводимый скрипт)

`apps/mobile/scripts/build-splash.mjs` (Node, ESM):

- Вход: `assets/icon-android-foreground.png` (символ, прозрачный), Fraunces .ttf из `node_modules/@expo-google-fonts/fraunces`.
- Шаги:
  1. **Auto-trim по alpha-bbox (обязательно).** Foreground адаптивной иконки имеет ~20% прозрачного поля с каждой стороны, **асимметрично** (измерено: content-bbox `x[211–826], y[173–801]` на холсте 1024² → 616×629px, верх 173 / низ 222). Без обрезки знак выйдет ~40% мельче и **смещён вверх на ~49px**. Скрипт обязан вычислить alpha-bbox (порог α>8) и обрезать — это И уменьшение поля, И пере-центрирование.
  2. Собрать **SVG**: прозрачный фон, обрезанный символ (встроен как base64 `<image>`) сверху, текст «Inceptio» (`<text>` шрифтом Fraunces, цвет `#F5EFE4`) под ним.
  3. Растеризовать через **`@resvg/resvg-js`** (`new Resvg(svg, { font: { fontFiles: [<Fraunces.ttf>], loadSystemFonts: false, defaultFontFamily: <ВНУТРЕННЕЕ имя семейства .ttf> } }).render().asPng()`).
- Выход: `assets/splash-icon.png` — **прозрачный фон**, знак над вордмарком.
- Параметры-константы в начале скрипта (легко править): размер холста, размер знака, размер/вес шрифта, межблочный отступ, цвет текста.
- Запуск: `npm run build:splash`. Зависимости (devDependencies): **`@resvg/resvg-js` пин `2.6.2`** (стабильный, НЕ `next`/alpha) + **`pngjs`** (явно объявить — для теста размеров; сейчас он только транзитивный).

**Готча шрифта (из аудита):** `font-family` в SVG-`<text>` и `defaultFontFamily` должны совпадать с **внутренним** именем семейства .ttf (НЕ именем файла), иначе resvg тихо не отрисует глифы (resvg-js #210). Подобрать реальное имя семейства Fraunces из .ttf.

**Почему прозрачный фон:** нативный сплэш сам заливает `backgroundColor #0F0A1F` и центрирует картинку (`resizeMode: contain`), поэтому артворк — на прозрачности.

**Read-only вход:** `icon-android-foreground.png` — это ещё и `android.adaptiveIcon.foregroundImage` в `app.json:25`. Скрипт читает его, но пишет ТОЛЬКО в `splash-icon.png` — входной файл не трогать.

**Fallback:** если `@resvg/resvg-js` окажется хрупким на целевой ОС/CI — `sharp` (умеет и trim, и composite, и растеризацию SVG). Не дефолт, но запасной путь.

**Размеры (ориентир):** холст ~`1242×1242` (хватает с запасом для @3x), знак ~`360px` по ширине, вордмарк ~`120px` высотой под ним, всё по центру. Итог — высокий PNG; `imageWidth` в конфиге задаёт фактический размер на экране.

### 4.2 Конфиг нативного сплэша

В `apps/mobile/app.json`:

- **Удалить** legacy-блок `expo.splash`.
- **Добавить** в `expo.plugins` config-plugin (рекомендованный путь для SDK 55):
  ```json
  ["expo-splash-screen", {
    "image": "./assets/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#0F0A1F",
    "dark": { "image": "./assets/splash-icon.png", "backgroundColor": "#0F0A1F" }
  }]
  ```
- Legacy `expo.splash` **подтверждённо устарел** (deprecated с SDK 52, авто-маппится «пока что»; Expo просит мигрировать на plugin для CNG) — удалить, чтобы не было конфликта значений. Плагин **обязательно** явно в `plugins` (не авто-применяется).
- Меняет нативную конфигурацию → **не OTA**. Применяется на prebuild — см. §6 (нужен `--clean`, иначе старые native-дир затеняют конфиг).

### 4.3 Тайминг + защита от «замёрзшего знака» (1-строчный фикс App.js)

`App.js` уже скрывает нативный сплэш после `fontsLoaded && storageReady` ([App.js:180-182](../../../apps/mobile/App.js)); статичный сплэш висит до готовности → без вспышки. **Логику тайминга не меняем.**

**НО** (находка аудита, усиливается этой фичей): `hydrateStorage().then(...)` ([App.js:133](../../../apps/mobile/App.js)) **без `.catch`** — если гидрация (или `migrateLocationTimezones_v1` / `initActivityPreference` / `initLocationPreference` / `recordActiveDay` внутри `.then`) бросит, `setStorageReady(true)` ([App.js:164](../../../apps/mobile/App.js)) не вызовется → `hideAsync` не сработает → сплэш зависнет навсегда. Сегодня это пустой тёмный экран (невидимо), но **после фичи это замёрзший бренд-знак** — видимый удар по доверию. **В scope:** обернуть цепочку в `.catch(() => setStorageReady(true))`, чтобы гейт всегда поднимался. Маленький защитный фикс, прямо обслуживающий цель сплэша.

## 5. Файлы

| Файл | Действие |
|---|---|
| `apps/mobile/scripts/build-splash.mjs` | CREATE — композитор (.mjs: пакет не `type:module`, ESM нужен явно) |
| `apps/mobile/assets/splash-icon.png` | CREATE (генерируется скриптом, коммитим; авто-бандлится через `assetBundlePatterns`) |
| `apps/mobile/app.json` | EDIT — удалить `expo.splash` (:10-13), добавить `["expo-splash-screen", {...}]` в `plugins` (:31-48). НЕ трогать `icon` (:9) и `adaptiveIcon.foregroundImage` (:25) |
| `apps/mobile/package.json` | EDIT — devDeps `@resvg/resvg-js@2.6.2` + `pngjs` + script `"build:splash": "node scripts/build-splash.mjs"` |
| `apps/mobile/App.js` | EDIT — `.catch(() => setStorageReady(true))` на цепочку гидрации (:133) |
| `apps/mobile/vitest.config.ts` | EDIT — добавить glob для теста (см. §6) ИЛИ положить тест под `src/**` |

## 6. Тестирование

⚠️ **vitest ловит тесты только под `src/**`** (`vitest.config.ts` include-globs, строки 7-15) — тест в `scripts/__tests__/` **молча не запустится**. Решение: либо добавить glob `'scripts/__tests__/**/*.test.{mjs,ts,js}'` в `vitest.config.ts`, либо положить тест под `src/lib/__tests__/`. Паттерн fs-доступа взять из существующего `src/i18n/__tests__/coverage.test.ts` (`node:fs`).

- **Детерминированная проверка ассета:** после `build:splash` файл `assets/splash-icon.png` существует, валидный PNG, ширина/высота > 0, alpha-канал есть (`PNG.sync.read` из `pngjs` → `colorType & 4`). Не пиксель-перфект — sanity.
- **Конфиг-чек:** `app.json` содержит plugin `expo-splash-screen` с `backgroundColor #0F0A1F` и НЕ содержит legacy `expo.splash`.
- **Визуальная верификация (ручная / `/run`):** **`npx expo prebuild --clean`** (обязательно — иначе старые `ios/`/`android/` от прошлого prebuild затеняют новый конфиг; `expo run:ios` делает инкрементальный sync и часто пропускает изменения сплэша), затем `npm run ios` → сплэш показывает знак+вордмарк на `#0F0A1F`, без вспышки, плавный переход.

## 7. Не входит в объём (YAGNI)

- Анимированный интро / JS-оверлей сплэша (в т.ч. надпись на Android 12+).
- Финальный дизайнерский ассет (подменяется в `assets/splash-icon.png` позже без правок кода).
- Светлая тема сплэша (приложение dark-only).
- Лоадинг-копирайт «Looking at the sky for you…» — это экран загрузки поиска, отдельная история.

## 8. Риски / нюансы

- **Android 12+ круговая маска** — принято (вариант A): только знак, надпись не видна (система центрирует иконку 240×240dp в круге 160dp, всё вне круга невидимо). Зафиксировать комментарием в `build-splash.mjs` и в decision-доке, чтобы не воспринималось как баг.
- **`@resvg/resvg-js` — нативный prebuilt-бинарь** (per-arch optionalDependencies). Это **dev-time** зависимость (генерация ассета локально/CI), в RN/Hermes-бандл НЕ идёт — рантайм-риска нет. Но: пин `2.6.2` (стабильный медленно обновляется; alpha не брать), и на CI важна совпадающая арх образа, иначе install подтянет не тот бинарь. Fallback — `sharp` (см. §4.1).
- **Auto-trim + font-family gotcha** — оба обязательны, детали в §4.1 (пропуск любого → мелкий/смещённый знак или пустой текст).
- **Вес шрифта вордмарка** — подобрать визуально (константа в скрипте; в `node_modules` есть Fraunces 500 Medium / 500 Medium Italic / 600 SemiBold Italic).
