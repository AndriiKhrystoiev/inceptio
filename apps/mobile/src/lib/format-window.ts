// Pure formatters + narrative builder for MomentDetail.
//
// Time display branches deterministically on duration_minutes (CLAUDE.md
// "Windows can be very short" — real values include 1m, 5m, 10m, 25m, 90m).
// Narrative paragraphs are picked from translated displayable.factors, with
// status + weight_class as filters — matches the design-v2.1 spec.

// Loose types — the screen passing values is a .js file, so we accept
// permissive shapes here and validate the only failure modes that matter.
interface WindowLike {
  start?: string;
  end?: string;
  duration_minutes?: number | null;
  factors?: Array<{ factor_id: string; weight_class?: string }>;
  displayable?: {
    factors?: Array<{
      factor_id: string;
      status: 'pass' | 'partial' | 'fail';
      phrase_short: string;
      phrase_full: string;
    }>;
  };
  _synthetic?: boolean;
}

export type DurationVariant = 'long' | 'medium' | 'short' | 'single' | 'unknown';

export function getDurationVariant(
  durationMinutes: number | null | undefined,
): DurationVariant {
  if (durationMinutes == null) return 'unknown';
  if (durationMinutes > 60) return 'long';
  if (durationMinutes >= 10) return 'medium';
  if (durationMinutes > 1) return 'short';
  if (durationMinutes === 1) return 'single';
  return 'unknown';
}

const FMT_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: false,
});

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export interface FormattedWindowTime {
  /** Bold, primary line — e.g. "12:00–13:25 (1h 25m)" or "12:00 exactly" */
  primary: string;
  /** Italic helper line below — null when no extra context is needed */
  secondary: string | null;
}

export function formatWindowTime(window: WindowLike): FormattedWindowTime {
  if (!window.start) return { primary: '', secondary: null };

  const variant = getDurationVariant(window.duration_minutes);
  const startStr = FMT_TIME.format(new Date(window.start));

  // Synthesized windows (heatmap cells without a top_windows[] entry) carry
  // duration_minutes=null and end=start. Show only the start time + an honest
  // hint — don't fall into "single, pristine moment" copy.
  if (window._synthetic || variant === 'unknown') {
    return {
      primary: startStr,
      secondary: 'Approximate time — focused searches show the exact window.',
    };
  }

  const endStr = window.end ? FMT_TIME.format(new Date(window.end)) : startStr;
  const minutes = window.duration_minutes as number;

  switch (variant) {
    case 'long':
      return {
        primary: `${startStr}–${endStr} (${formatDuration(minutes)})`,
        secondary: null,
      };
    case 'medium':
      return {
        primary: `${startStr} · ${minutes} minutes`,
        secondary: null,
      };
    case 'short':
      return {
        primary: `${startStr} · ${minutes} minutes`,
        secondary: 'A precise window — set a reminder.',
      };
    case 'single':
      return {
        primary: `${startStr} exactly`,
        secondary: 'A single, pristine moment. Be ready.',
      };
  }
}

/**
 * Pick 1-3 paragraphs from a window's translated factors:
 *   1. Strongest passing factor's phrase_full
 *   2. Second-strongest passing factor (different factor_id)
 *   3. Most consequential `partial` factor, or `fail` factor with
 *      weight_class !== 'low' — framed as nuance in the design language
 *
 * Factors arrive pre-sorted by weight×contribution from the Worker, so
 * `Array.find(...)` and `.filter(...).slice(0, 2)` are enough — no further
 * ranking on the client.
 *
 * Comparative recommendation (the design-v2.1 4th paragraph) is deferred
 * because it needs synthesis across multiple top_windows.
 */
export function buildNarrative(window: WindowLike): string[] {
  const displayableFactors = window.displayable?.factors ?? [];
  if (displayableFactors.length === 0) {
    // Synthetic windows have no translated factors. Be honest about it.
    return [
      'Less detail is available for this day — try a focused search to see the full breakdown.',
    ];
  }

  // Join displayable.factors → raw factors by factor_id so we can access
  // weight_class (which the Worker doesn't include on DisplayableFactor).
  const rawByFactorId = new Map<string, { weight_class?: string }>(
    (window.factors ?? []).map((f) => [f.factor_id, f]),
  );
  const annotated = displayableFactors.map((d) => ({
    ...d,
    weight_class: rawByFactorId.get(d.factor_id)?.weight_class,
  }));

  const passing = annotated.filter((f) => f.status === 'pass');
  const para1 = passing[0]?.phrase_full;
  const para2 = passing[1]?.phrase_full;

  // Para 3: first partial, or first non-low-weight fail. Skip low-weight
  // fails entirely — design-v2.1 calls them noise (a wedding's L2 view
  // shouldn't lead with a low-weight Mercury fail).
  const para3 = annotated.find(
    (f) =>
      f.status === 'partial' ||
      (f.status === 'fail' && f.weight_class !== 'low'),
  )?.phrase_full;

  const paras = [para1, para2, para3].filter((p): p is string => Boolean(p));

  // Rare defensive case: factors exist but every one is a low-weight fail,
  // so none passed our filters. Fall back to the highest-ranked factor's
  // phrase so the screen still shows something specific to this window.
  if (paras.length === 0 && annotated[0]) {
    return [annotated[0].phrase_full];
  }
  return paras;
}
