/**
 * DripCast theme palettes.
 *
 * `cyberColors` is the signature neon-dark theme (default).
 * `cleanColors` is the light minimal theme.
 *
 * Both expose identical token names, so components never branch on theme:
 * NativeWind classes swap at runtime via CSS variables
 * (apps/mobile/global.css), and inline styles use `usePalette()`.
 */
export const cyberColors = {
  /** App background — near-black with a blue shift. */
  void: "#05060F",
  /** Card / panel surface. */
  panel: "#0B0E1D",
  /** Raised surface (modals, pressed states). */
  panelRaised: "#131830",
  /** Hairline borders on dark surfaces. */
  line: "#232A4D",
  /** Primary text. */
  text: "#F4F6FF",
  /** Secondary text. */
  muted: "#9AA3C7",
  /** Faint text / placeholders. */
  faint: "#5B648C",

  /** Signature neon accents. */
  neonPink: "#FF2D78",
  neonCyan: "#22D3EE",
  neonPurple: "#8B5CF6",
  acid: "#C6FF4A",

  /** Weather-bucket accents. */
  hot: "#FF6B4A",
  warm: "#FFC24B",
  cold: "#4AA8FF",

  /** Semantic. */
  danger: "#FF5470",
  success: "#3DDC97",
} as const;

/** Back-compat alias for the default (cyberpunk dark) palette. */
export const colors = cyberColors;

export const cleanColors = {
  /** App background — warm near-white. */
  void: "#FAFAF7",
  /** Card / panel surface. */
  panel: "#FFFFFF",
  /** Raised surface (modals, pressed states). */
  panelRaised: "#F0EFE9",
  /** Hairline borders on light surfaces. */
  line: "#E2DFD6",
  /** Primary text. */
  text: "#17171D",
  /** Secondary text. */
  muted: "#5D6372",
  /** Faint text / placeholders. */
  faint: "#9AA0AE",

  /** Brand accents, toned down for light surfaces (no glow). */
  neonPink: "#D6336C",
  neonCyan: "#0B7A94",
  neonPurple: "#7048E8",
  acid: "#5C940D",

  /** Weather-bucket accents, deepened for contrast on white. */
  hot: "#E8590C",
  warm: "#D9A012",
  cold: "#1971C2",

  /** Semantic. */
  danger: "#E03131",
  success: "#2F9E44",
} as const;

export const themes = {
  cyber: cyberColors,
  clean: cleanColors,
} as const;

export type ThemeName = keyof typeof themes;

export type ColorName = keyof typeof cyberColors;

/** Accent color per weather bucket, used for badges, the hero glow, etc. */
export const bucketColors = {
  hot: cyberColors.hot,
  warm: cyberColors.warm,
  cold: cyberColors.cold,
} as const;
