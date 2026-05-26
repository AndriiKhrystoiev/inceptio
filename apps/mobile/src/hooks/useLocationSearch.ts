import { useEffect, useRef, useState } from 'react';
import {
  searchLocations,
  type NominatimResult,
} from '../lib/nominatim';

const DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;

export interface LocationSearchState {
  data: NominatimResult[];
  isLoading: boolean;
  error: Error | null;
}

const EMPTY_STATE: LocationSearchState = {
  data: [],
  isLoading: false,
  error: null,
};

/**
 * Debounced (500ms) Nominatim search hook.
 *
 * Behavior:
 *   - Query < 2 chars → returns empty state, no network call
 *   - Otherwise → 500ms after the last keystroke, fires `searchLocations`
 *   - A new keystroke during the debounce window resets the timer
 *   - A new keystroke after the request fired aborts the in-flight call via
 *     AbortController, so stale results never overwrite fresh state
 *
 * Errors are surfaced via `error`. AbortError is filtered out (it's expected
 * during normal typing flow).
 */
export function useLocationSearch(query: string): LocationSearchState {
  const [state, setState] = useState<LocationSearchState>(EMPTY_STATE);
  // Track the in-flight controller so a new query can cancel the prior call.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    // Always abort any in-flight call before considering this new query.
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState(EMPTY_STATE);
      return;
    }

    const timer = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      searchLocations(trimmed, controller.signal)
        .then((data) => {
          // Defensive: a later keystroke may have aborted us between the
          // fetch returning and this callback firing.
          if (controller.signal.aborted) return;
          setState({ data, isLoading: false, error: null });
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setState({
            data: [],
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      // Effect cleanup runs on unmount + on query change. The next effect
      // run aborts again; doing it here too keeps things tidy if the
      // component unmounts mid-debounce.
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [query]);

  return state;
}
