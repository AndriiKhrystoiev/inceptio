// Usage:
//   WORKER_URL=https://<production-worker-url> \
//     ADMIN_TOKEN=<from wrangler secret> \
//     npx tsx workers/api-proxy/scripts/query-activity-missing-rate.ts
//
// Queries /admin/activity-missing-rate and prints a per-day table for the
// Checkpoint 3 gate's <0.5%-rate × 3 days verification.
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

type Day = { date: string; total: number; missing: number; ratio: number };

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
  console.log('Activity-missing fallback rate - last 14 days');
  console.log('');
  console.log('date         total           missing    ratio');
  console.log('-'.repeat(50));
  body.days.forEach((d) => {
    const ratioPct = (d.ratio * 100).toFixed(3) + '%';
    console.log(
      `${d.date}   ${String(d.total).padStart(10)}    ${String(d.missing).padStart(6)}     ${ratioPct.padStart(7)}`,
    );
  });

  // Checkpoint 3 gate hint. Conservative: we only flag the signal as
  // MET when all three most-recent days have ratio < 0.005 (<0.5%).
  // The CLI does NOT auto-trigger the Phase B cutover — operators still
  // verify rollout dominance and a wrangler-tail sample manually before
  // flipping Phase 8. This is one signal of three.
  const recentThree = body.days.slice(0, 3);
  const allUnderFiveTenths = recentThree.every((d) => d.ratio < 0.005);
  console.log('');
  if (allUnderFiveTenths) {
    console.log(
      'OK: last 3 days all under 0.5% - Checkpoint 3 signal MET (this signal only; verify rollout dominance + wrangler tail too)',
    );
  } else {
    console.log('PENDING: not all of last 3 days under 0.5% - Checkpoint 3 signal NOT MET');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
