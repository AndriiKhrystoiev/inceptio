import { z } from 'zod';

// Canonical list of reason IDs we know how to translate. The schema below is
// intentionally permissive (z.string()) so the response never fails to parse
// when upstream adds a new ID — translation falls back to a generic phrase
// and logs the unknown reason. Add new IDs here once their friendly phrase
// has been authored in packages/translations/src/dictionary/.
//
// Added by upstream mid-2026 (in arrival order): `mercury_combust`,
// `jupiter_retrograde`, `mars_retrograde`. See decision log in CLAUDE.md.
export const KNOWN_REASON_IDS = [
  'moon_voc',
  'mercury_retrograde',
  'mercury_combust',
  'venus_retrograde',
  'mars_retrograde',
  'jupiter_retrograde',
  'saturn_retrograde',
  'eclipse_window',
  'moon_via_combusta',
  'malefic_on_angle',
  'fixed_star_on_angle',
] as const;
export type ReasonId = (typeof KNOWN_REASON_IDS)[number];

// Permissive on purpose — see KNOWN_REASON_IDS comment. `min(1)` rejects
// the degenerate empty-string case while still accepting any new upstream value.
export const ReasonIdSchema = z.string().min(1);

export const SeveritySchema = z.enum(['hard_stop', 'medium']);
export type Severity = z.infer<typeof SeveritySchema>;

// .passthrough() — accept upstream additions without breaking.
// Note: API uses `from`/`to`, not `start`/`end`. Timestamps may or may not
// carry a Z suffix; treat as plain strings, not strict datetime.
export const ExcludedRangeSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    reason_id: ReasonIdSchema,
    severity: SeveritySchema,
    // The upstream pre-formats `label` in English; the translation layer
    // softens it via reason_id, not by reading `label`.
    label: z.string(),
    applies_to_activity: z.boolean(),
  })
  .passthrough();
export type ExcludedRange = z.infer<typeof ExcludedRangeSchema>;
