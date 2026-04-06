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
  accentGlow: string;
  navy: string;
  navyLight: string;
  surface: string;
  surfaceSecondary: string;
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
  backgroundStart: '#FAFAFC',
  backgroundEnd: '#F0F1F5',
  backgroundMid: '#F5F5F8',
  primaryText: '#1B2A4A',
  secondaryText: '#6B7B98',
  glassBackground: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(27, 42, 74, 0.06)',
  glassBorderTop: 'rgba(27, 42, 74, 0.10)',
  accent: '#3E92CC',
  accentGlow: 'rgba(62, 146, 204, 0.25)',
  navy: '#1B2A4A',
  navyLight: '#203058',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F1F5',
  divider: 'rgba(27, 42, 74, 0.06)',
  overlayBg: 'rgba(27, 42, 74, 0.25)',
  status: {
    green: '#2DA86B', greenGlow: 'rgba(45, 168, 107, 0.2)',
    amber: '#E8920D', amberGlow: 'rgba(232, 146, 13, 0.2)',
    red:   '#D94040', redGlow:   'rgba(217, 64, 64, 0.2)',
  },
  themes: SHARED_THEMES,
  category: SHARED_CATEGORIES,
};

/* ── Dark palette ── */
const DARK_COLORS: ThemeColors = {
  backgroundStart: '#0A0A0F',
  backgroundEnd: '#0F0F14',
  backgroundMid: '#111118',
  primaryText: '#F0F1F5',
  secondaryText: '#8B95A8',
  glassBackground: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderTop: 'rgba(255, 255, 255, 0.12)',
  accent: '#3E92CC',
  accentGlow: 'rgba(62, 146, 204, 0.3)',
  navy: '#1B2A4A',
  navyLight: '#203058',
  surface: '#16161D',
  surfaceSecondary: '#1C1C25',
  divider: 'rgba(255, 255, 255, 0.06)',
  overlayBg: 'rgba(0, 0, 0, 0.55)',
  status: {
    green: '#34D399', greenGlow: 'rgba(52, 211, 153, 0.2)',
    amber: '#FBBF24', amberGlow: 'rgba(251, 191, 36, 0.2)',
    red:   '#F87171', redGlow:   'rgba(248, 113, 113, 0.2)',
  },
  themes: SHARED_THEMES,
  category: SHARED_CATEGORIES,
};

/* ── Mutable singleton ── */
export const theme = {
  name: 'default',
  isDark: false,
  colors: { ...LIGHT_COLORS },
  typography: {
    h1:    { fontSize: 24, fontWeight: 'bold' as const, color: LIGHT_COLORS.primaryText, letterSpacing: -0.5 },
    h2:    { fontSize: 16, fontWeight: '600' as const,  color: LIGHT_COLORS.primaryText },
    body:  { fontSize: 14, fontWeight: '400' as const,  color: LIGHT_COLORS.primaryText },
    label: { fontSize: 12, fontWeight: '400' as const,  color: LIGHT_COLORS.secondaryText },
    mono:  { fontSize: 20, fontWeight: 'bold' as const, color: LIGHT_COLORS.primaryText, letterSpacing: -1 },
  },
  glassmorphism: {
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
};

/** Apply a full palette swap (light or dark). */
export function applyPalette(mode: 'light' | 'dark') {
  const src = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  theme.isDark = mode === 'dark';
  Object.assign(theme.colors, src);
  // Replace typography objects entirely (RN freezes style objects after render)
  theme.typography = {
    h1:    { fontSize: 24, fontWeight: 'bold' as const, color: src.primaryText, letterSpacing: -0.5 },
    h2:    { fontSize: 16, fontWeight: '600' as const,  color: src.primaryText },
    body:  { fontSize: 14, fontWeight: '400' as const,  color: src.primaryText },
    label: { fontSize: 12, fontWeight: '400' as const,  color: src.secondaryText },
    mono:  { fontSize: 20, fontWeight: 'bold' as const, color: src.primaryText, letterSpacing: -1 },
  };
  theme.glassmorphism = {
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: mode === 'dark' ? '#000' : '#1B2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
