import { describe, it, expect } from 'vitest';
import {
  SEVERITY_HINTS,
  getSeverityHint,
  type SeverityCondition,
} from '../dictionary/severity-hints';
import { localize } from '../types';
import { ActivitySchema, type Activity } from '@inceptio/shared-types';

const ACTIVITIES: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];
const FORBIDDEN = [
  'magic', 'destiny', 'fortune', 'stars align', 'manifest',
  'vibes', 'alignment', 'blessed', 'the universe', 'luck',
];

describe('severity-hints dictionary', () => {
  it('12 confirmed entries exist: 3 conditions × 4 activities (no pending marker)', () => {
    const confirmed: SeverityCondition[] = [
      'mercury_retrograde',
      'venus_retrograde',
      'moon_voc',
    ];
    confirmed.forEach((cond) => {
      ACTIVITIES.forEach((act) => {
        const entry = SEVERITY_HINTS[cond][act];
        expect(localize(entry.text, 'en')).toMatch(/^For (a |)/);
        expect(entry.pending_astrologer_ruling).toBe(false);
      });
    });
  });

  it('4 pending entries exist for intraday moon VOC × 4 activities', () => {
    ACTIVITIES.forEach((act) => {
      const entry = SEVERITY_HINTS.moon_voc_intraday[act];
      expect(localize(entry.text, 'en')).toMatch(/^For (a |)/);
      expect(entry.pending_astrologer_ruling).toBe(true);
    });
  });

  it('every entry is ≤ 150 chars', () => {
    Object.values(SEVERITY_HINTS).forEach((perActivity) => {
      Object.values(perActivity).forEach((entry) => {
        expect(localize(entry.text, 'en').length).toBeLessThanOrEqual(150);
      });
    });
  });

  it('no entry uses any forbidden voice word', () => {
    Object.values(SEVERITY_HINTS).forEach((perActivity) => {
      Object.values(perActivity).forEach((entry) => {
        FORBIDDEN.forEach((word) => {
          expect(localize(entry.text, 'en').toLowerCase()).not.toContain(word);
        });
      });
    });
  });

  it('getSeverityHint returns text for confirmed entry', () => {
    expect(getSeverityHint('venus_retrograde', 'travel', 'en')).toMatch(/journey|trip|vacation/i);
  });

  it('getSeverityHint returns undefined for pending entry by default', () => {
    expect(getSeverityHint('moon_voc_intraday', 'wedding', 'en')).toBeUndefined();
  });

  it('getSeverityHint with includePending=true returns pending entry text', () => {
    expect(getSeverityHint('moon_voc_intraday', 'wedding', 'en', { includePending: true }))
      .toMatch(/wedding/);
  });
});
