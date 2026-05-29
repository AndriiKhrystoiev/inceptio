import type { DailyNoteEntry, KnownDailyNoteId } from '../types';

/**
 * The 21 daily-note library entries — see spec §3.3 for authoritative content.
 * Order matches the spec. Each entry is transcribed verbatim including any
 * post-hardening / post-audit revisions.
 *
 * IMPORTANT: entries 16 + 17 carry `pending_astrologer_ruling: true` per
 * spec §11.4 BLOCKING items. Task 17 of the implementation plan applies the
 * final ruling — until then they ship with their current draft phrasings.
 */
export const DAILY_NOTES: Record<KnownDailyNoteId, DailyNoteEntry> = {
  // ─── Strong (75+) ───

  'strong-sky-is-clear': {
    id: 'strong-sky-is-clear',
    quality_bucket: 'strong',
    headline: 'A wide-open day — the sky is clear.',
    supporting_line:
      "Good for big asks, launches, and decisions you've been holding. Few days like this in a season.",
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — >= 6 factors PASS, no factor FAIL, no excluded ranges',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'strong-venus-jupiter-pair': {
    id: 'strong-venus-jupiter-pair',
    quality_bucket: 'strong',
    headline: 'A rare, full-handed day.',
    supporting_line:
      'Venus and Jupiter both in good standing — good for promises, partnerships, and starting things meant to last.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS + jupiter_angular_or_aspecting PASS, both at weight_class >= high',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'strong-ruler-in-motion': {
    id: 'strong-ruler-in-motion',
    quality_bucket: 'strong',
    headline: 'A bright day for setting things in motion.',
    supporting_line:
      "The kind of stretch worth using on something you've been waiting for. Good for nearly anything you've been putting off.",
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — asc_ruler_strong PASS + house_ruler_dignified_well_placed PASS + jupiter_angular_or_aspecting PASS',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Good (60..74) ───

  'good-venus-warm': {
    id: 'good-venus-warm',
    quality_bucket: 'good',
    headline: 'A tender day for beginnings.',
    supporting_line:
      'Venus is warm and dignified — good for soft conversations, small promises, and first steps. Hold the heaviest signings for clearer days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-mercury-clear': {
    id: 'good-mercury-clear',
    quality_bucket: 'good',
    headline: 'A clear day for plain words.',
    supporting_line:
      'Mercury runs clear — good for signing, sending, and saying what you mean. A workable stretch for paperwork.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — mercury_dignified_direct_not_combust PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-steady': {
    id: 'good-moon-steady',
    quality_bucket: 'good',
    headline: 'A steady day for what already exists.',
    supporting_line:
      'The Moon holds its shape — good for tending ongoing work, follow-ups, and keeping promises already made.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_waxing_increasing_light PARTIAL or moon_and_asc_ruler_in_good_aspect PASS; no strong "beginnings" factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-jupiter-room-to-grow': {
    id: 'good-jupiter-room-to-grow',
    quality_bucket: 'good',
    headline: 'A day with room to grow.',
    supporting_line:
      'Jupiter is in view — good for asking for more than you usually would. Workable for launches, applications, and openings.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — jupiter_angular_or_aspecting PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-toward-benefic': {
    id: 'good-moon-toward-benefic',
    quality_bucket: 'good',
    headline: 'A day for going further.',
    supporting_line:
      'The Moon moves toward a kind meeting — good for reaching out and conversations meant to land well.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_applying_to_benefic PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'good-moon-asc-accord': {
    id: 'good-moon-asc-accord',
    quality_bucket: 'good',
    headline: 'A day of quiet accord.',
    supporting_line:
      'The Moon and the planet that stands for you are in good aspect — good for mutual decisions, joint paperwork, and meeting halfway.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — moon_and_asc_ruler_in_good_aspect PASS as the highest-weight factor',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Mixed / Caution (40..59) ───

  'mixed-mercury-clear-jupiter-absent': {
    id: 'mixed-mercury-clear-jupiter-absent',
    quality_bucket: 'mixed',
    headline: 'A day for plain words, not big asks.',
    supporting_line:
      'Mercury runs clear, but Jupiter is absent — good for short messages and follow-ups; hold the big proposals for clearer days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — mercury_dignified_direct_not_combust PASS + jupiter_angular_or_aspecting FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-venus-gentle-saturn-near': {
    id: 'mixed-venus-gentle-saturn-near',
    quality_bucket: 'mixed',
    headline: 'Workable, with patience.',
    supporting_line:
      "Venus is gentle but Saturn is nearby — good for finishing what's started; hold off on starting anything new today.",
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PARTIAL + house_free_of_malefic PARTIAL or FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-moon-void-until-noon': {
    id: 'mixed-moon-void-until-noon',
    quality_bucket: 'mixed',
    headline: 'A quieter morning, clearer after noon.',
    supporting_line:
      'The Moon is between aspects until midday — time important calls for the afternoon.',
    horizon_class: 'intraday',
    dominant_factors_hint:
      'PROVISIONAL — intraday moon-void or moon-via-combusta ending before today\'s evening; the picker MUST verify intraday timing exists for today specifically',
    surface: 'daily-note',
    needs_vague_fallback: true,
  },

  'mixed-moon-steady-sky-thin': {
    id: 'mixed-moon-steady-sky-thin',
    quality_bucket: 'mixed',
    headline: 'A day for tending, not building.',
    supporting_line:
      'The Moon is steady but the sky is thin — good for follow-ups, edits, and small corrections. Save the launches for stronger days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — moon_waxing_increasing_light PASS but most other dominant factors FAIL or PARTIAL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'mixed-venus-bright-mercury-dim': {
    id: 'mixed-venus-bright-mercury-dim',
    quality_bucket: 'mixed',
    headline: 'A mixed day — choose carefully.',
    supporting_line:
      'Venus is bright but Mercury is dim — good for soft conversations; hold the signed paperwork.',
    horizon_class: 'static',
    dominant_factors_hint:
      'PROVISIONAL — venus_dignified_direct_well_aspected PASS + mercury_dignified_direct_not_combust FAIL',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // ─── Closed-by-exclusion ───

  'closed-moon-voc': {
    id: 'closed-moon-voc',
    quality_bucket: 'closed',
    headline: 'The Moon is between signs today.',
    supporting_line:
      "A stretch where new starts don't take root — good for finishing, sorting, and waiting. Better days are nearby.",
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'moon_voc' covering today's daylight hours",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-mercury-retrograde': {
    id: 'closed-mercury-retrograde',
    quality_bucket: 'closed',
    headline: 'Mercury is sleeping.',
    supporting_line:
      'Words need extra care until Thursday — good for re-reading and editing; hold the heavy signing for clearer days.',
    horizon_class: 'concrete-date',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'mercury_retrograde' AND Mercury direct-station date is <= 3 days away",
    surface: 'daily-note',
    needs_vague_fallback: true,
    pending_astrologer_ruling: true,
  },

  'closed-venus-retrograde': {
    id: 'closed-venus-retrograde',
    quality_bucket: 'closed',
    headline: 'Venus is resting.',
    supporting_line:
      'A long quiet stretch for matters of the heart — good for tending what already exists; new commitments can wait.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'venus_retrograde' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
    pending_astrologer_ruling: true,
  },

  'closed-eclipse-window': {
    id: 'closed-eclipse-window',
    quality_bucket: 'closed',
    headline: 'An eclipse week — the sky asks for stillness.',
    supporting_line:
      'Hold off on starts and big decisions while the eclipse passes. Better days are within reach.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'eclipse_window' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-malefic-on-angle': {
    id: 'closed-malefic-on-angle',
    quality_bucket: 'closed',
    headline: 'A difficult planet sits on the angles today.',
    supporting_line:
      'A charged stretch — better used for closing things than starting them. Tomorrow opens cleaner.',
    horizon_class: 'concrete-date',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'malefic_on_angle' covering today AND the malefic moves off the angle by tomorrow",
    surface: 'daily-note',
    needs_vague_fallback: true,
  },

  'closed-long-quiet-stretch': {
    id: 'closed-long-quiet-stretch',
    quality_bucket: 'closed',
    headline: 'A long quiet stretch in the sky.',
    supporting_line:
      'Not a day for new starts — good for sorting, naming, and getting your list straight before clearer days arrive.',
    horizon_class: 'vague',
    dominant_factors_hint:
      'PROVISIONAL — extended period of multiple overlapping excluded ranges or persistently low scores; the default closed-by-exclusion fallback when no single named reason dominates',
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  'closed-moon-via-combusta': {
    id: 'closed-moon-via-combusta',
    quality_bucket: 'closed',
    headline: 'A more difficult Moon today.',
    supporting_line:
      'The Moon walks the via combusta — good for closing things, sorting, and waiting. Better days are nearby.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — excluded_range with reason_id === 'moon_via_combusta' covering today",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },
};
