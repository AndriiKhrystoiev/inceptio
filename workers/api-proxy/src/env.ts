export interface Env {
  CACHE: KVNamespace;
  UPSTREAM_BASE_URL: string;
  WORKER_VERSION: string;
  ASTROLOGY_API_KEY: string;
  ENV: 'development' | 'production';
}

// Centralized constants. Mirror these on the mobile side via
// apps/mobile/config/features.ts when Phase 4 (mobile integration) lands.
// The per-environment rate-limit ceiling lives in rate-limit.ts's LIMITS table.
export const FEATURES = {
  FREE_SEARCH_PERIOD_DAYS: 30,
} as const;

export const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const HEALTH_CACHE_TTL_SECONDS = 60;
