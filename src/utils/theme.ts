export const theme = {
  colors: {
    backgroundStart: '#0A0A0B',
    backgroundEnd: '#0A0A0B',
    backgroundMid: '#0A0A0B',
    primaryText: '#FFFFFF',
    secondaryText: '#8E8E93',
    glassBackground: 'rgba(28, 28, 30, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassBorderTop: 'rgba(255, 255, 255, 0.15)',
    accent: '#BB86FC',
    accentGlow: 'rgba(187, 134, 252, 0.3)',
    status: {
      green: '#34C759',
      greenGlow: 'rgba(52, 199, 89, 0.3)',
      amber: '#FF9500',
      amberGlow: 'rgba(255, 149, 0, 0.3)',
      red: '#FF3B30',
      redGlow: 'rgba(255, 59, 48, 0.3)',
    },
    themes: {
      default: {
        primary: '#BB86FC',
        secondary: '#03DAC6',
        name: 'Monara Classic'
      },
      emerald: {
        primary: '#10B981',
        secondary: '#34D399',
        name: 'Emerald City'
      },
      ocean: {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        name: 'Ocean Deep'
      },
      sunset: {
        primary: '#F59E0B',
        secondary: '#FBBF24',
        name: 'Golden Sunset'
      },
      rose: {
        primary: '#F43F5E',
        secondary: '#FB7185',
        name: 'Midnight Rose'
      }
    } as Record<string, { primary: string; secondary: string; name: string }>,
    category: {
      'Food & Dining': '#FFB74D',
      'Transport': '#64B5F6',
      'Housing & Rent': '#4DD0E1',
      'Shopping': '#F06292',
      'Entertainment': '#BA68C8',
      'Health & Medical': '#E57373',
      'Utilities': '#4DB6AC',
      'Education': '#FF8A65',
      'Salary': '#81C784',
      'Freelance': '#64B5F6',
      'Investment': '#BB86FC',
      'Gift': '#F48FB1',
      'Other': '#90A4AE',
    } as Record<string, string>,
  },
  typography: {
    h1: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    body: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '400' as const,
    },
    label: {
      fontSize: 12,
      color: '#A0A0A0',
      fontWeight: '400' as const,
    },
    mono: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      color: '#FFFFFF',
      letterSpacing: -1,
    },
  },
  glassmorphism: {
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
};

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
