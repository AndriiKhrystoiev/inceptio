import { z } from 'zod';

// The four MVP activities (CLAUDE.md). API supports 12; the other 8 are deferred.
export const ActivitySchema = z.enum([
  'wedding',
  'contracts',
  'business_launch',
  'travel',
]);
export type Activity = z.infer<typeof ActivitySchema>;

// Flat request shape sent directly to astrology-api.io. For ergonomics — the
// reshaping into the nested upstream contract (date_range + location with
// year/month/day/hour/minute) now happens in apps/mobile/src/lib/upstream-body.ts.
export const ElectionalSearchRequestSchema = z
  .object({
    activity: ActivitySchema,
    // ISO-8601 calendar dates (YYYY-MM-DD) or full datetimes; the worker
    // parses the date components for the upstream call.
    start: z.string().min(10),
    end: z.string().min(10),
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
    // IANA timezone identifier, e.g. "Europe/Kyiv". Derived client-side from
    // lat/lng via tz-lookup (offline lookup, no network roundtrip).
    timezone: z.string().min(1),
    // Display label shown to the user; not used for chart math.
    city: z.string().min(1),
  })
  .strict();
export type ElectionalSearchRequest = z.infer<
  typeof ElectionalSearchRequestSchema
>;
