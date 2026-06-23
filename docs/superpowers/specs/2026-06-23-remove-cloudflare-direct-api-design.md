# Спека: убрать Cloudflare, прямой вызов api-public

**Дата:** 2026-06-23
**Статус:** согласован (с учётом 3 пре-флайт-аудитов), готов к плану реализации
**Топик:** удаление Cloudflare Worker, перенос серверной логики в монорепо-пакеты, прямые вызовы мобайла в `api-public.astrology-api.io`

**Аудиты, на которых основана эта редакция:**
- Code archaeology — встроенный отчёт (см. §11 «Constraints из аудита»)
- Domain — `docs/superpowers/expert/2026-06-23-remove-cloudflare-direct-api-domain.md`
- Library/API — `docs/superpowers/library-audit/2026-06-23-remove-cloudflare-direct-api.md`

---

## 1. Контекст и причина

Появился публичный апстрим `https://api-public.astrology-api.io/api/v3` (Astrology API; `/health` = 3.2.0, `openapi.json` = 3.2.10 — есть скос версий шлюза):

- **отвечает без API-ключа** — подтверждено живым вызовом: корректное тело → `200` + `x-auth-bypass: true`; неверное тело → `422` (не `401/403`);
- предположительно имеет **лимит на пользователя** (по IP, на уровне шлюза);
- имеет **собственное кэширование**, заявленные времена ответа **50–500 мс** (прежний холодный старт до 42 с устранён).

Это убирает две исходные причины существования Worker'а — **скрытие ключа** и **rate-limit по устройству**. Решение стейкхолдера: **полностью убрать Cloudflare**, серверную логику перенести в монорепо-пакеты / на устройство.

> ⚠️ Это **сознательный откат зафиксированного решения** из `CLAUDE.md` («translation layer — серверный, не в бандле»). Откат принят явно; компромиссы — §6. `CLAUDE.md` (decision log) обновляется в рамках реализации.

### 1a. Два подтверждённых риска «двери в одну сторону» (определяют порядок работ)

1. **Keyless-доступ недокументирован и отзываем.** OpenAPI публичного API **всё ещё** объявляет `security: [{BearerAuth: []}]` обязательным. `x-auth-bypass` — настройка шлюза Cloudflare→Railway, которую могут тихо отключить. Удаление Worker (скрывавшего ключ) необратимо, если bypass отзовут.
2. **Контракт лимита/ошибок НЕ подтверждён.** В 2.3 МБ OpenAPI **нет ни одного 429**, нет rate-limit заголовков; `electional/search` документирует только 200/400/422. Текущий клиентский soft-block кодит под форму ошибки `body.upstream.detail.error.error_code`, которой **нет ни в одной фикстуре/тесте репозитория** — она наблюдалась только в рантайме через Worker-обёртку.

**Решение (стейкхолдер):** **сначала проверить — потом удалять.** Удаление `workers/api-proxy/` — **последний, обратимый шаг**, только после Фазы 0 (см. §7).

---

## 2. Целевая архитектура

**До:** `mobile → Cloudflare Worker (proxy + KV cache + rate-limit + translate + daily-note synth + version-policy + admin) → upstream(keyed)`

**После:** `mobile → api-public.astrology-api.io/api/v3` напрямую.

Серверная логика переезжает в **монорепо-пакеты**, не копипастом:

- `packages/shared-types` — уже есть (Zod-схемы + типы; собирается standalone под RN/Hermes, mobile уже валидирует им). Источник истины.
- `packages/translations` — **сейчас НЕ существует на диске** (`packages/` содержит только `shared-types`). Создаём; сюда переезжает весь `workers/api-proxy/src/translations/` + golden-тесты. Пакет import-clean для Hermes (нет KV/`env`/`ctx.waitUntil`/`fetch`).

**Резолюция пакета (подтверждена аудитом):** mobile **не** член root `workspaces`; `@inceptio/shared-types` подключён через `"file:../../packages/shared-types"` + симлинк в `apps/mobile/node_modules`, Metro `watchFolders` уже покрывает корень монорепо. `@inceptio/translations` подключается **тем же механизмом**, изменений Metro не требуется.

---

## 3. Что переносим из Worker

| # | Что | Откуда | Куда | Изменения |
|---|-----|--------|------|-----------|
| 1 | `toUpstreamBody` — форма upstream (`date_range`+`location`, `hour:12, minute:0`, `top_n_windows:10`, `parseDateParts` = `slice(0,10)`) | `upstream.ts:29-62` | mobile `api.ts` | **воспроизвести байт-в-байт**, иначе 422 (§10). Юнит-тест на точный JSON — обязателен |
| 2 | `callUpstream` | `upstream.ts` | mobile `api.ts` | **убрать `X-API-Key`**; таймаут `API_CONFIG.timeout` 60с→~20с; распаковать конверт `{success,data}` ДО Zod |
| 3 | `translate()` + весь `translations/` (factors, excluded-reasons, 4 activity-overrides, headlines, **daily-notes/***, locale-spine, `types.ts` с `LIBRARY_VERSION`/`TRANSLATIONS_VERSION`, `part-of-day`) | `translations/` | `packages/translations` | golden-тесты переезжают вместе, выходы НЕ меняются |
| 4 | Zod-валидация + permissive enums (`KNOWN_*`) + fallback-фразы | `routes/search.ts`, `shared-types` | mobile `api.ts` + `packages/translations` | на miss — нейтральная фраза + **telemetry-событие** (§6) |
| 5 | daily-note синтез: `composer`, `picker`, `moon-phase`, `horizon`, `part-of-day`, locale; `formatDateInTz` (`lib/local-date.ts`); `tzEquivalent` (`lib/tz-aliases.ts`) | `routes/daily-note.ts`, `translations/daily-notes/`, `lib/` | `packages/translations` + mobile | см. §3a |
| 6 | Маппинг ошибок upstream → типизированные ошибки клиента | `routes/search.ts`, `api.ts` | mobile `api.ts` | **переписать под голое тело** (§5); по реальным телам из Фазы 0 |

### 3a. daily-note: что нельзя потерять при порте (из code-arch §3, §7.6)

daily-note = внутренний `/electional/search` + синтез. Порт обязан сохранить:
- **три формы no-viable-windows** (`daily-note.ts:381-401`: full-day exclusion / partial-day / genuine 502) — иначе неверная заметка в Moon-VoC дни (частые);
- fail-safe `summary.no_viable_windows ?? false`;
- **`upstreamTz` alias-equivalence pick** (нужен `tz-aliases.ts`) — иначе старый upstream может 422 на каноническом зоне;
- **`today_iso_date` = wall-clock в tz события** (`formatDateInTz`, Intl en-CA), не device-tz;
- внутренний search должен слать поля **точно** по `ElectionalSearchRequestSchema` (`lat/lng/start/end/city/timezone/activity`) — был баг дрейфа имён полей (`daily-note.ts:296-306`), который молча 502'ил; его e2e-гард **не переезжает автоматически**.

---

## 4. Что удаляем (на последнем шаге, после Фазы 0)

- Весь каталог `workers/api-proxy/` (proxy, KV-кэш, per-device rate-limit, `version-policy`, `admin/*` телеметрия, серверный `alert-ack`).
- `wrangler.toml`, секрет `ASTROLOGY_API_KEY`, KV-namespace `CACHE`.
- Наш per-device rate-limit и серверный usage-cap (`rate-limit.ts`).
- root `package.json`: скрипты `deploy:worker`/`dev:worker`; glob `workers/*` остаётся пустым.
- Серверный KV-кэш → **лёгкий on-device кэш** по ключу запроса (AsyncStorage-обёртка уже есть; upstream сам кэширует).

**Тесты, умирающие с Worker (~17 в `src/__tests__/`):** все `daily-note-*`, `cache`, `kv-counter`, `meter-search`, `rate-limit/tiers`, `admin-*`, `alert-ack`, `version-policy`. `schemas.test.ts` **не удалять** — перенести в `shared-types`/`translations`.

---

## 5. Изменения в mobile

- **`API_CONFIG.baseUrl`** → `https://api-public.astrology-api.io/api/v3` (раньше `*.workers.dev`); **`API_CONFIG.timeout`** 60с→~20с.
- **`searchElectional`**: строит upstream-форму, прямой вызов, **распаковывает `{success,data}`**, валидирует Zod-ом, **переводит локально** через `@inceptio/translations` (см. инвариант ниже), возвращает `SearchResult` с уже заполненным `displayable`. UI-контракт не меняется.
- **Инвариант (code-arch §7.5):** `translate()` ОБЯЗАН отработать в сетевом слое ДО возврата `SearchResult`. `displayable?` читают 6+ файлов (`cluster-windows`, `format-window`, `calendar-export`, `card-view-model`, `nav-params`, `draft-store`); пропуск = **тихая** деградация тона до fallback, без ошибки.
- **Маппинг ошибок (переписать):**
  - удалить ветку `body.error === 'rate_limited'` (Worker per-device 429, `api.ts:159-160,174`);
  - удалить 502 `upstream_schema_mismatch` (Worker-emitted); клиентская Zod-валидация уже бросает `SchemaMismatchError`;
  - ветки `RATE_LIMIT_EXCEEDED`/`INVALID_DATE_RANGE` читали Worker-обёртку `body.upstream.detail.error` — теперь тело **голое** + конверт `{success,data}`. **Переписать под реальные тела из Фазы 0.** Пока 429-контракт не подтверждён — soft-block делать **толерантным к неизвестной форме** (fallback на общий лимит-месседж);
  - **сохранить все 6 классов ошибок**, которые потребляют `error-messages.ts:25-29` (5 локалей) и `query-client.ts:18-19` (отключает retry на `RateLimitError`/`SchemaMismatchError` — иначе TanStack будет ретраить и жечь IP-квоту).
- **Заголовки:** upstream не ставит `X-Cache`/`X-RateLimit-Remaining` → `cacheHit`/`rateLimitRemaining` в `SearchResult` станут `false`/`null` (потребители уже `?? null`). Для search upstream-tz = **`request.timezone` дословно** (он уже tz-lookup-производный на клиенте); **НЕ** реинтродьюсить header→bucket-резолюцию (она обслуживала только удаляемый лимитер).
- **`getDailyNote`**: синтез локально; surface `library_version` в ответе (иначе cache-bust в `useDailyNote.ts:90` молча не сработает).
- **`alert-ack`**: серверный POST → **локальная отметка** в on-device storage. Безопасно: читающая сторона на сервере **не реализована** (`saved_searches: []`, статусы выводятся клиентом). `api.ts:postAlertAck` сейчас не вызывается ни одним экраном; `post-alert-ack.test.ts` обновить/удалить.
- **moon-phase (DRY, code-arch §6):** `apps/mobile/src/lib/card/moon-phase.ts` уже verbatim-копия Worker-алгоритма. При переезде `daily-notes/moon-phase.ts` в пакет — **перенаправить `card/moon-phase.ts` на пакет, удалить копию** (согласовать сигнатуры: `parseLocalInstant` из `card/iso-local.ts` vs date-only `computeMoonPhase`). Не плодить третью копию.

### 5a. Корректировка факта (важно)

Исходная редакция §5 утверждала, что paywall-скаффолд (`react-native-purchases`) «остаётся / load-bearing». **Это неверно:** аудит подтвердил, что `react-native-purchases`, `react-native-mmkv`, `date-fns`, `date-fns-tz` **отсутствуют** в `apps/mobile/package.json`, хотя CLAUDE.md числит их «locked». Фактически: хранилище = `@react-native-async-storage/async-storage`, даты = нативный `Date`. **План НЕ должен содержать шагов «сохранить/подключить RevenueCat».** Будущий paywall — greenfield поверх лимита публичного URL (отдельная задача). `features.ts`: лимит больше не завязан на локальный счётчик; cap = upstream 429.

---

## 6. Принятые компромиссы

| Потеря | Последствие | Решение |
|--------|-------------|---------|
| Серверная защита от абьюза | Только IP-лимит upstream (слаб при NAT) | Принято |
| Обновление тона без релиза | Любая правка словаря = релиз в сторах | Принято |
| Сигнал дрейфа enum | Новый enum upstream молча → fallback-фраза, срабатывает **ровно на самых заметных** событиях (ретрограды/сожжение); upstream уже дважды дрейфовал | **Митигация (решение): telemetry-событие на ветке fallback + CI-тест полноты словаря** (см. §6a) |
| `version-policy` (force-upgrade) | Нет серверного гейта обновления | Дропаем в MVP; вернуть статиком при необходимости |
| Общий KV-кэш между юзерами | Кэш только на устройстве | Принято (upstream кэширует) |
| Серверная телеметрия admin | Нет серверных метрик | Принято |
| **Хардкод эфемерид `STATIONS`** (`horizon.ts:20`, только 2026–2027, «refresh annually») | Теперь обновление стаций требует **релиза в сторах**, а не редеплоя Worker | Зафиксировать в decision log; пометить maintenance-риск |
| **`verifyConcreteHorizon` — стабы** (`picker.ts:232`: `closed-malefic-on-angle`→всегда true, `mixed-moon-void-until-noon`→всегда false) | Едут в бандл как есть | Зафиксировать; не «чинить» в этом изменении (YAGNI), но задокументировать |
| **Астролог-ревью становится release-blocker** | Дешёвый хот-фикс (серверный) удаляется; 4 формулировки (`mercury_combust`, `mars_retrograde`, `jupiter_retrograde`, `good`-grade) всё ещё «pending astrologer review» в CLAUDE.md | **MUST:** build-time lint, падающий на маркерах `pending`/`draft` в бандлируемой записи; ревью закрыть до релиза |

### 6a. Митигация дрейфа enum (решение принято)

- На ветке fallback `translate()` (`translate.ts:149,187`, `composer.ts:89`) — fire-and-forget **telemetry-событие** `translate_unknown_enum {field, value}`. В приложении **нет аналитики SDK** → ввести тонкий seam `telemetry.emit(...)` (no-op/локальный лог сейчас, реальный sink — отдельная задача). Это open-dependency для плана.
- **CI-тест:** каждый элемент `KNOWN_FACTOR_IDS`/`KNOWN_REASON_IDS`/`KNOWN_GRADES` имеет запись в словаре. Едет в `packages/translations`.

---

## 7. Порядок работ (high-level; детали — в плане)

**Фаза 0 — Верификация (ДО любого удаления, обратимо):**
- Живой smoke против `api-public`: поймать реальные тела **422 и 429** (если 429 удастся вызвать), реальный конверт ошибки, проверить наличие/форму лимита. Сохранить как фикстуры.
- Подтвердить у astrology-api.io, что **keyless public-tier — поддерживаемый постоянный режим**, не временная настройка.
- Зафиксировать точную форму запроса/ответа (`{success,data}`; `data.{top_windows,excluded_ranges,summary}`).

**Фаза 1 — Пакет:** создать `packages/translations` (package.json `main:./src/index.ts`, deps `@inceptio/shared-types`+`zod@3`; tsconfig), перенести `translations/**` + golden-тесты, подключить в mobile через `file:` + симлинк.

**Фаза 2 — Сетевой слой:** порт `toUpstreamBody`/`callUpstream` в `api.ts` (без ключа), распаковка конверта, Zod, **перевод перед возвратом**, переписанный маппинг ошибок по фикстурам Фазы 0, on-device кэш, tz-инвариант.

**Фаза 3 — daily-note:** порт синтеза (§3a) + reconcile moon-phase + локальный alert-ack.

**Фаза 4 — Удаление (последний, обратимый шаг):** удалить `workers/api-proxy/`, секреты, wrangler, worker-скрипты; обновить CLAUDE.md (decision log + стек).

---

## 8. Тестирование

- **Golden-файлы** перевода (17 файлов: `translate`, `daily-notes`, `synthesizer`, `picker`/`composer`/`horizon`/`moon-phase`/`part-of-day`/`quality-bucket`/`severity-hints`/`voice-leaf-coverage`/`lint-library` + `boundary-tests.golden.ts`) переезжают в `packages/translations` — **выходы не меняются** (регрессионная гарантия тона).
- **Negative-тест forbidden-words** (CLAUDE.md: magic/destiny/energy/…) обязан переехать и покрыть **fallback-фразы И composer** (golden покрывает только позитивные снапшоты; composer собирает текст из частей).
- **Grade-калибровка:** golden на score-65 для **обоих** `fair` И `good` → win-state, тёплый headline.
- **Zod / permissive-enum:** фикстуры реальных ответов (вкл. неизвестный enum → fallback). + **CI-тест полноты словаря** (§6a).
- **Mobile `api.ts`:** точный JSON `toUpstreamBody`; распаковка `{success,data}`; маппинг 422/429 по фикстурам Фазы 0; tz-инвариант.
- **Cross-tz QA-пак** (domain §6): ≥5 пар город/tz через дату-линию + дата в Venus-Rx; не пропустить BUG-001 (off-by-one даты в device-tz).
- **api-headers / post-alert-ack** тесты в mobile — обновить (ломаются).

---

## 9. Не входит в объём (YAGNI)

- Возврат `version-policy` статиком.
- Реальный sink аналитики (только seam сейчас).
- Любая работа по paywall сверх будущей greenfield-задачи.
- Нативная мультиязычность upstream (EN/RU/FR/DE/ES) — это **язык интерпретаций**, ортогонально нашему слою тона (`Locale = en|de|fr|es-419|pt-BR` — ось тона; upstream-языки — сырой неверный регистр). Подтверждено domain-аудитом. **Не смешивать** — соблазн срезать через upstream-язык обходит ревью-гейт и forbidden-words guard и увеличивает риск App Store 4.3.
- Починка стабов `verifyConcreteHorizon` и обновление `STATIONS`.

---

## 10. Риск переноса схемы запроса

Mobile сегодня **не знает** wire-формат upstream — его лепит Worker (`toUpstreamBody`). Воспроизвести точно: `{ activity, date_range:{start_date,end_date}` (каждая `{year,month,day}`), `location:{year,month,day,hour:12,minute:0,latitude,longitude,timezone,city}, top_n_windows:10 }`. Покрывается тестом §8 + фикстурой Фазы 0. **Семантика tz важнее формы** (domain §6): инвариант `request.timezone === tzLookup(lat,lng)` — запрос может быть 200-валиден и астрологически мусорным, если послать device-tz для кросс-tz локации. Перенести инвариант в `api.ts`.

---

## 11. Constraints из аудита (сводка MUST для плана)

Из code-archaeology §7 (non-negotiable):
1. `toUpstreamBody` байт-в-байт + тест точного JSON.
2. Убрать `X-API-Key`; таймаут 60→~20с (`config/api.ts` тоже).
3. Переписать 429/4xx маппинг под голое тело; **сперва поймать реальные тела** (Фаза 0).
4. Удалить ветки `rate_limited` и `upstream_schema_mismatch`; оставить клиентский Zod→`SchemaMismatchError`.
5. `translate()` в сетевом слое до возврата `SearchResult`.
6. daily-note: 3 формы no-viable + `?? false` + `upstreamTz` alias-pick + event-tz `today_iso_date`.
7. Сохранить 6 классов ошибок + surface `library_version`.
8. Reconcile moon-phase (без третьей копии).
9. Создать и подключить `@inceptio/translations` тем же `file:`-механизмом, что `shared-types`.
10. Зафиксировать новые компромиссы: `STATIONS` 2026–2027 → теперь release-bound; стабы `verifyConcreteHorizon`; fork-lockstep `tz-aliases.ts` / `verify-tz-lookup-pin.sh` теперь в бандле.

Из library-audit (HIGH):
11. Keyless-bypass — verify постоянство (Фаза 0); OpenAPI всё ещё требует BearerAuth.
12. 429-контракт не подтверждён — soft-block толерантен к неизвестной форме.
13. Zod остаётся **v3** (4.x ломает shared-types); `@photostructure/tz-lookup` v11.5.0 (не bare `tz-lookup`).
14. Конверт `{success,data}` НЕ в OpenAPI — распаковать до Zod.

Из domain (MUST):
15. build-time lint на `pending`/`draft` маркеры; закрыть астролог-ревью 4 формулировок до релиза.
16. forbidden-words negative-тест покрывает fallback + composer.
17. grade-калибровка байт-точная (fair И good = win).
18. tz-семантика как load-bearing вход; cross-tz QA-пак; не пропагировать BUG-001.
