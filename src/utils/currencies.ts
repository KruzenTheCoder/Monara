export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rate: 1 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rate: 0.79 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', rate: 151.6 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', rate: 1.52 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', rate: 1.35 },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭', rate: 0.90 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', rate: 7.23 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rate: 83.3 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿', rate: 1.66 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', rate: 5.06 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', rate: 18.7 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', rate: 1.35 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰', rate: 7.83 },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽', rate: 16.5 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', rate: 3.67 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦', rate: 3.75 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', rate: 1345 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', rate: 32.2 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', rate: 92.5 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', rate: 10.6 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', rate: 10.8 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', rate: 6.9 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', rate: 3.95 },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', flag: '🇮🇱', rate: 3.68 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', rate: 56.2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', rate: 15885 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', rate: 4.74 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', rate: 36.6 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', rate: 24815 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬', rate: 47.3 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', rate: 1300 },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', rate: 278 },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', flag: '🇨🇱', rate: 945 },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', flag: '🇨🇴', rate: 3850 },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', flag: '🇵🇪', rate: 3.7 },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', flag: '🇦🇷', rate: 860 },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', flag: '🇰🇼', rate: 0.31 },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', flag: '🇧🇭', rate: 0.38 },
  { code: 'OMR', symbol: 'RO', name: 'Omani Rial', flag: '🇴🇲', rate: 0.39 },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', flag: '🇶🇦', rate: 3.64 },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', flag: '🇺🇦', rate: 39 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿', rate: 23.4 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺', rate: 362 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', flag: '🇷🇴', rate: 4.58 },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', flag: '🇰🇿', rate: 447 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', flag: '🇱🇰', rate: 299 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', rate: 110 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪', rate: 131 },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', flag: '🇬🇭', rate: 13.1 },
];

export const getCurrencyInfo = (code: string) => {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

export const convertAmount = (amount: number, fromCode: string, toCode: string) => {
  const from = getCurrencyInfo(fromCode);
  const to = getCurrencyInfo(toCode);
  if (!from || !to) return amount;
  // Convert to USD first then to target
  const inUSD = amount / from.rate;
  return inUSD * to.rate;
};
