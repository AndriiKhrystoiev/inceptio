// Best-effort KV counters for aggregate metrics. Read-modify-write (KV has no
// atomic increment). The NaN-guard is load-bearing: without it, one corrupt
// write ('NaN') would poison the counter for its whole TTL.

export const COUNTER_TTL_SECONDS = 14 * 86400; // 14 days

export async function bumpCounter(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number = COUNTER_TTL_SECONDS,
): Promise<void> {
  try {
    const prev = await kv.get(key);
    const prevNum = prev !== null ? Number(prev) : 0;
    const base = Number.isFinite(prevNum) ? prevNum : 0;
    await kv.put(key, String(base + 1), { expirationTtl: ttlSeconds });
  } catch {
    // Best-effort: a metric write must never fail the user request.
  }
}

export async function readCounter(kv: KVNamespace, key: string): Promise<number> {
  const raw = await kv.get(key);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
