import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// react-native isn't parseable in the node test env (transitive import via
// src/config/api.ts → Platform.OS). Escape hatch documented in plan §13.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

// __DEV__ is an RN-injected global. config/api.ts reads it at module-eval
// time, so it must exist before any import resolves. vi.hoisted runs before
// the imports below. Same escape-hatch spirit as the react-native mock.
vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

// device-id reads from storage which requires hydration; mock it.
vi.mock('../device-id', () => ({
  getDeviceId: vi.fn(async () => 'test-device-id-abc'),
}));

// api.ts now imports activeBundle from ../i18n/locale, which pulls in
// expo-localization (native EventEmitter, undefined in node). Same escape-hatch
// as the react-native mock above. Inert here — postAlertAck sends no X-Locale.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

import { postAlertAck, ServerError } from '../api';

describe('postAlertAck', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('POSTs { device_id, alert_id } to /daily-note/alert-ack', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    await postAlertAck('alert-test-1');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]!;
    expect(String(calledUrl)).toContain('/daily-note/alert-ack');
    expect(calledInit).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    });
    const body = JSON.parse(String(calledInit.body));
    expect(body).toEqual({
      device_id: 'test-device-id-abc',
      alert_id: 'alert-test-1',
    });
  });

  it('throws ServerError on 5xx', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 })) as unknown as typeof fetch;

    await expect(postAlertAck('alert-x')).rejects.toBeInstanceOf(ServerError);
  });

  it('throws ServerError on 4xx', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 400 })) as unknown as typeof fetch;

    await expect(postAlertAck('alert-x')).rejects.toBeInstanceOf(ServerError);
  });

  it('resolves void on 200', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 })) as unknown as typeof fetch;

    await expect(postAlertAck('alert-x')).resolves.toBeUndefined();
  });
});
