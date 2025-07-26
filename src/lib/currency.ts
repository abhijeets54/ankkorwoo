/**
 * Currency utility functions for Ankkor
 */

type CurrencyOptions = {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/**
 * Format a numeric price to a currency string
 */
export function formatPrice(
  amount: string | number,
  options: CurrencyOptions = {}
): string {
  const {
    locale = 'en-IN',
    currency = 'INR',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(numericAmount);
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(
  currencyCode: string = 'INR',
  locale: string = 'en-IN'
): string {
  return (0).toLocaleString(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).replace(/\d/g, '').trim();
}

/**
 * Format price without currency symbol
 */
export function formatPriceWithoutSymbol(
  amount: string | number,
  options: CurrencyOptions = {}
): string {
  const {
    locale = 'en-IN',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(numericAmount);
}

/**
 * Default currency symbol for the application
 */
export const DEFAULT_CURRENCY_SYMBOL = '₹';
export const DEFAULT_CURRENCY_CODE = 'INR'; 