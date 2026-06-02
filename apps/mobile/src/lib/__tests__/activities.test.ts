import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_LABELS,
  ACTIVITY_NOUNS,
  ACTIVITY_EMOJI,
  ACTIVITY_DISPLAY,
  ACTIVITY_EYEBROW_PHRASES,
  getActivityLabel,
  getActivityNoun,
  getActivityEyebrowPhrase,
} from '../activities';
import type { Activity } from '@inceptio/shared-types';

const ALL: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];

describe('activities', () => {
  it('ACTIVITY_LABELS covers all 4 MVP activities', () => {
    ALL.forEach((a) => expect(ACTIVITY_LABELS[a]).toBeDefined());
    expect(Object.keys(ACTIVITY_LABELS).sort()).toEqual(ALL.slice().sort());
  });

  it('ACTIVITY_NOUNS covers all 4 MVP activities', () => {
    ALL.forEach((a) => expect(ACTIVITY_NOUNS[a]).toBeDefined());
  });

  it('ACTIVITY_EMOJI covers all 4 MVP activities', () => {
    ALL.forEach((a) => expect(ACTIVITY_EMOJI[a]).toMatch(/.+/));
  });

  it('ACTIVITY_DISPLAY tint + ring tokens use bg- and border- prefixes', () => {
    ALL.forEach((a) => {
      expect(ACTIVITY_DISPLAY[a].tint).toMatch(/^bg-/);
      expect(ACTIVITY_DISPLAY[a].ring).toMatch(/^border-/);
    });
  });

  it('ACTIVITY_EYEBROW_PHRASES covers all 4 MVP activities with "for your …" pattern', () => {
    ALL.forEach((a) => {
      expect(ACTIVITY_EYEBROW_PHRASES[a]).toMatch(/^for your /i);
    });
  });

  it('getActivityLabel + getActivityNoun + getActivityEyebrowPhrase return mapped values', () => {
    expect(getActivityLabel('wedding')).toBe(ACTIVITY_LABELS.wedding);
    expect(getActivityNoun('travel')).toBe(ACTIVITY_NOUNS.travel);
    expect(getActivityEyebrowPhrase('wedding')).toBe(ACTIVITY_EYEBROW_PHRASES.wedding);
  });
});
