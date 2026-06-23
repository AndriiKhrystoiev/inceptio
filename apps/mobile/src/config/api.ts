// The mobile app now calls the public astrology API directly (no Cloudflare
// Worker). The public endpoint requires no API key and serves cached responses
// in ~50-500ms, so the old 60s worker-cold-start timeout is no longer needed.
const TIMEOUT_MS = 20_000;

export const API_CONFIG = {
  baseUrl: 'https://api-public.astrology-api.io/api/v3',
  timeout: TIMEOUT_MS,
} as const;
