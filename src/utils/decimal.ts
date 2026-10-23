/**
 * Decimal-safe financial arithmetic utilities.
 * Avoids IEEE 754 binary floating-point rounding errors (e.g., 0.1 + 0.2 = 0.30000000000000004).
 */

const PRECISION = 10000; // 4 decimal places internal precision factor

export function toCents(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * PRECISION);
}

export function fromCents(cents: number): number {
  return cents / PRECISION;
}

export function addMoney(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

export function multiplyMoney(amount: number, multiplier: number): number {
  return fromCents(Math.round(toCents(amount) * multiplier));
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (denominator === 0 || isNaN(denominator) || !isFinite(denominator)) {
    return fallback;
  }
  return numerator / denominator;
}

export function safePercentage(numerator: number, denominator: number, decimals = 2): number {
  if (denominator === 0 || isNaN(denominator) || !isFinite(denominator)) {
    return 0;
  }
  const ratio = (numerator / denominator) * 100;
  return Number(ratio.toFixed(decimals));
}

export function roundFinancial(value: number, decimals = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  if (isNaN(amount) || !isFinite(amount)) return '$0.00';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${roundFinancial(amount, 2).toFixed(2)}`;
  }
}

export function formatPercent(value: number, decimals = 1): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  return `${roundFinancial(value, decimals).toFixed(decimals)}%`;
}
