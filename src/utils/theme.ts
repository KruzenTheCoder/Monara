export const theme = {
  colors: {
    backgroundStart: '#121212',
    backgroundEnd: '#121212',
    backgroundMid: '#121212',
    primaryText: '#FFFFFF',
    secondaryText: '#A0A0A0',
    glassBackground: '#1E1E1E',
    glassBorder: '#2C2C2C',
    glassBorderTop: '#2C2C2C',
    accent: '#BB86FC',
    accentGlow: 'transparent',
    status: {
      green: '#03DAC6',
      greenGlow: 'transparent',
      amber: '#FFB74D',
      amberGlow: 'transparent',
      red: '#CF6679',
      redGlow: 'transparent',
    },
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
