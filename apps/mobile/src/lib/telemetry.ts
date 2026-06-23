/**
 * Fire-and-forget telemetry seam. No analytics SDK is installed yet (spec §6a),
 * so this currently only dev-logs. A future task wires a real sink here without
 * touching call sites. NEVER let a telemetry call affect control flow.
 */
export function emit(event: string, props: Record<string, string | number> = {}): void {
  try {
    if (__DEV__) console.log(`[telemetry] ${event}`, props);
  } catch {
    /* swallow — telemetry must never throw into the caller */
  }
}
