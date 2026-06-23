// Intl-only date math (no date library installed). ALWAYS pass an explicit
// timeZone. Ported from the former Worker lib/local-date.ts.
export function formatDateInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}
