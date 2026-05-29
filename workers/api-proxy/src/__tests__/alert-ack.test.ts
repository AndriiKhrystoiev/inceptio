import { describe, expect, it, vi } from 'vitest';
import { ackKeyOf } from '../routes/alert-ack';

describe('ackKeyOf', () => {
  it('namespaces by device_id so users don’t leak acks across devices', () => {
    expect(ackKeyOf('dev-1', 'alert:s1:2026-07-15T14:00:00+03:00')).toContain('dev-1');
    expect(ackKeyOf('dev-1', 'alert:s1:2026-07-15T14:00:00+03:00')).toMatch(/^alert-ack:dev-1:/);
  });

  it('different alert_ids on the same device produce different keys', () => {
    const k1 = ackKeyOf('dev-1', 'alert:s1:t1');
    const k2 = ackKeyOf('dev-1', 'alert:s2:t1');
    expect(k1).not.toBe(k2);
  });
});
