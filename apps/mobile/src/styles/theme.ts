/**
 * Compass V1 design tokens.
 * Source of truth: docs/design/wireframes-health/shared/health.css (palette.html).
 */

const surfaces = {
  canvas: '#F5F3F0',
  canvasLight: '#FBFAF8',
  canvasDark: '#E9E7E5',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F3F1',
  border: '#E5E3E0',
} as const;

const inks = {
  ink: '#1C1C1E',
  inkMuted: '#6E6E73',
  inkFaint: '#AEAEB2',
  onDark: '#FFFFFF',
} as const;

const brand = {
  btn: '#2F3F4F',
  accent: '#2F3F4F',
} as const;

/** Each meaning has soft (tracks, chips), base (bars, tiles, rings) and deep (coloured text). */
export interface Tone { soft: string; base: string; deep: string }

export const palette = {
  sleep: { soft: '#E5EDFE', base: '#708BC6', deep: '#43598B' },
  habits: { soft: '#E2F2E4', base: '#609D6D', deep: '#346841' },
  foundation: { soft: '#F2ECE4', base: '#988979', deep: '#665849' },
  Inward: { soft: '#EEEAFC', base: '#9080C0', deep: '#5E5085' },
  Together: { soft: '#FDE6E7', base: '#BF7479', deep: '#84454B' },
  Craft: { soft: '#F7EBDB', base: '#AE8446', deep: '#76531B' },
  Frontier: { soft: '#DEF1F3', base: '#5299A1', deep: '#25656C' },
} as const satisfies Record<string, Tone>;

export const colors = {
  ...surfaces,
  ...inks,
  ...brand,
  error: '#C4453C',
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
  card: 14,
  sheet: 16,
  pill: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 0,
  },
  lg: {
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
