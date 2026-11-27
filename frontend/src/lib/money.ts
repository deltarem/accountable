export function money(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

/** Shortened with the currency, for chart axes: $40k, $1.2M. */
export function shortMoney(value: number): string {
  if (value >= 1_000_000) return `$${+(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return `$${+(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

/** The most a unit price can be, $1,000,000.00, the same as the backend's limit. */
export const MAX_PRICE_CENTS = 100_000_000;

/** A price in whole cents as dollars and cents: $1,200.00 (G6). Whole-number arithmetic, so no cent is lost. */
export function cents(value: number): string {
  const dollars = Math.trunc(value / 100);
  const remainder = String(value % 100).padStart(2, "0");
  return `$${dollars.toLocaleString("en-US")}.${remainder}`;
}

/** A saved price as the price box shows it for editing: 49.50, with no currency or separators. */
export function priceText(value: number): string {
  return `${Math.trunc(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

export const PRICE_MESSAGES = {
  blank: "Enter a price",
  notAPrice: "Enter a price in dollars and cents, such as 49.50",
  tooHigh: `Enter a price of ${cents(MAX_PRICE_CENTS)} or less`,
};

// Dollars, with or without commas between thousands, then up to two decimal places.
const PRICE = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{0,2}))?$/;

/**
 * What was typed in the price box, in whole cents, or the message to show (G5).
 * It reads the dollars and the cents as digits, because 0.29 * 100 is 28.999… in floating point.
 */
export function readPrice(text: string): { cents: number } | { message: string } {
  const typed = text.trim().replace(/^\$\s*/, "");
  if (typed === "") return { message: PRICE_MESSAGES.blank };
  const parts = PRICE.exec(typed);
  if (!parts) return { message: PRICE_MESSAGES.notAPrice };
  const dollars = Number(parts[1].replaceAll(",", ""));
  const total = dollars * 100 + Number((parts[2] ?? "").padEnd(2, "0"));
  return total > MAX_PRICE_CENTS ? { message: PRICE_MESSAGES.tooHigh } : { cents: total };
}
