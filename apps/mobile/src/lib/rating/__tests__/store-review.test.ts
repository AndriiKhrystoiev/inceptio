import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const recordAttempt = vi.fn();
vi.mock('../rating-store', () => ({ recordAttempt: (d: Date) => recordAttempt(d) }));

import { attemptNativeReview, openStoreListing, openFeedback, debugForceRequestReview } from '../store-review';

beforeEach(() => vi.clearAllMocks());

describe('attemptNativeReview', () => {
  it('records an attempt and requests review when available', async () => {
    await attemptNativeReview(new Date('2026-06-24T00:00:00Z'));
    expect(recordAttempt).toHaveBeenCalledOnce();
    expect(StoreReview.requestReview).toHaveBeenCalledOnce();
  });
  it('no-ops (burns no attempt) when the store is unavailable', async () => {
    vi.mocked(StoreReview.isAvailableAsync).mockResolvedValueOnce(false);
    await attemptNativeReview();
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });
});

describe('openStoreListing', () => {
  it('opens the first openable candidate with the write-review param (iOS)', async () => {
    await openStoreListing();
    expect(Linking.openURL).toHaveBeenCalledOnce();
    const url = vi.mocked(Linking.openURL).mock.calls[0][0];
    expect(url).toContain('action=write-review');
  });
});

describe('openFeedback', () => {
  it('opens the mail composer when mailto is supported', async () => {
    const onCopied = vi.fn();
    await openFeedback({ onCopied });
    expect(Linking.openURL).toHaveBeenCalledOnce();
    expect(onCopied).not.toHaveBeenCalled();
  });
  it('falls back to clipboard when mailto is unsupported', async () => {
    vi.mocked(Linking.canOpenURL).mockResolvedValueOnce(false);
    const onCopied = vi.fn();
    await openFeedback({ onCopied });
    expect(Clipboard.setStringAsync).toHaveBeenCalledOnce();
    expect(onCopied).toHaveBeenCalledOnce();
  });
});

describe('debugForceRequestReview', () => {
  it('no-ops when __DEV__ is false (setup default)', async () => {
    await debugForceRequestReview();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });
  it('requests review when __DEV__ is true', async () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
    await debugForceRequestReview();
    expect(StoreReview.requestReview).toHaveBeenCalledOnce();
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false; // restore
  });
});
