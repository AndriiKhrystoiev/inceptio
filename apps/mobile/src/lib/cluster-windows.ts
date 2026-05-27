// Cluster the API's top_windows[] into list-view cards — one card per day.
//
// Background: astrology-api samples favorable periods at ~15-minute
// intervals, so a single Jupiter-strong evening becomes 5-7 separate
// top_windows entries with identical factors and start times 15 minutes
// apart. A long day can also have two separate stretches (afternoon
// Jupiter, evening Jupiter) for the same activity. Rendered as individual
// cards this becomes 7-10 near-identical "Saturday May 30" rows.
//
// We collapse to one card per calendar date. The card surfaces the day's
// strongest moment (pill, score, tagline, tap-target). When the day's
// windows all fall within ~90 minutes we show the contiguous range
// ("21:30 → 22:30"); when they're spread across the day (e.g. afternoon
// + evening on the same date) we point to the strongest moment instead
// ("best at 21:30") to avoid implying the entire 6-hour gap is favorable.

import { formatWindowTime } from './format-window';

interface Factor {
  factor_id: string;
  phrase_short?: string;
  phrase_full?: string;
}

interface Window {
  start?: string;
  end?: string;
  score?: number;
  grade?: string;
  duration_minutes?: number | null;
  displayable?: {
    factors?: Factor[];
    tagline?: { phrase_short?: string };
    headline?: string;
  };
  rank?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ListCard {
  /** Highest-scored window in the cluster — drives pill, score, tap nav. */
  representative: Window;
  /** Number of upstream windows merged into this card. 1 means a singleton. */
  count: number;
  /** Pre-formatted "Saturday, May 30". */
  dateText: string;
  /** "21:30 → 22:30" for clusters; "21:30 exactly" / "12:00 · 90 minutes" for singletons. */
  timePrimary: string;
  /** Italic helper line below the time — suppressed for clusters. */
  timeSecondary: string | null;
  /** All windows in the cluster, sorted by score descending. */
  windows: Window[];
}

const FMT_FULL_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const FMT_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: false,
});

// Threshold deciding "tight stretch" (show a range) vs "spread across the
// day" (point to the strongest). 90 minutes covers the API's 15-min sampling
// cadence with slack for an occasional missing sample.
const TIGHT_STRETCH_MINUTES = 90;

function dateKey(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

function minutesBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

export function clusterWindows(windows: Window[]): ListCard[] {
  if (!windows || windows.length === 0) return [];

  // Bucket by calendar date. Order within a bucket doesn't matter yet —
  // we sort by score for the representative and by start for the range.
  const byDate = new Map<string, Window[]>();
  for (const w of windows) {
    const key = dateKey(w.start);
    if (!key) continue;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(w);
  }

  const cards: ListCard[] = [];
  for (const group of byDate.values()) {
    const byScore = [...group].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const byStart = [...group].sort((a, b) =>
      (a.start ?? '').localeCompare(b.start ?? ''),
    );
    const rep = byScore[0]!;
    const dateText = rep.start
      ? FMT_FULL_DATE.format(new Date(rep.start))
      : '';

    let timePrimary: string;
    let timeSecondary: string | null = null;

    if (group.length === 1) {
      const ft = formatWindowTime(rep);
      timePrimary = ft.primary;
      timeSecondary = ft.secondary;
    } else {
      const firstStart = byStart[0]!.start!;
      const lastStart = byStart[byStart.length - 1]!.start!;
      const span = minutesBetween(firstStart, lastStart);
      if (span <= TIGHT_STRETCH_MINUTES) {
        // All of today's moments in one contiguous stretch — show the range.
        // Start times are local-at-location (the offset in the ISO string
        // encodes the zone), so Intl formatting here behaves predictably
        // even when the device is in a different timezone.
        timePrimary = `${FMT_TIME.format(new Date(firstStart))} → ${FMT_TIME.format(new Date(lastStart))}`;
      } else {
        // Spread across the day — pointing at the strongest moment is
        // honest. A range like "15:45 → 22:00" would imply the entire
        // ~6 hours are favorable when really there's a dead zone between.
        timePrimary = `best at ${FMT_TIME.format(new Date(rep.start!))}`;
      }
      // The "single, pristine moment" hint contradicts a multi-moment
      // card — drop it and let the count line carry the meaning.
    }

    cards.push({
      representative: rep,
      count: group.length,
      dateText,
      timePrimary,
      timeSecondary,
      windows: byScore,
    });
  }

  // Cards rendered under a "Strongest moments first" header — sort by the
  // day's best score descending. Chronological order would bury a 75-score
  // Saturday below a 64-score Friday.
  return cards.sort(
    (a, b) => (b.representative.score ?? 0) - (a.representative.score ?? 0),
  );
}
