// Activity-asymmetric severity hints for daily-note composition.
//
// Phrasings are LOCKED — sourced verbatim from the activity-preference
// plan (2026-06-02). Each string carries a mandatory "For a {activity}, "
// framing prefix; per voice spec §12.4 the per-entry text budget is
// ≤ 150 chars (vs ≤ 140 for supporting_lines, which lack the prefix).
// Do not paraphrase or trim without astrologer review (§11.4).
//
// 12 entries marked `pending_astrologer_ruling: false` are confirmed.
// The 4 `moon_voc_intraday` entries are provisional drafts pending the
// astrologer pass; the `getSeverityHint` helper hides them by default.
import type { Activity } from '@inceptio/shared-types';

export type SeverityCondition =
  | 'mercury_retrograde'
  | 'venus_retrograde'
  | 'moon_voc'
  | 'moon_voc_intraday';

type Entry = {
  text: string;
  pending_astrologer_ruling: boolean;
};

export const SEVERITY_HINTS: Record<SeverityCondition, Record<Activity, Entry>> = {
  mercury_retrograde: {
    wedding: {
      text: "For a wedding, tradition is gentler here than for a contract — the vows themselves are less impacted than the legal documents that accompany them.",
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: "For a contract, this is the stretch tradition asks you to wait through — words and agreements made now tend to need rewriting.",
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: "For a launch, the announcements and the early outreach don't land the way they will in a few weeks. Better held.",
      pending_astrologer_ruling: false,
    },
    travel: {
      text: "For travel, the trip itself is fine — but build buffer for delays, and double-check the tickets and the times.",
      pending_astrologer_ruling: false,
    },
  },
  venus_retrograde: {
    wedding: {
      text: "For a wedding, this is the stretch tradition asks you to wait through — Venus governs marriage, and her support is withdrawn now.",
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: "For a contract, this matters most for partnerships and anything tied to money — renewing an old agreement holds; beginning a new one strains.",
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: "For a launch, this stretch sits across the things you want this venture to attract — revenue, customers, goodwill. Better to wait.",
      pending_astrologer_ruling: false,
    },
    travel: {
      text: "For travel, this matters less than it does for the other beginnings — a trip during this stretch is fine to take.",
      pending_astrologer_ruling: false,
    },
  },
  moon_voc: {
    wedding: {
      text: "For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days.",
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: "For a contract, today is the day to hold signing — the matter begun now tends to need revisiting or quietly fall away.",
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: "For a launch, the announcement made today tends to land softly or get reshuffled later — wait for the Moon to settle into the next sign.",
      pending_astrologer_ruling: false,
    },
    travel: {
      text: "For travel, the journey itself is fine — but if you're booking a ticket, wait until the Moon reaches the next sign.",
      pending_astrologer_ruling: false,
    },
  },
  // TODO(astrologer-review §11.4): the four moon_voc_intraday entries are
  // provisional drafts. Confirm or refine in the next astrologer pass,
  // then flip `pending_astrologer_ruling` to false here.
  moon_voc_intraday: {
    wedding: {
      text: "For a wedding, time the vows for the afternoon — the morning hours aren't held by the sky the way the afternoon will be.",
      pending_astrologer_ruling: true,
    },
    contracts: {
      text: "For a contract, hold the signing until after midday — the morning void doesn't carry agreements.",
      pending_astrologer_ruling: true,
    },
    business_launch: {
      text: "For a launch, time the announcement for the afternoon — the morning hours land softer than the rest of the day.",
      pending_astrologer_ruling: true,
    },
    travel: {
      text: "For travel, the morning is fine to be in motion — but hold any new bookings or reservations for the afternoon.",
      pending_astrologer_ruling: true,
    },
  },
};

type GetSeverityHintOptions = { includePending?: boolean };

export function getSeverityHint(
  condition: SeverityCondition,
  activity: Activity,
  options: GetSeverityHintOptions = {}
): string | undefined {
  const entry = SEVERITY_HINTS[condition]?.[activity];
  if (!entry) return undefined;
  if (entry.pending_astrologer_ruling && !options.includePending) return undefined;
  return entry.text;
}
