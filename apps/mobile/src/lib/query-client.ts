import { QueryClient } from '@tanstack/react-query';
import { RateLimitError, SchemaMismatchError, ServerError, UpstreamQuotaError } from './api';

// Upstream astrology-api.io caches results server-side; on-device we let React
// Query treat results as fresh for 6 days (slightly under the upstream TTL) so
// we don't re-fetch on every screen mount; gcTime holds the data in memory for
// the full 7 days.
const SIX_DAYS = 1000 * 60 * 60 * 24 * 6;
const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: SIX_DAYS,
      gcTime: SEVEN_DAYS,
      retry: (failureCount, error) => {
        if (error instanceof RateLimitError) return false;
        if (error instanceof UpstreamQuotaError) return false; // 429 won't clear on retry; don't re-burn the IP quota
        if (error instanceof SchemaMismatchError) return false;
        // I1: a 5xx (incl. getDailyNote's empty-day 502) won't clear on an immediate
        // retry either, and the whole migration is about conserving the IP quota.
        if (error instanceof ServerError && error.status >= 500) return false;
        return failureCount < 1;
      },
      // RN has no window-focus concept; the option fires on app-foreground
      // events instead and we don't want spontaneous refetches there.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
