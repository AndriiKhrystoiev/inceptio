import { z } from 'zod';

// Canonical list of factor IDs we know how to translate. The schema below is
// intentionally permissive (z.string()) so the response never fails to parse
// when upstream adds a new factor — translation falls back to a generic
// phrasing and logs the unknown id. Add new IDs here once their friendly
// phrasing is authored in workers/api-proxy/src/translations/dictionary/.
//
// Source: CLAUDE.md → "Verified factor IDs" (15 IDs across the four MVP
// activities: wedding, contracts, business_launch, travel).
export const KNOWN_FACTOR_IDS = [
  'venus_dignified_direct_well_aspected',
  'moon_waxing_increasing_light',
  'moon_applying_to_benefic',
  'house_ruler_dignified_well_placed',
  'asc_and_house_ruler_in_reception_or_aspect',
  'jupiter_angular_or_aspecting',
  'planetary_hour_match',
  'fixed_star_conjunction',
  'house_free_of_malefic',
  'mercury_dignified_direct_not_combust',
  'asc_ruler_strong',
  'jupiter_aspecting_mercury_or_moon',
  'no_malefic_on_angle',
  'part_of_fortune_in_good_house',
  'moon_and_asc_ruler_in_good_aspect',
] as const;
export type FactorId = (typeof KNOWN_FACTOR_IDS)[number];

// Permissive on purpose — see KNOWN_FACTOR_IDS comment.
export const FactorIdSchema = z.string().min(1);

export const WeightClassSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type WeightClass = z.infer<typeof WeightClassSchema>;

export const FactorStatusSchema = z.enum(['pass', 'partial', 'fail']);
export type FactorStatus = z.infer<typeof FactorStatusSchema>;

// `details` shape varies per factor_id and is NULL when the upstream couldn't
// produce a structured payload (e.g. `moon_applying_to_benefic` returns null
// when no aspect was found in the window). Kept as unknown nullable in v1.
// When the L2 narrative needs finer detail, we'll switch to a discriminated
// union keyed by factor_id.
export const FactorDetailsSchema = z.unknown().nullable();
export type FactorDetails = z.infer<typeof FactorDetailsSchema>;

// .passthrough() — the upstream is allowed to add fields without breaking us.
// We intentionally do NOT use .strict() here; doing so caused the first real
// call to fail because the API returned newer fields we hadn't anticipated.
export const FactorSchema = z
  .object({
    factor_id: FactorIdSchema,
    category: z.string(), // e.g. "electional"
    observation: z.string(),
    // Numeric score component this factor contributed to the window total.
    // Real observed values: 15.58, 14.94, 12.31, etc. Used by the translation
    // layer as the secondary sort for headline selection (after weight_class).
    contribution: z.number(),
    weight_class: WeightClassSchema,
    status: FactorStatusSchema,
    score: z.number(),
    rationale_short: z.string(),
    details: FactorDetailsSchema,
  })
  .passthrough();
export type Factor = z.infer<typeof FactorSchema>;
