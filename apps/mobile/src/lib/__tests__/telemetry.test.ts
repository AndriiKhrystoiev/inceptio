import { describe, it, expect, vi } from 'vitest';
import { emit } from '../telemetry';

describe('telemetry.emit', () => {
  it('does not throw and is fire-and-forget', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => emit('translate_unknown_enum', { field: 'reason_id', value: 'x' })).not.toThrow();
    spy.mockRestore();
  });
});
