/**
 * The single source of colour, spacing, radius and typography for the app
 * (spec 007). Imported like `src/i18n/strings.ts`. No screen or component
 * outside `src/theme/` and `src/components/` should carry a raw hex colour,
 * a bare `fontSize`, or a hard-coded pixel spacing value — everything comes
 * from here. Light theme only in v1; the shape leaves room for a dark theme.
 *
 * Palette resolved on the design canvas — see specs/007-design-system.md.
 */

const palette = {
  bg: '#FBFAF8',
  surface: '#FFFFFF',
  surfaceSunken: '#F1EFEC',
  border: '#E4E0DA', // decorative card edge / divider (not an interactive indicator)
  borderStrong: '#8C887F', // input outlines — ≥ 3:1 on `bg` (WCAG 1.4.11)
  hairline: '#EFECE6',

  textPrimary: '#2A2926',
  textSecondary: '#6C6960',
  textFaint: '#767268',

  accent: '#46617E',
  accentSoft: '#ECF1F5',
  accentPressed: '#33485F',
  accentText: '#FFFFFF',

  danger: '#9E4430',
  dangerBg: '#F6EAE6',
  success: '#3F6B52',
  successBg: '#E8EFEA',
  warning: '#785A24',
  warningBg: '#F6EFE2',

  // Reserved for the custody calendar (spec 004 owns the semantics).
  parentA: '#46617E',
  parentB: '#A9764F',

  // Pressed-state overlay for surfaces / list rows.
  pressedOverlay: 'rgba(0,0,0,0.05)',
  transparent: 'transparent',
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

const fontFamily = undefined; // platform system font (SF Pro / Roboto)

const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '600' as const, fontFamily },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const, fontFamily },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, fontFamily },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, fontFamily },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' as const, fontFamily },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, fontFamily },
} as const;

/** Minimum interactive target (spec 007 criterion 4). */
const minTouch = 44;

export const theme = {
  colors: palette,
  spacing,
  radius,
  type,
  minTouch,
} as const;

export type ThemeColor = keyof typeof palette;
export type TypeVariant = keyof typeof type;
