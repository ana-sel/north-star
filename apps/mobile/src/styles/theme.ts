/**
 * Compass V1 design tokens.
 * Source of truth: docs/design/wireframes/shared/tokens.css + you.css.
 * Feature screens still read the legacy fields — do not remove them.
 */

const surfaces = {
  canvas: '#F6F5F2',
  canvasLight: '#FBFAF8',
  canvasDark: '#EFEDE8',
  surface: '#FFFEFC',
  surfaceMuted: '#F0ECE5',
  border: '#E2DFD9',
} as const;

const inks = {
  ink: '#24231F',
  inkMuted: '#65645F',
  inkFaint: '#A19F9A',
  onDark: '#FBFAF8',
} as const;

const brand = {
  btn: '#3C3A34',
  olive: '#768471',
  steel: '#7E8E9F',
  mauve: '#898095',
  accent: '#5F6B5A',
  accentSoft: '#EEF1EC',
  gold: '#A8843F',
  goldSoft: '#F4EEE0',
} as const;

const pillar = {
  health: '#77936F',
  inner: '#937CAF',
  admin: '#958572',
  family: '#B77980',
  joy: '#C99554',
  money: '#7395AD',
  contrib: '#8D8F63',
} as const;

const path = {
  Inward: '#9B8FD6',
  Together: '#CF8F94',
  Craft: '#D3AA62',
  Frontier: '#7FA8B8',
} as const;

const status = {
  success: '#768471',
  warning: '#B89150',
  error: '#B0746C',
  info: '#7E8E9F',
  disabled: '#C4BFBA',
} as const;

export const colors = {
  ...surfaces,
  ...inks,
  ...brand,
  ...status,
  pillar,
  path,
  bg: surfaces.canvas,
  card: surfaces.surface,
  greige: surfaces.surfaceMuted,
  line: surfaces.border,
  muted: inks.inkMuted,
  bgLight: surfaces.canvasLight,
  bgDark: surfaces.canvasDark,
  text: inks.ink,
  textMuted: inks.inkMuted,
  textLight: inks.inkFaint,
  primary: brand.olive,
  secondary: brand.steel,
  active: inks.ink,
  inactive: inks.inkMuted,
} as const;

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 17,
    xl: 26,
    hero: 34,
  },
  lineHeights: {
    tight: 1.25,
    body: 1.5,
    relaxed: 1.6,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  letterSpacing: {
    tight: -0.4,
    normal: 0,
    label: 0.9,
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
  huge: 40,
} as const;

export const radii = {
  control: 12,
  card: 18,
  feature: 20,
  sheet: 22,
  pill: 999,
  sm: 12,
  md: 18,
  lg: 22,
  input: 12,
  full: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#24231F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#24231F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: '#24231F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
} as const;

export const motion = {
  duration: { fast: 120, base: 180, slow: 240 },
  easing: 'ease-out',
} as const;

export const layout = {
  minTouch: 44,
  screenPadding: spacing.lg,
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
  type: typography,
  spacing,
  radii,
  shadows,
  motion,
  layout,
} as const;

export type Theme = typeof colors;
