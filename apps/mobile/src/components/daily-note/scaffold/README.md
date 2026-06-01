# scaffold/ — built but not wired (MVP scope cut)

These components implement the saved-search status row variants from
PICKER-CONTRACT.md §1 + §2 + §6.4. They are not imported by
DailyNoteSection or any active screen.

## Why deferred

The mobile app's "saved" concept is `SavedMoment` (a bookmarked specific
window — see `lib/draft-store.ts`), not `SavedSearch` (an actively-
monitored search with lifecycle states). The picker contract's
saved_searches array is for the latter. The Worker returns
`saved_searches: []` for MVP, mirroring this.

## Activation criteria

When a `SavedSearch` concept lands (new storage shape, new creation UX,
alert mechanics), the wire-in is:

- DailyNoteSection reads `response.saved_searches` from useDailyNote()
- For each item, select:
    state === 'in-window'                          → InWindowCard
    state === 'new-window' && !acknowledged        → NewWindowCard
    state === 'pre-window'                         → SavedRow
    state === 'none-yet'                           → SavedRow with
                                                     searched_through
                                                     rendered per the
                                                     PICKER-CONTRACT
                                                     precision rule
    state === 'passed'                             → SavedRow visually
                                                     muted (~70% opacity)
                                                     per voice spec
                                                     §6.3.4
- Sort by `priority` (ascending), cap at 3, overflow into
  StatusStack.moreCount.
- NewWindowCard.onAck calls `() => postAlertAck(alertId)`.

## Don't

- Don't try to populate these from SavedMoment data. See Finding A in
  docs/superpowers/specs/2026-05-29-mobile-integration-design.md.
  The semantics don't fit, and a half-working synthesis is worse than
  no rendering.
- Don't reuse src/components/StatusLine.js — different concept
  (score+grade pill).

## Before wire-in — locked requirements

1. **Production wire-in MUST swap emoji for lucide-react-native icons**
   (Heart, FileText, Rocket, Plane or equivalent crafted glyphs). The
   emoji values in activity-display.js (💍/📋/🚀/✈️) are scaffold
   placeholders.

   **Known tech debt — existing emoji surfaces in production:**
   - `src/screens/ActivityPickerScreen.js` ships 💍/📋/🚀/✈️ in the
     activity selector
   - `src/components/ActivityChip.js` is a reusable production emoji
     component

   These predate the documented icon-language goal (thin SVG / lucide).
   At SavedSearch wire-in time, ALL three surfaces (scaffold +
   ActivityPickerScreen + ActivityChip) migrate together to lucide —
   partial migration would create inconsistency. If wire-in lands
   before this cleanup, file a separate cleanup PR FIRST to align
   production with the scaffold's icon language; then wire in. Do not
   ship a half-migrated state.

2. **The four tint/ring rgba literals MUST promote to theme.js as
   semantic tokens before wire-in.** Hard-coded rgba in component code
   does not ship. Promote to colors.activityWeddingTint /
   activityWeddingRing / etc.

3. **Activity nouns MUST source from `ACTIVITY_NOUNS` in
   activity-display.js**, not from hand-rolled `shortName` fields at
   render call sites. The table enumerates against voice spec §6.3 and
   is the structural drift-prevention. A render that hand-codes
   "business" instead of "Launch" is the exact failure mode this table
   was designed to make impossible.
