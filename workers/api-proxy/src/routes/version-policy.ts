import type { Env } from '../env';
import { VersionPolicySchema, parseSemver, compareSemver, type VersionPolicy } from '@inceptio/shared-types';

// Reserved key in the shared CACHE namespace (mirrors `health:upstream`).
// CRITICAL: this key is written WITHOUT an expirationTtl (persistent) and must
// be excluded from any future cache-flush/clear logic — eviction → 503 → the
// gate goes silently inert. (No flush-all logic exists today; search/health use
// per-key TTLs only.)
const KEY = 'version-policy';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Serve-time second safety layer. A corrupt/incoherent KV doc can never leave
 *  the Worker as a force-capable response. */
export async function handleVersionPolicy(env: Env): Promise<Response> {
  const raw = await env.CACHE.get(KEY);
  if (raw === null) {
    console.warn('[version-policy] KV key missing — endpoint inert (client fail-opens)');
    return Response.json({ error: 'no_policy' }, { status: 503, headers: NO_STORE });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[version-policy] KV value is not JSON');
    return Response.json({ error: 'bad_policy' }, { status: 503, headers: NO_STORE });
  }

  const result = VersionPolicySchema.safeParse(parsed);
  if (!result.success) {
    console.warn('[version-policy] KV doc failed schema:', result.error.message);
    return Response.json({ error: 'bad_policy' }, { status: 503, headers: NO_STORE });
  }

  const doc = neutralizeIncoherent(result.data);
  return Response.json(doc, { headers: { 'Cache-Control': 'public, max-age=60' } });
}

/** If any platform has min>latest, the doc is incoherent — disable force for
 *  the whole doc (degrade to soft) so an operator typo can't mass-lock. */
function neutralizeIncoherent(doc: VersionPolicy): VersionPolicy {
  for (const platform of ['ios', 'android'] as const) {
    const p = doc[platform];
    if (!p) continue;
    const min = parseSemver(p.minVersion);
    const latest = parseSemver(p.latestVersion);
    if (min && latest && compareSemver(min, latest) > 0) {
      console.warn(`[version-policy] incoherent ${platform} min>latest — neutralizing forceEnabled`);
      return { ...doc, forceEnabled: false };
    }
  }
  return doc;
}
