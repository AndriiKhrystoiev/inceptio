import type { Env } from '../env';

const ACK_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days — long enough to outlive any concurrent in-progress window

/**
 * Compose the KV key for an alert ack — namespaced by device_id so acks
 * don't leak across users sharing a device pool. The key is the persistence
 * primitive; the value is just `'1'` (presence is the signal).
 */
export function ackKeyOf(deviceId: string, alertId: string): string {
  return `alert-ack:${deviceId}:${alertId}`;
}

/**
 * POST /daily-note/alert-ack
 *
 * Body: { device_id: string, alert_id: string }
 *
 * Stores the (device_id, alert_id) tuple in KV so subsequent
 * `deriveSavedSearchStatus` calls treat the alert as acknowledged and
 * collapse the saved-search status back to `pre-window`. Fire-and-forget
 * from the client; idempotent (writing the same key twice is a no-op).
 *
 * MVP scope: the fan-out integration that READS this list during the
 * /daily-note response is deferred to a follow-on task — the endpoint exists
 * so the ack flow is wired and clients can post acks the moment the alert
 * is dismissed in the UI, without waiting for the fan-out to land.
 */
export async function handleAlertAck(req: Request, env: Env): Promise<Response> {
  let body: { device_id?: unknown; alert_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'invalid JSON body' }, { status: 400 });
  }

  const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
  const alertId = typeof body.alert_id === 'string' ? body.alert_id.trim() : '';

  if (!deviceId || !alertId) {
    return Response.json(
      { error: 'bad_request', message: 'device_id and alert_id are required strings' },
      { status: 400 },
    );
  }

  await env.CACHE.put(ackKeyOf(deviceId, alertId), '1', { expirationTtl: ACK_TTL_SECONDS });

  return Response.json({ ok: true });
}
