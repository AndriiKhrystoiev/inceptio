import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory AsyncStorage mock — no native module available in vitest node env.
const asyncStorageMemory = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => asyncStorageMemory.get(key) ?? null,
    setItem: async (key: string, value: string) => { asyncStorageMemory.set(key, value); },
    removeItem: async (key: string) => { asyncStorageMemory.delete(key); },
  },
}));

import { ackAlert, isAlertAcked } from '../alert-ack';

beforeEach(() => { asyncStorageMemory.clear(); });

describe('local alert-ack', () => {
  it('persists an ack locally and reads it back', async () => {
    await ackAlert('alert-xyz');
    expect(await isAlertAcked('alert-xyz')).toBe(true);
    expect(await isAlertAcked('never-acked')).toBe(false);
  });

  it('acks two different alerts independently', async () => {
    await ackAlert('alert-1');
    expect(await isAlertAcked('alert-1')).toBe(true);
    expect(await isAlertAcked('alert-2')).toBe(false);
    await ackAlert('alert-2');
    expect(await isAlertAcked('alert-2')).toBe(true);
  });
});
