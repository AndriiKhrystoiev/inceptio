import type { Env } from '../env';

/**
 * GET /admin/activity-missing-rate
 *
 * Auth: header `x-admin-token` must equal env.ADMIN_TOKEN (Wrangler secret).
 *
 * Returns:
 *   {
 *     days: [
 *       { date: 'YYYY-MM-DD', total: number, missing: number, ratio: number },
 *       ...
 *     ]
 *   }
 *
 * — covering the last 14 days, newest first. Days with zero requests
 * return `{ total: 0, missing: 0, ratio: 0 }` (the underlying KV keys
 * simply don't exist yet, which the helper coerces to 0 on read).
 *
 * Purpose
 * -------
 * Reads from the per-day counter keys that Task 2.6's `bumpCounter`
 * writes inside the /daily-note handler:
 *
 *   - `metrics:dn-total:{YYYY-MM-DD}`            — total daily-note calls
 *   - `metrics:dn-activity-missing:{YYYY-MM-DD}` — calls with no ?activity=
 *
 * The Checkpoint 3 gate (Phase 8 Worker-requires-activity cutover)
 * requires the missing rate to be <0.5% on 3 consecutive days before
 * Phase B flips the Worker to return 400 on missing activity. This
 * endpoint surfaces the rate so operators can verify the gate without
 * sampling wrangler-tail logs by hand.
 *
 * Auth model
 * ----------
 * Single-secret header check (`x-admin-token`). No bearer / JWT scheme
 * because the surface is one operator-only endpoint, queried from a
 * trusted CLI. Missing OR mismatched token → 401 plaintext "unauthorized".
 * Fail-closed on missing env.ADMIN_TOKEN: the strict equality check
 * `token !== env.ADMIN_TOKEN` returns 401 if ADMIN_TOKEN is empty/undefined
 * (because `req.headers.get` returns `string | null` and we require
 * BOTH a non-empty token AND a match), so a deploy that forgets to
 * set the secret can never serve the endpoint to anyone.
 *
 * Cost
 * ----
 * 28 KV reads per call (14 days × {total, missing}). Issued via
 * Promise.all so they run in parallel. Free CF Workers KV tier has
 * 100k reads/day so manual operator queries are essentially free.
 */

const DAYS = 14;

function isoDate(d: Date): string {
  // Slicing the ISO string yields YYYY-MM-DD in UTC — matches the
  // todayUtc convention used by daily-note.ts's counter writer, so
  // reader and writer agree on the date boundary regardless of local
  // operator timezone.
  return d.toISOString().slice(0, 10);
}

async function readCounter(kv: KVNamespace, key: string): Promise<number> {
  const raw = await kv.get(key);
  if (raw === null) return 0;
  const n = Number(raw);
  // Same NaN-guard contract as bumpCounter: a corrupt KV value
  // (e.g. legacy 'NaN' from a pre-Task-2.6 write) is read as 0
  // rather than poisoning the ratio computation with NaN.
  return Number.isFinite(n) ? n : 0;
}

export async function handleActivityMissingRate(
  req: Request,
  env: Env,
): Promise<Response> {
  const token = req.headers.get('x-admin-token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return new Response('unauthorized', { status: 401 });
  }

  // Compute the last 14 day-strings in UTC, newest first. Using
  // setUTCDate(today - i) instead of subtracting milliseconds avoids
  // DST-cliff edge cases (UTC dates have no DST, so this is purely
  // belt-and-suspenders against future code drift).
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    dates.push(isoDate(d));
  }

  // Parallel-read all 28 KV keys. flatMap interleaves total+missing
  // per day so they sit at indices [i*2, i*2+1] in the result array,
  // making the days.map below an O(1) index lookup instead of a
  // second pass through the dates.
  const reads = await Promise.all(
    dates.flatMap((date) => [
      readCounter(env.CACHE, `metrics:dn-total:${date}`),
      readCounter(env.CACHE, `metrics:dn-activity-missing:${date}`),
    ]),
  );

  const days = dates.map((date, idx) => {
    // `?? 0` is belt-and-suspenders for noUncheckedIndexedAccess —
    // `reads` is constructed from a fixed-length flatMap so these
    // indices are guaranteed in range, but the index-access type
    // narrowing rule treats array reads as possibly undefined.
    const total = reads[idx * 2] ?? 0;
    const missing = reads[idx * 2 + 1] ?? 0;
    // Zero-total days yield ratio: 0 rather than NaN (avoids
    // JSON-serialization-of-NaN garbage and keeps the CLI's
    // `ratio < 0.005` comparison sane on uninstrumented days).
    const ratio = total > 0 ? missing / total : 0;
    return { date, total, missing, ratio };
  });

  return Response.json({ days }, { status: 200 });
}
