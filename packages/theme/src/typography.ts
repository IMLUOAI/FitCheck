/** Type scale (font sizes in dp). System font stack, heavy weights carry the brand. */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 44,
  hero: 64,
} as const;

export type FontSizeName = keyof typeof fontSize;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  black: "900",
} as const;

export type FontWeightName = keyof typeof fontWeight;
