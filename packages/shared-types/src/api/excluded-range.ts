import { z } from 'zod';

// The 8 reason IDs verified against real astrology-api.io v3 responses.
// Source: CLAUDE.md → "Verified excluded range reason IDs".
export const ReasonIdSchema = z.enum([
  'moon_voc',
  'mercury_retrograde',
  'venus_retrograde',
  'saturn_retrograde',
  'eclipse_window',
  'moon_via_combusta',
  'malefic_on_angle',
  'fixed_star_on_angle',
]);
export type ReasonId = z.infer<typeof ReasonIdSchema>;

export const ExcludedRangeSchema = z
  .object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    reason_id: ReasonIdSchema,
    // The upstream pre-formats `label` in English ("Moon void of course — the
    // matter comes to nothing."). The translation layer (Phase 3) softens it.
    label: z.string(),
  })
  .strict();
export type ExcludedRange = z.infer<typeof ExcludedRangeSchema>;
