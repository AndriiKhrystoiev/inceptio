// Inceptio — Tailwind tokens mirror src/theme.js 1:1.
// Naming rule: theme.bgX → tailwind `x` (so `bg-base` resolves to theme.bgBase).
// theme.borderX → `x` (so `border-soft` resolves to theme.borderSoft).
// theme.textX → `x` (so `text-muted` resolves to theme.textMuted).
// theme.text (#F5EFE4 cream body) is exposed as `text-cream` to avoid `text-text`.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base:           '#0F0A1F', // theme.bgBase
        gradient:       '#1A1433', // theme.bgGradient
        surface:        '#1F1838', // theme.surface
        'surface-2':    '#2A2247', // theme.surface2

        soft:           '#3A3258', // theme.borderSoft
        glow:           '#5B4F8A', // theme.borderGlow

        cream:          '#F5EFE4', // theme.text
        muted:          '#B8B0CC', // theme.textMuted
        subtle:         '#7A7195', // theme.textSubtle

        primary:        '#8B6FE8', // theme.primary
        'primary-glow': '#A98DFF', // theme.primaryGlow
        'primary-deep': '#5B4F8A', // theme.primaryDeep

        gold:           '#E5C77D', // theme.gold
        'gold-glow':    '#F0D89A', // theme.goldGlow
        'gold-muted':   '#D4B872', // theme.goldMuted

        rose:           '#F9B5C8', // theme.rose
        peach:          '#F4C19A', // theme.peach
        mint:           '#67E8C7', // theme.mint

        good:           '#67E8C7', // theme.good
        caution:        '#E5C77D', // theme.caution
        difficult:      '#D88E8E', // theme.difficult

        'heat-poor':      '#2A2247', // theme.heatPoor
        'heat-ok':        '#5B4F8A', // theme.heatOk
        'heat-good':      '#8B6FE8', // theme.heatGood
        'heat-excellent': '#E5C77D', // theme.heatExcellent

        // Activity tint/ring tokens — verbatim from scaffold/activity-display.js.
        // Used by ACTIVITY_DISPLAY in src/lib/activities.ts as bg-*/border-* classes.
        'wedding-tint':         'rgba(249,181,200,0.16)',
        'wedding-ring':         'rgba(249,181,200,0.30)',
        'contracts-tint':       'rgba(244,193,154,0.16)',
        'contracts-ring':       'rgba(244,193,154,0.30)',
        'business-launch-tint': 'rgba(229,199,125,0.16)',
        'business-launch-ring': 'rgba(229,199,125,0.30)',
        'travel-tint':          'rgba(103,232,199,0.16)',
        'travel-ring':          'rgba(103,232,199,0.30)',
      },

      fontFamily: {
        display:        ['Fraunces_500Medium'],   // theme.fonts.display
        'display-reg':  ['Fraunces_400Regular'],  // theme.fonts.displayReg
        'display-semi': ['Fraunces_600SemiBold'], // theme.fonts.displaySemi
        ui:             ['Inter_400Regular'],     // theme.fonts.ui
        'ui-med':       ['Inter_500Medium'],      // theme.fonts.uiMed
        'ui-semi':      ['Inter_600SemiBold'],    // theme.fonts.uiSemi
        mono:           ['JetBrainsMono_400Regular'], // theme.fonts.mono
      },

      borderRadius: {
        xs:   '6px',   // theme.radii.xs
        sm:   '10px',  // theme.radii.sm
        md:   '14px',  // theme.radii.md
        lg:   '16px',  // theme.radii.lg
        xl:   '24px',  // theme.radii.xl
        pill: '9999px', // theme.radii.pill
      },
    },
  },
  plugins: [],
};
