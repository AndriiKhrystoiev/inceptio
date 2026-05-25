# Inceptio — Design System v2 "Mystical Premium"

> Brief for Claude Design.
> Replaces v1 (Cosmic Brutalism) after stakeholder feedback. Consumer-mobile direction inspired by CHANI / Sanctuary / The Pattern.

---

## 1. System Brief (paste into Claude Design at design-system setup)

```
PROJECT
Inceptio — a mobile app (iOS + Android) for choosing astrologically 
favorable moments to start important things: weddings, business 
launches, signing contracts, travel. The app evaluates moments and 
surfaces the best windows in a date range with friendly, 
human-readable guidance.

DESIGN DIRECTION
"Mystical Premium" — the aesthetic of a quiet hotel suite at night 
with floor-to-ceiling windows facing the cosmos. Deep indigo skies, 
warm golden light, soft glow. Premium calmness, not technical 
precision. The aesthetic peers are CHANI Nicholas, Sanctuary, The 
Pattern, and Stellar — not Linear, not Vercel, not Co-Star.

NOT this:
- Developer tool aesthetic (terminal UI, monospaced everything, 
  technical density)
- Cold Vercel/Linear violet (too SaaS-sterile)
- Co-Star's stark cream + black engravings (too editorial-dry for 
  this audience)
- New Age clichés (rainbow chakras, fairy dust, exaggerated sparkles)
- Cheap mobile game vibes (saturated gradients, emoji clutter, 
  cartoon stars)

YES this:
- Deep night-sky background with subtle warm-purple gradients
- Golden and soft pink accents that glow like distant stars
- Generous breathing space — one big idea per screen
- Large headlines in elegant serif, body in friendly humanist sans
- Astrological language ("Venus is generous on Saturday") translated 
  to emotional meaning ("a particularly tender day for new 
  beginnings")
- Progressive disclosure — friendly first, depth on demand
- Soft glow effects, never harsh lines

PALETTE (dark mode, warm-mystical)

Background:
  bg-base       #0F0A1F   deep midnight indigo, slight warm cast
  bg-gradient   #1A1433   for hero blocks, top of screens
  surface       #1F1838   cards, elevated surfaces
  surface-2     #2A2247   nested elements, modals

Borders & dividers:
  border-soft   #3A3258   subtle 1px dividers
  border-glow   #5B4F8A   highlighted card borders

Text:
  text          #F5EFE4   warm cream-white (not pure white)
  text-muted    #B8B0CC   secondary, helper text
  text-subtle   #7A7195   captions, metadata

Accent palette (mystical premium):
  primary       #8B6FE8   warm mystical violet (NOT cold Tailwind 
                          violet)
  primary-glow  #A98DFF   highlight states, hover glow
  primary-deep  #5B4F8A   pressed states, backgrounds
  
  gold          #E5C77D   moonlight gold, premium accent
  gold-glow     #F0D89A   shimmer highlights
  
  rose          #F9B5C8   for love/relationships themes (Wedding)
  peach         #F4C19A   for success/business themes
  mint          #67E8C7   for "favorable" indicators
  
Semantic:
  good          #67E8C7   favorable moments, positive signals
  caution       #E5C77D   uses gold — gentle warning, not alarm
  difficult     #D88E8E   muted rose, never aggressive red
  
Heatmap gradient (calendar cells, warm sunset palette):
  poor (0-25)       #2A2247   dark purple, surface-2 tone
  ok (26-60)        #5B4F8A   muted violet
  good (61-85)      #8B6FE8   primary mystical violet
  excellent (86-100) #E5C77D  warm moonlight gold
  excluded          #2A2247   with soft diagonal shimmer pattern

TYPOGRAPHY

Display & headlines:
  Fraunces (variable serif, weights 400-700)
  - Use for screen titles, large statements, big numbers
  - Slightly soft, modern serif with personality
  - Fallback: Georgia, Times New Roman

UI & body:
  Inter (variable sans, weights 400-600)
  - Use for buttons, labels, body text, small UI
  - Friendly humanist sans
  - Fallback: SF Pro, Segoe UI

NO monospaced fonts on consumer-facing screens. Reserve mono only 
for "Pro mode" technical detail view (deepest disclosure level).

Sizing scale (mobile, base 16px):
  Hero      48 / 56 line-height   Fraunces 500, tracking -0.02em
  Title     32 / 38               Fraunces 400, tracking -0.01em
  Headline  22 / 28               Fraunces 400
  Body      16 / 24               Inter 400
  Label     14 / 20               Inter 500
  Caption   12 / 16               Inter 400, color text-muted

ICONOGRAPHY

Minimal emoji policy:
- Activity cards may use emoji (💍 wedding, 📋 contract, 🚀 launch, 
  ✈️ travel) — soft and recognizable
- Score chips may use a single subtle sparkle (✨) for excellent 
  scores only — and only at small sizes
- Do NOT use emoji in dense lists, action buttons, or as 
  decorative filler

Custom illustrated icons (priority for hero placements):
- Moon phases (new, waxing crescent, first quarter, full, etc.) 
  rendered as subtle line art with soft glow
- Small celestial illustrations for "favorable" tag, "caution" tag
- Use Lucide icons (1.5px stroke) for utility (back arrows, 
  close, chevrons, share)

Score visualization:
- Large serif number, soft glow if 86+
- No dots, no percentage bars
- Optional single ✨ next to scores 90+

LAYOUT PRINCIPLES

- Mobile-first viewport: 390px wide (iPhone 15 base)
- Very generous vertical rhythm — empty space is a feature
- Cards: rounded 16px (softer than v1), padding 20px, subtle gradient 
  border (1px primary-deep → border-soft)
- Buttons: rounded 14px, height 56px for primary, 48px for secondary
- Primary CTA: gradient fill (primary → primary-glow) or solid 
  primary, with subtle glow shadow
- Screen padding: 24px horizontal
- One primary action per screen, full-width at bottom
- Bottom tab bar: 72px tall, icons + labels, gentle highlight for 
  active

TONE OF VOICE

Warm, dignified, poetic-but-specific. Friendly storyteller, not 
fortune teller. Not provocative (we're not Co-Star). Not woo-woo 
("the universe whispers"). Not technical ("Venus trine Jupiter 
weight +18").

YES:
- "A particularly tender day for new beginnings."
- "Some moments hold more weight than others."
- "The sky is generous on Saturday afternoon."
- "Venus brings warmth to this window. Jupiter adds growth."
- "Mercury is sleeping — best to wait until it wakes."

NO:
- "Your stars align in cosmic harmony" (cliché)
- "Auspicious moment detected" (cold)
- "scanning 26,304 moments" (terminal)
- "94/100" as the headline (too data)
- "Venus △ Jupiter +18" (technical)

Emotional translations of common astrological events:
- Venus trine Jupiter → "love and luck flow together"
- Moon in domicile → "the day feels grounded and clear"
- Mercury direct → "communication runs smoothly"
- Mercury retrograde → "Mercury is sleeping — be patient"
- Mars square Saturn → "a small headwind, manageable"

PROGRESSIVE DISCLOSURE (three levels)

Level 1 — Friendly (default view, what 90% of users see)
- "Highly favorable" headline + warm sentence
- Single short recommendation
- "Why this moment?" tap-to-reveal CTA

Level 2 — Astrological summary (tap "Why this moment?")
- 3-5 plain-language sentences describing what's happening
- "Venus brings warmth. The Moon is grounded. Mercury runs clear."
- Optional "See technical details" link at bottom

Level 3 — Technical (tap "See technical details")
- The Cosmic Brutalism breakdown lives here
- Factor names with weights (Venus △ Jupiter +18)
- For astrologers and curious users
- Uses monospaced font in this view ONLY

THEMATIC ELEMENTS (soft, never decorative)

- Subtle starfield background on hero blocks (5-8 small dots, 
  varying opacity 20-60%, never animated, never overwhelming)
- Soft radial gradient at top of screens, going from bg-gradient 
  center down to bg-base
- Moon phase illustrations as ambient detail, not literal data
- Card glow: cards with high scores get a soft 4-8px primary-glow 
  shadow, very subtle
- Score number ≥90 gets a soft golden halo (text-shadow ~6px 
  rgba gold-glow 30%)

DELIVERABLE
Generate as self-contained React components (HTML/CSS/JS for 
prototyping). Tailwind utility classes where possible. Mobile 
viewport (390px). Will port to React Native + NativeWind later.
```

---

## 2. Tone of Voice — Detailed Examples

These are the source-of-truth strings for the app. Use them verbatim in screen briefs.

### Onboarding (single screen)

```
Hero:     Find the right time to begin.
Sub:      Inceptio looks at the sky to help you choose your moment.
CTA:      Get started
Footer:   No account needed.
```

### Activity selection (Search step 1)

```
Title:    What do you want to begin?
Cards (with soft emoji):
  💍  Wedding or engagement
  📋  Contract or agreement
  🚀  Business or launch
  ✈️  Travel or move

Sub on each card: short one-liner
  Wedding:  "Lasting commitments"
  Contract: "Important signatures"
  Business: "New ventures and openings"
  Travel:   "Journeys and relocations"
```

### Date range (Search step 2)

```
Title:    When is your window?
From / To fields
Helper:   Inceptio looks for the best days in your range.
Quick picks: 1 month, 3 months, 6 months, 1 year
```

### Location (Search step 3)

```
Title:    Where will this happen?
Field placeholder: City, country
Helper:   The location where the event takes place — not where you 
          are now.
```

### Loading state

```
Hero:     Looking at the sky for you...
Sub:      Reading 12,000 moments in your range.
```

(Friendly replacement for "scanning 26,304 moments")

### Results overview

```
Title:    Your best moments
Sub (small): 5 windows found · Kyiv · June – August
```

### Result card (level 1, friendly)

```
Score (large, with optional ✨ if ≥90)
"Highly favorable" / "Favorable" / "Moderate" / "Wait" / "Difficult"
Date: "Saturday, June 21"
Time: "Afternoon, 2:32 — 4:08"
One-line: "Venus brings warmth to this window."
CTA: "Why this moment? →"
```

Score → label mapping:
- 90–100: Highly favorable (golden glow)
- 75–89: Favorable
- 60–74: Moderate
- 40–59: Wait
- 0–39: Difficult

### Moment detail (level 2, astrological summary)

```
Hero:
  Highly favorable  ✨
  Saturday, June 21 · 2:32 — 4:08
  Kyiv

Why this moment
  Venus brings warmth to this window. Love and growth move together.
  
  The Moon is in Cancer, grounded and steady — a good foundation 
  for lasting promises.
  
  Mercury runs clear, so communication will flow easily.
  
  There's one small thing to know: Mars and Saturn cross paths late 
  in the day. A bit of friction is possible, manageable.

[Add to calendar] [Save] [Share]

See technical details →   (this opens Level 3, Cosmic Brutalism style)
```

### Moment detail (level 3, technical — for the curious)

(This is the old Cosmic Brutalism Moment Detail, kept verbatim, only 
for users who tap "See technical details". Uses Geist Mono in this 
view only.)

### Caution callout (excluded range)

```
Mercury is sleeping
July 18 → August 11
We've kept these dates out of your results. During this time, 
contracts and signings often need extra patience.
```

(Replaces "Mercury retrograde — excluded from results")

### History → "My intentions"

```
Tab label: Intentions
Title:     Your saved moments
Sub:       3 moments ahead of you
```

### Paywall

```
Hero:       Inceptio Pro
Sub:        Unlimited moments, calendar export, and more.
Free count: "You've explored 3 moments — let's go further."

Features:
  Unlimited searches
  Save unlimited moments
  Calendar view of your whole range
  Export to your phone's calendar
  Quiet, ad-free

Plans:
  $29.99 / year  · "Just $2.50 a month"  · Save 50%
  $4.99 / month

CTA: Continue
Footer link: Restore
Legal: Terms · Privacy
```

### Empty states

```
Home (first launch):
  Title:  "Welcome."
  Sub:    "Tell us what you'd like to begin."
  CTA:    "Start a search"

Library (no saved):
  Title:  "Nothing saved yet."
  Sub:    "Save moments you'd like to keep."
```

### Push notification copy (for v1.3)

```
"Saturday at 2:32 PM is approaching — your wedding window."
"A favorable time for that contract is coming in 3 days."
```

---

## 3. Generation Workflow

Same order as v1 — most aesthetic-defining screens first, simple last.

1. **Moment Detail (level 2 friendly)** — sets the tone for the whole system. Critical to get right first.
2. **Results overview** — validates card system
3. **Calendar heatmap** — the differentiator, with warm palette
4. **Welcome / Onboarding** — sets first impression
5. **Activity selection (Search 1/3)** — most-used flow entry
6. **Date range (Search 2/3)** and Location (3/3) — same visual language
7. **My intentions** (was History) — list view
8. **Paywall** — restrained, premium-warm
9. **Loading state** — short skeleton screen
10. **Moment Detail (level 3 technical)** — reuses v1 Cosmic Brutalism, accessible from level 2

---

## 4. Adjustment Phrases for Iteration

When a generated screen feels off, use these phrases in the Claude Design chat:

- "Soften the violet — too saturated. Aim for warm-mystical, not cold-SaaS."
- "Add more breathing room. One idea per screen, generous space."
- "The score number should glow softly, not flat. Add subtle gold halo if score ≥ 90."
- "Tone too clinical. Make it warmer — friendly storyteller, not technical reader."
- "Reduce the data density. This isn't a dashboard, it's a guidance."
- "Add a soft starfield in the hero — 5–8 subtle dots, varying opacity, not animated."
- "Card border looks harsh. Use a soft gradient border or remove and add glow shadow."
- "Headline should be serif. Body sans. Numbers serif too unless deep technical view."
- "Replace any monospaced font with Fraunces or Inter, depending on hierarchy."

---

## 5. Critical Differences from v1 (for reference)

If asked to compare or explain to stakeholders:

| Aspect | v1 (Cosmic Brutalism) | v2 (Mystical Premium) |
|---|---|---|
| Aesthetic peer | Linear, Vercel, Granola | CHANI, Sanctuary, The Pattern |
| Background | Near-black `#07080C` | Deep indigo `#0F0A1F` with warm gradient |
| Accent | Cold lavender `#9D7CFF` | Warm mystical violet `#8B6FE8` + gold `#E5C77D` |
| Typography | Geist + Geist Mono | Fraunces + Inter (no mono on consumer screens) |
| Score | "94" big mono number | "Highly favorable" headline + 94 ✨ in context |
| Astrology | "Venus △ Jupiter +18" everywhere | "Venus brings warmth" friendly, technical on demand |
| Tone | "scanning 26,304 moments" | "Looking at the sky for you..." |
| Disclosure | Single dense view | 3 levels: Friendly → Astrological → Technical |
| Iconography | `△ □ ☌ ☍` astrological symbols | Minimal emoji + custom celestial illustrations |
| Audience fit | Astrologers, developers | Everyone planning something important |

v1 lives on as the optional "Pro mode" / "Technical view" — accessible only by tapping "See technical details" in Moment Detail, Level 3.

---

*v2 brief · For Claude Design generation of Inceptio MVP screens · "Mystical Premium" consumer direction*
