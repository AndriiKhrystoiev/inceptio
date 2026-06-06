# Cloudflare Workers (workerd) Library Knowledge Base

Maintained by Compound V Phase 1C validator. Append at the bottom.

---

## Updated 2026-06-06 — Worker daily-counter (usage-cap) runtime audit

Sources: Cloudflare KV docs (`developers.cloudflare.com/kv/api/write-key-value-pairs`, `/kv/concepts/how-kv-works`, `/kv/platform/limits`), CF Workers Vitest-integration docs (`/workers/testing/vitest-integration/*`), CF "JavaScript and web standards" runtime doc, MDN `Intl.DateTimeFormat`. Verified 2026-06-06.

### `Intl` / ICU in workerd
- workerd ships **full ICU** (V8-bundled). `Intl.DateTimeFormat` accepts arbitrary canonical IANA `timeZone` (e.g. `America/Sao_Paulo`, `Europe/Madrid`). No compatibility flag needed for `Intl`. (CF web-standards doc lists Intl as supported; ICU is compiled into V8.)
- `'en-CA'` + `{year:'numeric',month:'2-digit',day:'2-digit'}` → `YYYY-MM-DD` (ISO order). Stable across ICU versions.
- `timeZoneName:'shortOffset'` → `GMT-3` (unpadded, bare `GMT` for UTC); `'longOffset'` → `GMT-03:00` (padded, parse-friendly). Prefer `longOffset` for programmatic parsing.
- **Bundled tzdata is a fixed snapshot** tied to the workerd build → very recent IANA rule changes (e.g. 2026a America/Vancouver permanent-DST, released 2026-03-01) can lag until CF ships a runtime update. Immaterial for display-only `reset_at_unix`; could matter for hard tz correctness.
- **`wrangler dev` runs ambient `TZ=UTC`** — the *default* `Date`/`Intl` zone is UTC locally regardless of host. Does NOT affect explicit-`timeZone` calls. Rule: always pass explicit `timeZone`, never rely on the default. (CF dev/testing doc; workers-sdk issue #8106.)
- DST-safe next-local-midnight without a date lib: compute the zone offset **at the candidate instant** (format-as-tz → reinterpret-as-UTC → diff), with one settle iteration. Do NOT subtract "today's offset" from naive tomorrow-midnight (breaks across DST). Intl-only is sufficient; a date/tz dependency (luxon/date-fns-tz) is NOT warranted for a daily-bucket counter.

### KV semantics
- `KV.put(key, value, { expirationTtl })`: **minimum `expirationTtl` is 60 seconds.** Targets <60s in the future are rejected/throw. → A "seconds-to-next-midnight" TTL must be clamped: `Math.max(60, secondsToMidnight + buffer)`, else `put` throws on near-midnight writes.
- ≤24h TTL (86,400s) is well within limits; unremarkable.
- **Eventual consistency:** writes usually immediately visible at the **writing PoP** but NOT guaranteed; cross-PoP propagation up to **~60s** (negative lookups cached too). For a single device hammering the same PoP, read-after-write is usually fresh. Worst case for a daily counter is "~2× burst **per concurrently-stale PoP**," not a global 2× ceiling — sharpen any soft-cap docs accordingly. For hard/atomic enforcement, route writes for a key through a Durable Object (DO seam).
- **Max 1 write/second per key** — >1/s to same key → 429. Per-device-per-day key won't approach this for human traffic.
- No atomic increment in KV → read-modify-write is non-atomic by design. Accept burst, or use DO.

### `ctx.waitUntil` / execution context
- `ctx.waitUntil(promise)` = correct primitive for fire-and-forget metric writes (must not block/fail the response; errors don't surface to client). Must be threaded from `fetch(request, env, ctx)` (module worker `ExecutionContext`). Thread `ctx` explicitly into helpers; don't use a global.
- `Date.now()` / `new Date()` available in request scope. workerd freezes the wall clock between I/O (timing-side-channel mitigation) — irrelevant to date-bucket logic. `Math.floor(Date.now()/1000)` is the idiomatic injectable-`now` default.

### Testing — `@cloudflare/vitest-pool-workers`
- Tests run **inside workerd** → `Intl` behaves exactly as production (real full-ICU tz math). Right gate for tz/DST tests.
- KV via configured test namespace; `import { env } from 'cloudflare:test'`.
- `ctx.waitUntil` testing: `createExecutionContext()` → run handler → **`await waitOnExecutionContext(ctx)`** before asserting KV side-effects (metrics).
- **Fake timers do NOT apply to KV/R2/cache simulators** — cannot expire a KV key by advancing fake time. → Make `now` an **injectable parameter** for deterministic date/DST/TTL tests (this is necessary, not just convenient). Test TTL by asserting the `expirationTtl` value passed to `put`, NOT by observing the key vanish.

### Mobile (RN/Expo) 429 handling — quick note
- RN `fetch` `Response.headers` is WHATWG `Headers`; `Headers.get` is **case-insensitive** per spec (RN + Hermes honor it). Reading `Retry-After` / `X-RateLimit-*` works regardless of casing.
- Native RN `fetch` is NOT subject to browser CORS → custom headers need no `Access-Control-Expose-Headers`. Reading 429 data from the JSON body (vs headers) avoids the concern entirely and is the more robust choice.
