// Inceptio — design tokens (React Native port)
// Mirrors colors_and_type.css 1:1, plus convenience text styles.

export const colors = {
  // Backgrounds
  bgBase:        '#0F0A1F',
  bgGradient:    '#1A1433',
  surface:       '#1F1838',
  surface2:      '#2A2247',

  // Borders
  borderSoft:    '#3A3258',
  borderGlow:    '#5B4F8A',

  // Text
  text:          '#F5EFE4',
  textMuted:     '#B8B0CC',
  textSubtle:    '#7A7195',

  // Accents
  primary:       '#8B6FE8',
  primaryGlow:   '#A98DFF',
  primaryDeep:   '#5B4F8A',

  gold:          '#E5C77D',
  goldGlow:      '#F0D89A',
  goldMuted:     '#D4B872',

  rose:          '#F9B5C8',
  peach:         '#F4C19A',
  mint:          '#67E8C7',

  // Semantic
  good:          '#67E8C7',
  caution:       '#E5C77D',
  difficult:     '#D88E8E',

  // Heatmap
  heatPoor:      '#2A2247',
  heatOk:        '#5B4F8A',
  heatGood:      '#8B6FE8',
  heatExcellent: '#E5C77D',

  // Activity tint/ring tokens — verbatim from scaffold/activity-display.js.
  // Parallel to tailwind.config.js 'wedding-tint' etc.; used by ActivityPlate
  // consumers that reference theme.js directly rather than NativeWind classes.
  weddingTint:         'rgba(249,181,200,0.16)',
  weddingRing:         'rgba(249,181,200,0.30)',
  contractsTint:       'rgba(244,193,154,0.16)',
  contractsRing:       'rgba(244,193,154,0.30)',
  businessLaunchTint:  'rgba(229,199,125,0.16)',
  businessLaunchRing:  'rgba(229,199,125,0.30)',
  travelTint:          'rgba(103,232,199,0.16)',
  travelRing:          'rgba(103,232,199,0.30)',
};

// Font families — names match those loaded in App.js via @expo-google-fonts.
export const fonts = {
  display:      'Fraunces_500Medium',
  displayReg:   'Fraunces_400Regular',
  displaySemi:  'Fraunces_600SemiBold',
  ui:           'Inter_400Regular',
  uiMed:        'Inter_500Medium',
  uiSemi:       'Inter_600SemiBold',
  mono:         'JetBrainsMono_400Regular',
};

export const radii = { xs: 6, sm: 10, md: 14, lg: 16, xl: 24, pill: 999 };

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 };

// Convenience text-style fragments. Spread into Text style props.
export const text = {
  hero:     { fontFamily: fonts.display,    fontSize: 48, lineHeight: 56, letterSpacing: -1.0, color: colors.text },
  title:    { fontFamily: fonts.displayReg, fontSize: 32, lineHeight: 38, letterSpacing: -0.3, color: colors.text },
  headline: { fontFamily: fonts.displayReg, fontSize: 22, lineHeight: 28, color: colors.text },
  body:     { fontFamily: fonts.ui,         fontSize: 16, lineHeight: 24, color: colors.text },
  bodyMuted:{ fontFamily: fonts.ui,         fontSize: 14, lineHeight: 20, color: colors.textMuted },
  label:    { fontFamily: fonts.uiMed,      fontSize: 14, lineHeight: 20, color: colors.text },
  caption:  { fontFamily: fonts.ui,         fontSize: 12, lineHeight: 16, color: colors.textMuted },
  eyebrow:  { fontFamily: fonts.uiSemi,     fontSize: 11, lineHeight: 14, letterSpacing: 0.9, color: colors.textSubtle, textTransform: 'uppercase' },
};

// Shadow that approximates the CSS --glow-primary on iOS.
// Android can't render colored shadows; falls back to elevation.
export const glow = {
  primary: {
    shadowColor: '#A98DFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  gold: {
    shadowColor: '#F0D89A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
};
