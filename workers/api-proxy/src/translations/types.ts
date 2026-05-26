import type {
  Activity,
  FactorId,
  FactorStatus,
  ReasonId,
} from '@inceptio/shared-types';

/** The two text fragments produced per factor instance. */
export interface FactorPhrasing {
  /** Under 8 words. Used on cards and in factor-list rows. */
  phrase_short: string;
  /** 1–2 sentences. Used in narrative paragraphs on the moment-detail screen. */
  phrase_full: string;
}

/**
 * Base entry per factor_id. `partial` and `fail` fall back to `pass`
 * when omitted, so editors only have to write the rarer polarities
 * when the meaning genuinely diverges.
 */
export interface FactorEntry {
  polarity_aware: {
    pass: FactorPhrasing;
    partial?: FactorPhrasing;
    fail?: FactorPhrasing;
  };
}

/** Per-activity tone overrides. Each field deep-merges over the base entry. */
export type ActivityOverrides = Partial<
  Record<
    FactorId,
    {
      polarity_aware?: {
        pass?: Partial<FactorPhrasing>;
        partial?: Partial<FactorPhrasing>;
        fail?: Partial<FactorPhrasing>;
      };
    }
  >
>;

/** Softens the API's English label into Inceptio's voice. */
export interface ReasonEntry {
  phrase: string;
}

/**
 * Each translated factor row carries enough to render at L2 directly
 * (phrase_short on a row, phrase_full in a paragraph). The mobile app
 * filters by status — pass+partial on L2, all (including fail) on L3.
 *
 * factor_id is `string`, not the `FactorId` union, because the schema is
 * permissive (z.string()): upstream may emit an id outside KNOWN_FACTOR_IDS
 * and the translator forwards it verbatim with a fallback phrasing.
 */
export interface DisplayableFactor {
  factor_id: string;
  status: FactorStatus;
  phrase_short: string;
  phrase_full: string;
}

export interface DisplayableWindow {
  headline: string;
  factors: DisplayableFactor[];
}

// reason_id is `string` for the same reason factor_id is — see DisplayableFactor.
export interface DisplayableExcludedRange {
  reason_id: string;
  phrase: string;
}

/** The Worker-level headline that L1 surfaces (Today + No-Viable screens). */
export interface DisplayableSummary {
  headline: string;
}

/**
 * Compose with the existing per-activity tables so a missing entry falls back
 * cleanly. Used by the headline synthesizer.
 */
export type HeadlineOverrides = Partial<
  Record<Activity, Partial<Record<FactorId, Partial<Record<FactorStatus, string>>>>>
>;
