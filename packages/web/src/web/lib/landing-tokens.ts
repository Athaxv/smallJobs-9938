/** Design tokens mirrored from packages/mobile/lib/theme.ts (web-only copy). */
export const landingColors = {
  primary: "#111111",
  active: "#000000",
  background: "#FFFFFF",
  surfaceSoft: "#F5F5F5",
  surfaceMuted: "#EFEFEF",
  border: "#E8E8E8",
  textPrimary: "#111111",
  textSecondary: "#6B6B6B",
  textPlaceholder: "#ADADAD",
  textOnDark: "#FFFFFF",
} as const;

export const landingRadius = {
  md: 12,
  lg: 16,
  xl: 24,
  sheet: 28,
  pill: 9999,
} as const;

export const landingShadow = {
  card: "0 4px 24px rgba(0, 0, 0, 0.07)",
  sheet: "0 -4px 32px rgba(0, 0, 0, 0.08)",
  sm: "0 2px 8px rgba(0, 0, 0, 0.06)",
} as const;
