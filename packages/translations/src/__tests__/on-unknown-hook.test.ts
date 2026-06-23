import { describe, it, expect, vi } from 'vitest';
import { translateExcludedReason } from '../translate';

describe('translate onUnknown hook', () => {
  it('invokes onUnknown for an unknown reason_id', () => {
    const onUnknown = vi.fn();
    translateExcludedReason('totally_made_up_reason', 'en', { onUnknown });
    expect(onUnknown).toHaveBeenCalledWith('reason_id', 'totally_made_up_reason');
  });
});
