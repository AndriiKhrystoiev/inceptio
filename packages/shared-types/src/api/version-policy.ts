import { z } from 'zod';

/** Per-platform policy. Versions are plain marketing strings ("1.2.3"); semver
 *  parsing/validation happens in the decision fn (fail-open on unparseable),
 *  NOT here — the schema only guarantees shape. storeUrl is constrained to a URL
 *  so an operator typo fails Worker validation (→503→client fail-opens) rather
 *  than rendering a dead Update button. */
export const PlatformPolicySchema = z.object({
  minVersion: z.string(),
  latestVersion: z.string(),
  storeUrl: z.string().url(),
});
export type PlatformPolicy = z.infer<typeof PlatformPolicySchema>;

/** Both platforms optional → a missing platform key is a valid doc and the
 *  decision fn returns 'none'/'missing_platform' (fail-open). */
export const VersionPolicySchema = z.object({
  forceEnabled: z.boolean(),
  ios: PlatformPolicySchema.optional(),
  android: PlatformPolicySchema.optional(),
});
export type VersionPolicy = z.infer<typeof VersionPolicySchema>;
