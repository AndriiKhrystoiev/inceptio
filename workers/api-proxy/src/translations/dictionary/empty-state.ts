/**
 * Empty-state invite copy — see spec §6.2.
 *
 * Shown alongside the daily note (not inside it) when
 * `saved_searches.length === 0`. The daily note stays voice-pure for ALL
 * users; this invite is a separate UI element.
 */
export const EMPTY_STATE_INVITE_PRIMARY = 'Choose a moment of your own →';

export const EMPTY_STATE_INVITE_ALTERNATIVES = [
  'For a moment of your own — choose what to begin →',
  'When a specific moment matters, choose what to look at →',
  'For a specific moment — yours to choose →',
] as const;
