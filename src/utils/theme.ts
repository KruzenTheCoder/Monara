/* ────────────────────────────────────────────────────────
 *  Monara Theme System — Light + Dark
 * ──────────────────────────────────────────────────────── */

export interface ThemeColors {
  backgroundStart: string;
  backgroundEnd: string;
  backgroundMid: string;
  primaryText: string;
  secondaryText: string;
  glassBackground: string;
  glassBorder: string;
  glassBorderTop: string;
  accent: string;
  accentSecondary: string;
  accentGlow: string;
  navy: string;
  navyLight: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  divider: string;
  overlayBg: string;
  status: {
    green: string; greenGlow: string;
    amber: string; amberGlow: string;
    red: string;   redGlow: string;
  };
  themes: Record<string, { primary: string; secondary: string; name: string }>;
  category: Record<string, string>;
}

const SHARED_THEMES: ThemeColors['themes'] = {
  default:     { primary: '#3E92CC', secondary: '#1B2A4A', name: 'Monara' },
  dark:        { primary: '#3E92CC', secondary: '#5BA8D9', name: 'Monara Dark' },
  emerald:     { primary: '#10B981', secondary: '#34D399', name: 'Emerald City' },
  ocean:       { primary: '#3B82F6', secondary: '#60A5FA', name: 'Ocean Deep' },
  sunset:      { primary: '#F59E0B', secondary: '#FBBF24', name: 'Golden Sunset' },
  rose:        { primary: '#F43F5E', secondary: '#FB7185', name: 'Midnight Rose' },
  monara:      { primary: '#203058', secondary: '#3E92CC', name: 'Monara Light' },
  earlyaccess: { primary: '#3E92CC', secondary: '#FF6B6B', name: 'Early Access' },
};

const SHARED_CATEGORIES: ThemeColors['category'] = {
  'Food & Dining': '#E8920D',
  'Transport': '#3E92CC',
  'Housing & Rent': '#2DA86B',
  'Shopping': '#D94080',
  'Entertainment': '#7C5CC4',
  'Health & Medical': '#D94040',
  'Utilities': '#2B9E8F',
  'Education': '#D97B3C',
  'Salary': '#2DA86B',
  'Freelance': '#3E92CC',
  'Investment': '#1B2A4A',
  'Gift': '#D94080',
  'Other': '#6B7B98',
};

/* ── Light palette ── */
const LIGHT_COLORS: ThemeColors = {
  backgroundStart: '#F8F9FC',
  backgroundEnd: '#EEF0F5',
  backgroundMid: '#F3F4F8',
  primaryText: '#0F1A2E',
  secondaryText: '#5E6E8A',
  glassBackground: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(27, 42, 74, 0.07)',
  glassBorderTop: 'rgba(255, 255, 255, 0.95)',
  accent: '#3E92CC',
  accentSecondary: '#2B7AB5',
  accentGlow: 'rgba(62, 146, 204, 0.25)',
  navy: '#0F1A2E',
  navyLight: '#1B2A4A',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F2F7',
  surfaceElevated: '#FFFFFF',
  divider: 'rgba(15, 26, 46, 0.06)',
  overlayBg: 'rgba(15, 26, 46, 0.35)',
  status: {
    green: '#22C55E', greenGlow: 'rgba(34, 197, 94, 0.15)',
    amber: '#F59E0B', amberGlow: 'rgba(245, 158, 11, 0.15)',
    red:   '#EF4444', redGlow:   'rgba(239, 68, 68, 0.15)',
  },
  themes: SHARED_THEMES,
  category: SHARED_CATEGORIES,
};

/* ── Dark palette ── */
const DARK_COLORS: ThemeColors = {
  backgroundStart: '#08080D',
  backgroundEnd: '#0D0D12',
  backgroundMid: '#0A0A10',
  primaryText: '#F2F3F7',
  secondaryText: '#7B879E',
  glassBackground: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderTop: 'rgba(255, 255, 255, 0.14)',
  accent: '#4A9ED6',
  accentSecondary: '#3E92CC',
  accentGlow: 'rgba(74, 158, 214, 0.3)',
  navy: '#1B2A4A',
  navyLight: '#203058',
  surface: '#131318',
  surfaceSecondary: '#1A1A22',
  surfaceElevated: '#1E1E28',
  divider: 'rgba(255, 255, 255, 0.07)',
  overlayBg: 'rgba(0, 0, 0, 0.65)',
  status: {
    green: '#34D399', greenGlow: 'rgba(52, 211, 153, 0.18)',
    amber: '#FBBF24', amberGlow: 'rgba(251, 191, 36, 0.18)',
    red:   '#F87171', redGlow:   'rgba(248, 113, 113, 0.18)',
  },
  themes: SHARED_THEMES,
  category: SHARED_CATEGORIES,
};

/* ── Spacing scale (4-pt grid) ── */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/* ── Shared gradient tuples for brand consistency ── */
export const gradients = {
  accent: ['#3E92CC', '#2B7AB5'] as const,
  accentVibrant: ['#4A9ED6', '#2B7AB5', '#1B6A9E'] as const,
  navy: ['#1B2A4A', '#0F1A2E'] as const,
  gold: ['#F59E0B', '#D97706'] as const,
  success: ['#22C55E', '#16A34A'] as const,
  danger: ['#EF4444', '#DC2626'] as const,
  premium: ['#3E92CC', '#7C5CC4'] as const,
  glass: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)'] as const,
};

/* ── Shadow presets ── */
export const shadows = {
  sm: {
    shadowColor: '#0F1A2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0F1A2E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 12,
  },
  glow: (color: string, opacity = 0.35) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: opacity,
    shadowRadius: 16,
    elevation: 10,
  }),
};

/* ── Border-radius presets ── */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 999,
} as const;

/* ── Mutable singleton ── */
export const theme = {
  name: 'default',
  isDark: false,
  colors: { ...LIGHT_COLORS },
  typography: {
    h1:    { fontSize: 26, fontWeight: '800' as const, color: LIGHT_COLORS.primaryText, letterSpacing: -0.8 },
    h2:    { fontSize: 17, fontWeight: '700' as const,  color: LIGHT_COLORS.primaryText, letterSpacing: -0.3 },
    body:  { fontSize: 14, fontWeight: '400' as const,  color: LIGHT_COLORS.primaryText, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '500' as const,  color: LIGHT_COLORS.secondaryText, letterSpacing: 0.2 },
    mono:  { fontSize: 22, fontWeight: '800' as const, color: LIGHT_COLORS.primaryText, letterSpacing: -1.2 },
    caption: { fontSize: 11, fontWeight: '600' as const, color: LIGHT_COLORS.secondaryText, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  },
  glassmorphism: {
    borderWidth: 1,
    borderRadius: 20,
    shadowColor: '#0F1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
};

/** Apply a full palette swap (light or dark). */
export function applyPalette(mode: 'light' | 'dark') {
  const src = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  theme.isDark = mode === 'dark';
  Object.assign(theme.colors, src);
  theme.typography = {
    h1:    { fontSize: 26, fontWeight: '800' as const, color: src.primaryText, letterSpacing: -0.8 },
    h2:    { fontSize: 17, fontWeight: '700' as const,  color: src.primaryText, letterSpacing: -0.3 },
    body:  { fontSize: 14, fontWeight: '400' as const,  color: src.primaryText, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '500' as const,  color: src.secondaryText, letterSpacing: 0.2 },
    mono:  { fontSize: 22, fontWeight: '800' as const, color: src.primaryText, letterSpacing: -1.2 },
    caption: { fontSize: 11, fontWeight: '600' as const, color: src.secondaryText, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  };
  theme.glassmorphism = {
    borderWidth: 1,
    borderRadius: 20,
    shadowColor: mode === 'dark' ? '#000' : '#0F1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  };
}

/** Re-export palette objects for direct access when needed. */
export const lightColors = LIGHT_COLORS;
export const darkColors  = DARK_COLORS;

export const getCategoryColor = (category: string): string =>
  theme.colors.category[category] ?? '#90A4AE';

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  const abs = Math.abs(amount);
  let formatted = '';
  if (abs >= 1000000) formatted = `${(abs / 1000000).toFixed(1)}M`;
  else if (abs >= 1000) formatted = `${(abs / 1000).toFixed(1)}k`;
  else formatted = abs.toFixed(2);

  const symbol = getCurrencySymbol(currency);
  return `${symbol}${formatted}`;
};

export const getCurrencySymbol = (currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
  return formatter.format(0).replace(/\d/g, '').replace(/[^\w\s\$\£\€\¥]/g, '').trim() || currency;
};

export const formatCurrencyFull = (amount: number, currency: string = 'USD'): string => {
  const abs = Math.abs(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(abs);
};
