import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Calendar from 'expo-calendar';
import { addWindowToCalendar } from '../calendar-export';

const win = { start: '2026-07-01T12:00:00Z', end: '2026-07-01T12:30:00Z', displayable: { headline: 'A tender day.' } };

beforeEach(() => vi.clearAllMocks());

describe('addWindowToCalendar', () => {
  it('rejects a window with no start', async () => {
    const r = await addWindowToCalendar({}, 'wedding', 'Kyiv');
    expect(r).toEqual({ ok: false, reason: 'invalid_window', message: expect.any(String) });
  });

  it('returns permission failure when denied', async () => {
    vi.mocked(Calendar.requestCalendarPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as never);
    const r = await addWindowToCalendar(win, 'wedding', 'Kyiv');
    expect(r).toMatchObject({ ok: false, reason: 'permission' });
  });

  it('returns no_calendar when no writable calendar exists', async () => {
    vi.mocked(Calendar.getCalendarsAsync).mockResolvedValueOnce([
      { id: 'c', allowsModifications: false, source: { name: 'Other' } },
    ] as never);
    const r = await addWindowToCalendar(win, 'wedding', 'Kyiv');
    expect(r).toMatchObject({ ok: false, reason: 'no_calendar' });
  });

  it('creates an event and returns ok', async () => {
    const r = await addWindowToCalendar(win, 'business_launch', 'Kyiv');
    expect(r).toEqual({ ok: true });
    expect(Calendar.createEventAsync).toHaveBeenCalledOnce();
  });

  it('returns unknown failure when createEvent throws', async () => {
    vi.mocked(Calendar.createEventAsync).mockRejectedValueOnce(new Error('boom'));
    const r = await addWindowToCalendar(win, 'travel', 'Kyiv');
    expect(r).toMatchObject({ ok: false, reason: 'unknown', message: 'boom' });
  });
});
