import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('../storage', () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => { mem.set(k, v); },
    delete: (k: string) => { mem.delete(k); },
  },
}));

import { getPersistedLocale, setPersistedLocale } from '../locale-preference';

beforeEach(() => mem.clear());

describe('persisted locale', () => {
  it('returns null when unset', () => {
    expect(getPersistedLocale()).toBeNull();
  });
  it('round-trips a supported bundle', () => {
    setPersistedLocale('de');
    expect(getPersistedLocale()).toBe('de');
  });
  it('returns null when the stored value is no longer a supported bundle', () => {
    mem.set('inceptio.locale', 'xx-removed');
    expect(getPersistedLocale()).toBeNull();
  });
});
