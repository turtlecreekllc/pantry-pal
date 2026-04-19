/**
 * Dinner Plans AI — Brand Theme
 * Based on the comprehensive brand style guide
 */

/**
 * Primary brand colors
 */
export const colors = {
  // Honey Gold — Primary brand color (the pot/mascot body)
  primary: '#F5B84C',
  primaryLight: '#FFD074',
  primaryDark: '#E5A23C',

  // Warm Cream — Background, cards, surfaces
  cream: '#FFF8F0',
  creamDark: '#F5E6D8',
  creamLight: '#FFFCF8',

  // Peach Blush — Secondary backgrounds, highlights
  peach: '#F5D6B8',
  peachLight: '#FBE8D8',

  // Coral Red — Checkmarks, success states, CTAs
  coral: '#E57373',
  coralLight: '#FFAB91',

  // Chef White — Cards, clean surfaces, chef hat
  white: '#FFFFFF',
  offWhite: '#FEFEFE',

  // Cocoa Brown — Text, outlines, borders
  brown: '#3D2314',
  brownLight: '#5D4037',
  brownMuted: '#8D6E63',

  // Semantic Colors
  success: '#81C784',
  successBg: '#E8F5E9',
  warning: '#FFB74D',
  warningBg: '#FFF3E0',
  error: '#E57373',
  errorBg: '#FFEBEE',
  info: '#64B5F6',
  infoBg: '#E3F2FD',

  // Generic aliases (for compatibility with common naming conventions)
  background: '#FFF8F0',  // cream
  surface: '#FFFFFF',     // white
  text: '#3D2314',        // brown
  textSecondary: '#5D4037', // brownLight
  textTertiary: '#8D6E63',  // brownMuted
  border: '#E0D5CC',      // light border color
} as const;

/**
 * Typography configuration
 * Note: Fonts need to be loaded via expo-font
 */
export const typography = {
  // Font families (requires loading Nunito and Quicksand)
  fontPrimary: 'Nunito',
  fontDisplay: 'Quicksand',
  fontMono: 'JetBrainsMono',

  // Font sizes (original flat structure)
  textXs: 12,
  textSm: 14,
  textBase: 16,
  textLg: 18,
  textXl: 20,
  text2xl: 24,
  text3xl: 30,
  text4xl: 36,

  // Font sizes (nested structure for compatibility)
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights
  leadingTight: 1.25,
  leadingNormal: 1.5,
  leadingRelaxed: 1.75,

  // Font weights (original flat structure)
  fontNormal: '400' as const,
  fontMedium: '500' as const,
  fontSemibold: '600' as const,
  fontBold: '700' as const,

  // Font weights (nested structure for compatibility)
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

/**
 * Spacing scale (in pixels)
 */
export const spacing = {
  // Numbered spacing (original)
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,
  space16: 64,
  // Semantic aliases (for compatibility)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

/**
 * Border radius values
 * Rounded, friendly corners inspired by the mascot's soft shapes
 */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * Container widths
 */
export const containers = {
  sm: 640,
  md: 768,
  lg: 1024,
  maxContentWidth: 428, // Mobile-optimized
} as const;

/**
 * Shadow presets
 * Soft, warm shadows with cocoa brown tint
 */
export const shadows = {
  // Subtle lift — Cards at rest
  sm: {
    shadowColor: '#3D2314',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  // Medium lift — Hovered cards, buttons
  md: {
    shadowColor: '#3D2314',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  // High lift — Modals, floating elements
  lg: {
    shadowColor: '#3D2314',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 8,
  },
} as const;

/**
 * Animation timing
 */
export const animation = {
  durationFast: 150,
  durationNormal: 250,
  durationSlow: 400,
} as const;

/**
 * Icon sizes
 * Icons should use 2px stroke, rounded/friendly style
 */
export const iconSizes = {
  compact: 20,
  standard: 24,
  featured: 32,
  large: 48,
  xlarge: 64,
} as const;

/**
 * Common style presets for components
 */
export const presets = {
  // Card base style
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brown,
    borderRadius: borderRadius.lg,
    padding: spacing.space4,
    ...shadows.sm,
  },

  // Primary button style
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.brown,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space6,
    ...shadows.sm,
  },

  // Secondary button style
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brown,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space6,
  },

  // CTA button style (coral)
  buttonCta: {
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.brown,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space8,
  },

  // Input field style
  input: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
  },

  // Tag style
  tag: {
    backgroundColor: colors.peach,
    borderWidth: 1.5,
    borderColor: colors.brown,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space2,
  },

  // Chip style
  chip: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brown,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
  },
} as const;

/**
 * Typography presets
 */
export const textStyles = {
  // Headlines — Quicksand, bold, cocoa brown
  headline1: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.text3xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    lineHeight: typography.text3xl * typography.leadingTight,
  },
  headline2: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    lineHeight: typography.text2xl * typography.leadingTight,
  },
  headline3: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    lineHeight: typography.textXl * typography.leadingTight,
  },

  // Body — Nunito, normal weight
  body: {
    fontFamily: typography.fontPrimary,
    fontSize: typography.textBase,
    fontWeight: typography.fontNormal,
    color: colors.brown,
    lineHeight: typography.textBase * typography.leadingNormal,
  },
  bodySmall: {
    fontFamily: typography.fontPrimary,
    fontSize: typography.textSm,
    fontWeight: typography.fontNormal,
    color: colors.brown,
    lineHeight: typography.textSm * typography.leadingNormal,
  },

  // Labels — Nunito, medium, slightly smaller
  label: {
    fontFamily: typography.fontPrimary,
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
    letterSpacing: 0.15,
  },

  // Caption — Extra small
  caption: {
    fontFamily: typography.fontPrimary,
    fontSize: typography.textXs,
    fontWeight: typography.fontNormal,
    color: colors.brownMuted,
  },

  // Button text
  buttonText: {
    fontFamily: typography.fontPrimary,
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
} as const;

/**
 * Default export with all theme values
 */
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  containers,
  shadows,
  animation,
  iconSizes,
  presets,
  textStyles,
} as const;

export default theme;

