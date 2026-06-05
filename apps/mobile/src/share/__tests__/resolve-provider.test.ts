import { describe, it, expect, vi } from 'vitest';

vi.mock('../native-share-provider', () => ({ nativeShareProvider: { id: 'native-share', share: vi.fn() } }));

import { resolveShareProvider } from '../resolve-provider';

describe('resolveShareProvider', () => {
  it('returns the native provider for the native-share gate', () => {
    expect(resolveShareProvider('native-share').id).toBe('native-share');
  });
  it('throws a clear error for not-yet-implemented providers', () => {
    expect(() => resolveShareProvider('server-render')).toThrow(/not implemented/i);
    expect(() => resolveShareProvider('direct-stories')).toThrow(/not implemented/i);
  });
});
