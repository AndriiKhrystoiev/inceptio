import { describe, expect, it } from 'vitest';

// react-native isn't parseable in the node test env (transitive import via
// src/config/api.ts → Platform.OS). Escape hatch mirrors post-alert-ack.test.ts.
import { vi } from 'vitest';
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

import { DailyNoteResponseSchema } from '@inceptio/shared-types';

/** Minimal valid DailyNoteResponse fixture — matches DailyNoteResponseSchema. */
const BASE_RESPONSE = {
  daily_note: {
    mood: 'mixed' as const,
    moon_phase: 'waning-crescent' as const,
    date: '2026-06-02',
    headline: 'The Moon is between signs today.',
    supporting: "Efforts begun now don't take root the way they do on other days.",
    entry_id: 'moon_voc-mixed-001',
    used_fallback: false,
  },
  saved_searches: [],
  total_saved_count: 0,
  library_version: 'v3',
  part_of_day_cutoffs: {
    morning_end_hour: 12,
    afternoon_end_hour: 17,
    evening_end_hour: 21,
  },
};

describe('DailyNote response decoder — severity_hint field', () => {
  it('accepts a response WITH severity_hint present', () => {
    const fixture = {
      ...BASE_RESPONSE,
      daily_note: {
        ...BASE_RESPONSE.daily_note,
        severity_hint:
          "For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days.",
      },
    };

    expect(() => DailyNoteResponseSchema.parse(fixture)).not.toThrow();

    const out = DailyNoteResponseSchema.parse(fixture);
    expect(out.daily_note.severity_hint).toBe(
      "For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days.",
    );
  });

  it('accepts a response WITHOUT severity_hint (backward compatibility)', () => {
    // BASE_RESPONSE.daily_note has no severity_hint — the field is absent entirely.
    expect(() => DailyNoteResponseSchema.parse(BASE_RESPONSE)).not.toThrow();

    const out = DailyNoteResponseSchema.parse(BASE_RESPONSE);
    expect(out.daily_note.severity_hint).toBeUndefined();
  });
});
