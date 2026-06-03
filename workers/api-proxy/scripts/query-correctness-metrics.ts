// Usage:
//   WORKER_URL=https://<production-worker-url> \
//     ADMIN_TOKEN=<from wrangler secret> \
//     npx tsx workers/api-proxy/scripts/query-correctness-metrics.ts
//
// Queries /admin/activity-missing-rate and prints a per-day table covering
// two correctness signals: activity-missing fallback rate (activity Phase B
// cutover gate) and tz_mismatch rate (default-location unpark gate).
//
// Why a CLI rather than wrangler tail: tail samples requests and is awkward
// for ratio math. This endpoint emits already-aggregated daily counters
// straight from KV; the CLI just formats them.
//
// Run from the repo root so the relative usage line matches what operators
// will copy-paste from the staging-deploy runbook.

const WORKER_URL = process.env.WORKER_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!WORKER_URL || !ADMIN_TOKEN) {
  console.error('Required env vars missing: WORKER_URL, ADMIN_TOKEN');
  process.exit(1);
}

type Day = {
  date: string;
  total: number;
  missing: number;
  tz_mismatch: number;
  missing_ratio: number;
  tz_mismatch_ratio: number;
};

async function main(): Promise<void> {
  // Strip trailing slash so `${WORKER_URL}/admin/...` doesn't double up.
  const url = `${WORKER_URL!.replace(/\/$/, '')}/admin/activity-missing-rate`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'x-admin-token': ADMIN_TOKEN! },
  });
  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const body = (await res.json()) as { days: Day[] };

  console.log('');
  console.log('Correctness metrics - last 14 days');
  console.log('');
  console.log('date         total       missing  miss%   tz_mismatch  tzmm%');
  console.log('-'.repeat(70));
  body.days.forEach((d) => {
    const missPct = (d.missing_ratio * 100).toFixed(3) + '%';
    const tzPct = (d.tz_mismatch_ratio * 100).toFixed(3) + '%';
    console.log(
      `${d.date}   ${String(d.total).padStart(10)}  ${String(d.missing).padStart(6)}  ${missPct.padStart(7)}  ${String(d.tz_mismatch).padStart(11)}  ${tzPct.padStart(7)}`,
    );
  });

  // Two signals tracked: activity-missing fallback rate (from activity feature)
  // AND tz-mismatch rate (this feature). Default-location unpark requires the
  // tz-mismatch rate signal to be MET; activity-missing is informational here.
  const recentSeven = body.days.slice(0, 7);
  const tzMismatchUnder = recentSeven.every((d) => d.tz_mismatch_ratio < 0.005);
  const missingUnder = recentSeven.slice(0, 3).every((d) => d.missing_ratio < 0.005);

  console.log('');
  if (tzMismatchUnder) {
    console.log('OK: last 7 days all under 0.5% tz_mismatch - DEFAULT-LOCATION UNPARK signal (a) MET');
    console.log('  (also verify astrologer test pack signed off - that is signal (b))');
  } else {
    console.log('PENDING: not all of last 7 days under 0.5% tz_mismatch - DEFAULT-LOCATION UNPARK NOT MET');
  }

  if (missingUnder) {
    console.log('OK: last 3 days all under 0.5% activity-missing - activity Phase B cutover signal MET');
  } else {
    console.log('PENDING: not all of last 3 days under 0.5% activity-missing - activity Phase B NOT MET');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
