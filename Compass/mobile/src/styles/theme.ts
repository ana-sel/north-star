/**
 * Design System & Theme
 * Consistent colors, typography, and spacing across the app
 */

export const colors = {
  // Palette
  bg: '#F6F5F2',
  card: '#FFFEFC',
  greige: '#F0ECE5',
  line: '#E2DFD9',
  muted: '#65645F',
  ink: '#24231F',
  steel: '#7E8E9F',
  olive: '#768471',
  mauve: '#898095',
  btn: '#3C3A34',

  // Semantic
  primary: '#768471',
  secondary: '#7E8E9F',
  accent: '#898095',
  success: '#768471',
  warning: '#B89150',
  error: '#B0746C',
  info: '#7E8E9F',

  // States
  disabled: '#C4BFBA',
  active: '#24231F',
  inactive: '#65645F',

  // Text
  text: '#24231F',
  textMuted: '#65645F',
  textLight: '#A19F9A',

  // Backgrounds
  bgLight: '#FBFAF8',
  bgDark: '#EFEDE8',
} as const;

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 25,
    hero: 38,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  fontFamily: {
    body: 'Inter',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 13,
  md: 18,
  lg: 26,
  card: 24,
  input: 18,
  full: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.07,
    shadowRadius: 34,
    elevation: 5,
  },
} as const;

export const theme = {
  colors,
  typography: {
    hero: typography.sizes.hero,
    xl: typography.sizes.xl,
    lg: typography.sizes.lg,
    md: typography.sizes.md,
    sm: typography.sizes.sm,
    xs: typography.sizes.xs,
  },
  spacing,
  radii,
  shadows,
} as const;

export type Theme = typeof colors;
