import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map<string, string>();
vi.mock('../../storage', () => ({
  storage: {
    getString: (k: string) => memory.get(k),
    set: (k: string, v: string) => { memory.set(k, v); },
    delete: (k: string) => { memory.delete(k); },
  },
}));

// Mock the native wrapper — prompt-triggers must call it exactly when eligible.
// vi.hoisted is required so the fn reference is available when vi.mock hoists
// the factory above the const declaration.
const { attemptNativeReview } = vi.hoisted(() => ({
  attemptNativeReview: vi.fn(() => Promise.resolve()),
}));
vi.mock('../store-review', () => ({ attemptNativeReview }));

import { maybePromptAfterSave, maybePromptAfterView } from '../prompt-triggers';
import {
  recordActiveDay, recordSuccessfulSearch, __resetRatingDedupeForTests,
} from '../rating-store';

const NOW = new Date('2026-06-09T12:00:00.000Z');

function seedHealthy() {
  // 2 distinct days + 2 searches clears the floor.
  recordActiveDay(new Date(2026, 5, 8));
  recordActiveDay(new Date(2026, 5, 9));
  recordSuccessfulSearch();
  recordSuccessfulSearch();
}

beforeEach(() => { memory.clear(); __resetRatingDedupeForTests(); attemptNativeReview.mockClear(); });

describe('prompt-triggers', () => {
  it('eligible save → attempts the native review once', async () => {
    seedHealthy();
    await maybePromptAfterSave({ grade: 'exceptional', isFirstEverSave: false, now: NOW });
    expect(attemptNativeReview).toHaveBeenCalledTimes(1);
  });

  it('below floor → does not attempt', async () => {
    await maybePromptAfterSave({ grade: 'exceptional', isFirstEverSave: false, now: NOW });
    expect(attemptNativeReview).not.toHaveBeenCalled();
  });

  it('view dedupe: same searchKey attempts at most once (EC10)', async () => {
    seedHealthy();
    await maybePromptAfterView({ grade: 'good', noViable: false, searchKey: 'k1', now: NOW });
    await maybePromptAfterView({ grade: 'good', noViable: false, searchKey: 'k1', now: NOW });
    expect(attemptNativeReview).toHaveBeenCalledTimes(1);
  });

  it('no_viable view → suppressed (never attempts)', async () => {
    seedHealthy();
    await maybePromptAfterView({ grade: 'good', noViable: true, searchKey: 'k2', now: NOW });
    expect(attemptNativeReview).not.toHaveBeenCalled();
  });
});
