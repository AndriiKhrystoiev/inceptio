import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import { searchElectional, type SearchResult } from '../lib/api';

/**
 * Build a stable cache key from the request fields used in the direct upstream call.
 * Mirrors the field set of the upstream request (sorted object hash) — but here we
 * just need order-independent equality for React Query.
 */
function makeKey(req: Partial<ElectionalSearchRequest>) {
  return [
    'search',
    req.activity ?? null,
    req.start ?? null,
    req.end ?? null,
    req.lat ?? null,
    req.lng ?? null,
    req.timezone ?? null,
    req.city ?? null,
  ] as const;
}

export function isCompleteRequest(
  req: Partial<ElectionalSearchRequest>,
): req is ElectionalSearchRequest {
  return (
    typeof req.activity === 'string' &&
    typeof req.start === 'string' &&
    typeof req.end === 'string' &&
    typeof req.lat === 'number' &&
    typeof req.lng === 'number' &&
    typeof req.timezone === 'string' &&
    typeof req.city === 'string'
  );
}

/**
 * Run a search and cache the result. Auto-enables when all fields are present;
 * passing an incomplete partial leaves the query disabled (no fetch).
 */
export function useElectionalSearch(
  request: Partial<ElectionalSearchRequest>,
): UseQueryResult<SearchResult, Error> {
  const enabled = isCompleteRequest(request);
  return useQuery({
    queryKey: makeKey(request),
    queryFn: () => {
      // Dev-only — confirms what we actually send to the upstream API. Lets us
      // catch silent param drops (e.g., a screen ignoring the picker
      // selection and falling back to a default) without UI plumbing.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[search-request]', JSON.stringify(request));
      }
      return searchElectional(request as ElectionalSearchRequest);
    },
    enabled,
  });
}
