import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('../storage', () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => { mem.set(k, v); },
    delete: (k: string) => { mem.delete(k); },
  },
}));

import { getDeviceId, clearDeviceId } from '../device-id';

beforeEach(() => { mem.clear(); vi.clearAllMocks(); });

describe('getDeviceId', () => {
  it('returns the cached id without re-deriving', async () => {
    mem.set('inceptio.device_id', 'cached-123');
    expect(await getDeviceId()).toBe('cached-123');
  });
  it('derives + caches the iOS vendor id on first call', async () => {
    const id = await getDeviceId();
    expect(id).toBe('ios-vendor-id'); // from the global expo-application mock
    expect(mem.get('inceptio.device_id')).toBe('ios-vendor-id');
  });
  it('clearDeviceId removes the cached id', async () => {
    mem.set('inceptio.device_id', 'x');
    clearDeviceId();
    expect(mem.get('inceptio.device_id')).toBeUndefined();
  });
});
