// Single source of truth for app feature flags. Flat `as const` to mirror
// config/api.ts. Co-locates the paywall flags CLAUDE.md documents so there is
// only ONE features.ts. Card share-provider gate is pluggable: 'native-share'
// (v1) | 'server-render' (Satori fallback) | 'direct-stories' (future).
// NOTE (direct-api migration): the search cap is now enforced UPSTREAM
// (api-public's per-IP limit) — there is no Worker counter and these MAX_FREE_*
// constants no longer gate searches. They are retained for the future paywall,
// which will build on the upstream limit. See CLAUDE.md decision log "direct-api".
export const FEATURES = {
  PAYWALL_ENABLED: false,
  MAX_FREE_SEARCHES: 10,
  FREE_SEARCH_PERIOD_DAYS: 30,
  MAX_RANGE_MONTHS_FREE: 12,
  MAX_RANGE_MONTHS_PRO: 12,
  MOMENT_CARD_SHARE_PROVIDER: 'native-share',
} as const;

export type ShareProviderId =
  (typeof FEATURES)['MOMENT_CARD_SHARE_PROVIDER'] | 'server-render' | 'direct-stories';
