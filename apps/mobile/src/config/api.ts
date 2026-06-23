// The mobile app calls the public astrology API directly (no Cloudflare Worker).
// Production is ALWAYS keyless against api-public and serves cached responses in
// ~50-500ms, so the old 60s worker-cold-start timeout is gone.
//
// Dev/test builds may override the base URL and/or send an X-API-Key, sourced
// from gitignored `apps/mobile/.env` (EXPO_PUBLIC_* vars, inlined by Expo). The
// override is honored ONLY when __DEV__ is true — a production build can never
// embed a key or be pointed away from the keyless public endpoint, even if the
// EXPO_PUBLIC_* vars leak into the build environment. See `.env.example`.
const PROD_BASE_URL = 'https://api-public.astrology-api.io/api/v3';
const TIMEOUT_MS = 20_000;

export interface ApiConfig {
  baseUrl: string;
  /** X-API-Key sent on upstream calls. null in production (keyless). */
  apiKey: string | null;
  timeout: number;
}

/**
 * Pure resolver — unit-testable without the RN `__DEV__` global. The dev base
 * URL override and dev API key are honored ONLY when `isDev` is true; otherwise
 * the config is the keyless production default regardless of the env inputs.
 */
export function resolveApiConfig(opts: {
  isDev: boolean;
  baseUrlOverride?: string;
  devApiKey?: string;
}): ApiConfig {
  if (opts.isDev) {
    return {
      baseUrl: opts.baseUrlOverride?.trim() || PROD_BASE_URL,
      apiKey: opts.devApiKey?.trim() || null,
      timeout: TIMEOUT_MS,
    };
  }
  return { baseUrl: PROD_BASE_URL, apiKey: null, timeout: TIMEOUT_MS };
}

// `typeof __DEV__` guard so this module is safe under vitest (where __DEV__ is
// undefined → treated as production, the safe default for tests).
const isDev = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export const API_CONFIG: ApiConfig = resolveApiConfig({
  isDev,
  baseUrlOverride: process.env.EXPO_PUBLIC_ASTROLOGY_BASE_URL,
  devApiKey: process.env.EXPO_PUBLIC_ASTROLOGY_DEV_KEY,
});
