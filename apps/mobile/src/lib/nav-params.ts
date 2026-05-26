/**
 * Thin module-level store for passing params between screens without
 * introducing react-navigation. Phase 5 will replace this with navigation
 * params when the router is swapped in.
 *
 * Only Calendar → MomentDetail currently uses this. If you add more
 * param-passing needs before Phase 5, add keys here rather than coupling
 * screens together via callbacks.
 */

let _windowIndex = 0;

export function setWindowIndex(index: number): void {
  _windowIndex = index;
}

export function getWindowIndex(): number {
  return _windowIndex;
}
