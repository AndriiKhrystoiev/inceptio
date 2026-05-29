import type { SavedSearchStatusOutput } from '../types';

export interface OrderResult {
  visible: SavedSearchStatusOutput[];
  overflow_count: number;
}

const VISIBLE_CAP = 3;

/**
 * Order saved-search statuses by ascending `priority` and cap visible at 3.
 *
 * The `priority` field is populated by `deriveSavedSearchStatus()` in
 * `daily-notes/saved-search-state.ts` per the spec §6.4 band ordering +
 * 2026-05-29 amendment slotting `none-yet`. Single source of truth lives
 * there; this function is purely a sort-and-slice.
 *
 * Returns `overflow_count = max(0, input.length - 3)` so the client can
 * render the "+N more →" affordance per spec §6.4.
 */
export function orderStatusLines(
  statuses: SavedSearchStatusOutput[],
): OrderResult {
  const sorted = [...statuses].sort((a, b) => a.priority - b.priority);
  return {
    visible: sorted.slice(0, VISIBLE_CAP),
    overflow_count: Math.max(0, sorted.length - VISIBLE_CAP),
  };
}
