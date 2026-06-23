import { describe, it, expect } from 'vitest';
import { toUpstreamBody } from '../upstream-body';

describe('toUpstreamBody', () => {
  it('produces the exact nested upstream shape', () => {
    const body = toUpstreamBody({
      activity: 'wedding',
      lat: 50.45, lng: 30.52,
      start: '2026-07-01', end: '2026-07-07',
      timezone: 'Europe/Kyiv', city: 'Kyiv',
    });
    expect(body).toEqual({
      activity: 'wedding',
      date_range: {
        start_date: { year: 2026, month: 7, day: 1 },
        end_date: { year: 2026, month: 7, day: 7 },
      },
      location: {
        year: 2026, month: 7, day: 1, hour: 12, minute: 0,
        latitude: 50.45, longitude: 30.52,
        timezone: 'Europe/Kyiv', city: 'Kyiv',
      },
      top_n_windows: 10,
    });
  });

  it('takes only the date portion of an ISO datetime', () => {
    const body = toUpstreamBody({
      activity: 'travel', lat: 0, lng: 0,
      start: '2026-07-01T08:30:00Z', end: '2026-07-02T00:00:00Z',
      timezone: 'UTC', city: 'x',
    });
    expect((body as any).date_range.start_date).toEqual({ year: 2026, month: 7, day: 1 });
  });
});
