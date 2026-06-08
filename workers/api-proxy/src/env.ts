export interface Env {
  CACHE: KVNamespace;
  UPSTREAM_BASE_URL: string;
  WORKER_VERSION: string;
  ASTROLOGY_API_KEY: string;
  ENV: 'development' | 'production';
  // Bearer-equivalent secret for /admin/* routes (Checkpoint 3 gate
  // queries on the activity-missing fallback rate). Set via
  // `wrangler secret put ADMIN_TOKEN` — never put in wrangler.toml.
  // Wrangler secrets surface as plain string properties on Env at
  // runtime; the field is typed as a string here so route handlers
  // can compare it directly without a runtime presence check, and
  // the auth gate handles the empty / undefined-via-mistake case
  // explicitly (returns 401, never 200) so a deploy that forgets the
  // secret fails closed.
  ADMIN_TOKEN: string;
}

// Entitlement tiers. The cap NUMBER lives here and nowhere else (no hardcoded
// limit at any call site). Only `limit` is wired — the reset period is "one
// local calendar day" by construction (the KV key is the local date), so a
// `periodDays` field would be a lying knob and is deliberately omitted.
export const TIERS = {
  free: { limit: 5 },
} as const;

export type Tier = keyof typeof TIERS;

// Stub: no accounts in MVP, so everyone is `free`. Seam for a future `pro`
// tier keyed on identity — callers never hardcode a tier.
export function resolveTier(_env: Env, _deviceId: string): Tier {
  return 'free';
}

export const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const HEALTH_CACHE_TTL_SECONDS = 60;
