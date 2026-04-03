/**
 * Estimated consumption / sales tax by country and category.
 * For planning only — not professional tax advice.
 */

export type TaxMode = 'inclusive' | 'exclusive';

/** VAT/sales tax style: amount already includes tax (common in EU price tags). */
export function taxFromInclusiveAmount(amount: number, ratePercent: number): number {
  if (ratePercent <= 0 || amount <= 0) return 0;
  return amount - amount / (1 + ratePercent / 100);
}

/** Tax added at checkout on top of subtotal (common US-style). */
export function taxFromExclusiveAmount(amount: number, ratePercent: number): number {
  if (ratePercent <= 0 || amount <= 0) return 0;
  return (amount * ratePercent) / 100;
}

/**
 * Default effective rate % for expense category by country.
 * 0 = treated as exempt / out of scope for this estimate.
 */
const CATEGORY_RATES: Record<string, Record<string, number>> = {
  US: {
    'Food & Dining': 8,
    Transport: 7,
    'Housing & Rent': 0,
    Shopping: 7,
    Entertainment: 8,
    'Health & Medical': 0,
    Utilities: 6,
    Education: 0,
    Other: 7,
  },
  CA: {
    'Food & Dining': 5,
    Transport: 13,
    'Housing & Rent': 0,
    Shopping: 13,
    Entertainment: 13,
    'Health & Medical': 0,
    Utilities: 13,
    Education: 0,
    Other: 13,
  },
  GB: {
    'Food & Dining': 0,
    Transport: 20,
    'Housing & Rent': 0,
    Shopping: 20,
    Entertainment: 20,
    'Health & Medical': 0,
    Utilities: 5,
    Education: 0,
    Other: 20,
  },
  DE: {
    'Food & Dining': 7,
    Transport: 19,
    'Housing & Rent': 0,
    Shopping: 19,
    Entertainment: 19,
    'Health & Medical': 0,
    Utilities: 19,
    Education: 0,
    Other: 19,
  },
  FR: {
    'Food & Dining': 10,
    Transport: 20,
    'Housing & Rent': 0,
    Shopping: 20,
    Entertainment: 20,
    'Health & Medical': 0,
    Utilities: 20,
    Education: 0,
    Other: 20,
  },
  AU: {
    'Food & Dining': 0,
    Transport: 10,
    'Housing & Rent': 0,
    Shopping: 10,
    Entertainment: 10,
    'Health & Medical': 0,
    Utilities: 10,
    Education: 0,
    Other: 10,
  },
  NZ: {
    'Food & Dining': 0,
    Transport: 15,
    'Housing & Rent': 0,
    Shopping: 15,
    Entertainment: 15,
    'Health & Medical': 0,
    Utilities: 15,
    Education: 0,
    Other: 15,
  },
  JP: {
    'Food & Dining': 8,
    Transport: 10,
    'Housing & Rent': 0,
    Shopping: 10,
    Entertainment: 10,
    'Health & Medical': 8,
    Utilities: 10,
    Education: 0,
    Other: 10,
  },
};

const DEFAULT_COUNTRY = 'US';

export function getCategoryTaxRatePercent(countryCode: string | undefined, category: string): number {
  const cc = (countryCode || DEFAULT_COUNTRY).toUpperCase();
  const table = CATEGORY_RATES[cc] || CATEGORY_RATES[DEFAULT_COUNTRY];
  return table[category] ?? table.Other ?? 0;
}

/** Suggested tax mode by country (US/CA: exclusive; most others: inclusive). */
export function defaultTaxModeForCountry(countryCode: string | undefined): TaxMode {
  const cc = (countryCode || '').toUpperCase();
  if (cc === 'US' || cc === 'CA') return 'exclusive';
  return 'inclusive';
}

export function computeExpenseTax(
  amount: number,
  category: string,
  countryCode: string | undefined,
  mode: TaxMode,
): number {
  const rate = getCategoryTaxRatePercent(countryCode, category);
  if (rate <= 0) return 0;
  return mode === 'inclusive' ? taxFromInclusiveAmount(amount, rate) : taxFromExclusiveAmount(amount, rate);
}
