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

// Centralized constants. Mirror these on the mobile side via
// apps/mobile/config/features.ts when Phase 4 (mobile integration) lands.
// The per-environment rate-limit ceiling lives in rate-limit.ts's LIMITS table.
export const FEATURES = {
  FREE_SEARCH_PERIOD_DAYS: 30,
} as const;

export const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const HEALTH_CACHE_TTL_SECONDS = 60;
