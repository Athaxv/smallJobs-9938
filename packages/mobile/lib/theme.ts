export const Colors = {
  // Backgrounds
  background: '#FFFFFF',
  surfaceSoft: '#F5F5F5',
  surfaceMuted: '#EFEFEF',

  // Borders
  border: '#E8E8E8',
  borderStrong: '#D0D0D0',

  // Brand — black/dark
  primary: '#111111',
  active: '#000000',

  // Text
  textPrimary: '#111111',
  textSecondary: '#6B6B6B',
  textPlaceholder: '#ADADAD',
  textDisabled: '#CFCFCF',
  textOnDark: '#FFFFFF',

  // Semantic
  success: '#22C55E',
  successSurface: '#F0FDF4',
  warning: '#F59E0B',
  warningSurface: '#FFFBEB',
  error: '#EF4444',
  errorSurface: '#FFF5F5',
  info: '#3B82F6',
  infoSurface: '#EFF6FF',

  // Overlays / util
  black04: 'rgba(0, 0, 0, 0.04)',
  black08: 'rgba(0, 0, 0, 0.08)',
  black12: 'rgba(0, 0, 0, 0.12)',
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 9999,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  screenH: 20,
};

export const FontSize = {
  displayXL: 32,
  displayL: 26,
  heading: 22,
  subheading: 18,
  bodyL: 16,
  body: 14,
  bodyS: 13,
  caption: 12,
  label: 11,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Font family helpers — use these everywhere
export const Font = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
};

export const Shadows = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
};
