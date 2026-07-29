/**
 * Currency conversion.
 *
 * Kept out of `src/import/buildTrip` so that the UI can convert amounts without
 * pulling the SheetJS parser into the main bundle — the parser is loaded on demand,
 * only when someone actually imports a workbook.
 */
import type { ExchangeRate, Money } from './types';

/**
 * Convert using a rate the workbook declared, in either direction.
 *
 * Returns null when no declared rate covers the pair. We never invent or chain rates:
 * a made-up conversion would be a made-up number on a budget page.
 */
export function convert(money: Money, target: string, rates: readonly ExchangeRate[]): Money | null {
  if (!money.currency || money.currency === target) return null;
  for (const rate of rates) {
    if (rate.from === money.currency && rate.to === target) {
      return { amount: money.amount * rate.rate, currency: target };
    }
    if (rate.to === money.currency && rate.from === target && rate.rate !== 0) {
      return { amount: money.amount / rate.rate, currency: target };
    }
  }
  return null;
}
