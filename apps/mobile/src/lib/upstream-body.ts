import type { ElectionalSearchRequest } from '@inceptio/shared-types';

function parseDateParts(s: string): { year: number; month: number; day: number } {
  const datePart = s.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) {
    throw new Error(`Invalid date string: ${s}`);
  }
  return { year: parseInt(y, 10), month: parseInt(m, 10), day: parseInt(d, 10) };
}

/** Flat mobile request → nested upstream request shape. Must stay byte-for-byte
 *  identical to the upstream's expected body (see plan Global Constraints). */
export function toUpstreamBody(req: ElectionalSearchRequest): Record<string, unknown> {
  const start = parseDateParts(req.start);
  const end = parseDateParts(req.end);
  return {
    activity: req.activity,
    date_range: { start_date: start, end_date: end },
    location: {
      year: start.year, month: start.month, day: start.day,
      hour: 12, minute: 0,
      latitude: req.lat, longitude: req.lng,
      timezone: req.timezone, city: req.city,
    },
    top_n_windows: 10,
  };
}
