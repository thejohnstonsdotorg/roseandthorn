export const theme = {
  colors: {
    primary: '#d97706',      // amber-600
    primaryLight: '#fef3c7', // amber-100
    primaryDark: '#92400e',  // amber-800
    rose: '#e11d48',         // rose-600
    roseLight: '#ffe4e6',    // rose-100
    emerald: '#059669',      // emerald-600
    emeraldLight: '#d1fae5', // emerald-100
    background: '#fffbeb',   // amber-50
    surface: '#ffffff',
    text: '#451a03',         // amber-950 equivalent
    textMuted: '#92400e',    // amber-800
    border: '#fde68a',       // amber-200
  },
  fonts: {
    heading: 'System',
    body: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 24,
    full: 9999,
  },
} as const;

export type Theme = typeof theme;
