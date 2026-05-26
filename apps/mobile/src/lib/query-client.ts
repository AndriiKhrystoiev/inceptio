import { QueryClient } from '@tanstack/react-query';
import { RateLimitError, SchemaMismatchError } from './api';

// Worker cache TTL is 7 days. We let React Query treat results as fresh for
// 6 days (slightly less) so we don't re-fetch on every screen mount; gcTime
// holds the data in memory for the full 7 days.
const SIX_DAYS = 1000 * 60 * 60 * 24 * 6;
const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: SIX_DAYS,
      gcTime: SEVEN_DAYS,
      retry: (failureCount, error) => {
        // No point retrying a rate-limit; the second call will be 429 too,
        // and a schema mismatch won't fix itself either.
        if (error instanceof RateLimitError) return false;
        if (error instanceof SchemaMismatchError) return false;
        return failureCount < 1;
      },
      // RN has no window-focus concept; the option fires on app-foreground
      // events instead and we don't want spontaneous refetches there.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
