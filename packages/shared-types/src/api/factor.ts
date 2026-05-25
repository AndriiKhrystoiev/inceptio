import { z } from 'zod';

// The 15 factor IDs verified against real astrology-api.io v3 responses
// across the four MVP activities (wedding, contracts, business_launch, travel).
// Source: CLAUDE.md → "Verified factor IDs".
export const FactorIdSchema = z.enum([
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
]);
export type FactorId = z.infer<typeof FactorIdSchema>;

// Per CLAUDE.md, weight_class varies per activity (high vs critical observed for
// moon_applying_to_benefic between wedding/contracts). Until we see lower tiers
// in the wild, schema accepts the full plausible scale.
export const WeightClassSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type WeightClass = z.infer<typeof WeightClassSchema>;

// status drives the translation layer's polarity-aware phrasing
// (see CLAUDE.md → translation-layer factor entries: polarity_aware).
export const FactorStatusSchema = z.enum(['pass', 'partial', 'fail']);
export type FactorStatus = z.infer<typeof FactorStatusSchema>;

export const FactorSchema = z
  .object({
    factor_id: FactorIdSchema,
    weight_class: WeightClassSchema,
    status: FactorStatusSchema,
    observation: z.string(),
  })
  .strict();
export type Factor = z.infer<typeof FactorSchema>;
