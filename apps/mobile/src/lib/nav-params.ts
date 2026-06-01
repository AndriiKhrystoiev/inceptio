/**
 * Thin module-level store for passing params between screens without
 * introducing react-navigation. Phase 5 will replace this with navigation
 * params when the router is swapped in.
 *
 * The selected window flows: TodayScreen / CalendarScreen → MomentDetail.
 * We pass the whole Window object (not an index) because the source screen
 * and the detail screen may run different searches — TodayScreen does a
 * single-day query via /daily-note, CalendarScreen does a 30-day search.
 * Passing an index against a different React Query cache produces "tapped
 * Tuesday, see Saturday" bugs.
 */

// Loosely typed — JS screens consume it without TypeScript imports.
type AnyWindow = Record<string, unknown> & {
  start?: string;
  end?: string;
  score?: number;
  grade?: string;
  duration_minutes?: number;
  factors?: unknown[];
  displayable?: { headline?: string; factors?: unknown[] };
  rank?: number;
};

let _selectedWindow: AnyWindow | null = null;

export function setSelectedWindow(window: AnyWindow | null): void {
  _selectedWindow = window;
}

export function getSelectedWindow(): AnyWindow | null {
  return _selectedWindow;
}

export function clearSelectedWindow(): void {
  _selectedWindow = null;
}
