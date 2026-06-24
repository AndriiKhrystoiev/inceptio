import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('../storage', () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => { mem.set(k, v); },
    delete: (k: string) => { mem.delete(k); },
  },
}));

import {
  getDraft, patchDraft, clearDraft, getLastActivity, setLastActivity,
  getSavedMoments, saveMoment, removeSavedMoment, type SavedMoment,
} from '../draft-store';

beforeEach(() => mem.clear());

describe('search draft', () => {
  it('returns {} when no draft persisted', () => {
    expect(getDraft()).toEqual({});
  });
  it('patchDraft merges and persists', () => {
    patchDraft({ activity: 'wedding' });
    const next = patchDraft({ city: 'Kyiv' });
    expect(next).toEqual({ activity: 'wedding', city: 'Kyiv' });
    expect(getDraft()).toEqual({ activity: 'wedding', city: 'Kyiv' });
  });
  it('clearDraft empties it', () => {
    patchDraft({ activity: 'travel' });
    clearDraft();
    expect(getDraft()).toEqual({});
  });
  it('returns {} when stored JSON is corrupt', () => {
    mem.set('inceptio.search_draft', '{not json');
    expect(getDraft()).toEqual({});
  });
});

describe('last activity', () => {
  it('round-trips', () => {
    expect(getLastActivity()).toBeNull();
    setLastActivity('contracts');
    expect(getLastActivity()).toBe('contracts');
  });
});

describe('saved moments', () => {
  const moment: SavedMoment = {
    id: 'm1', activity: 'wedding', city: 'Kyiv',
    start: '2026-07-01T12:00:00+03:00', end: '2026-07-01T12:15:00+03:00',
    duration_minutes: 15, score: 65, grade: 'fair', headline: 'A tender day.', saved_at: '2026-06-24T00:00:00Z',
  };
  it('saves, dedupes by id, removes', () => {
    saveMoment(moment);
    saveMoment(moment); // dedupe
    expect(getSavedMoments()).toHaveLength(1);
    removeSavedMoment('m1');
    expect(getSavedMoments()).toEqual([]);
  });
  it('prepends newest first', () => {
    saveMoment(moment);
    saveMoment({ ...moment, id: 'm2' });
    expect(getSavedMoments().map((m) => m.id)).toEqual(['m2', 'm1']);
  });
});
