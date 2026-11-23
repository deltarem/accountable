// Money input for forms (DEC-04). Accepts 12500, 12.500, 12.500,50 and
// $12.500,00. Anything unclear is turned down with a message, never guessed.

export type MoneyResult = { ok: true; cents: number } | { ok: false; error: string };

export const MONEY_MESSAGES = {
  empty: 'Enter an amount',
  negative: "Value can't be negative",
  cents: 'Use a comma for cents, like 12.500,50',
  format: 'Enter an amount like 12.500,00',
} as const;

const VALID = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

export function parseMoney(input: string | null | undefined, options: { allowEmpty?: boolean } = {}): MoneyResult {
  const text = (input ?? '').replace(/\s/g, '').replace(/^\$/, '');
  if (text === '') {
    return options.allowEmpty ? { ok: true, cents: 0 } : { ok: false, error: MONEY_MESSAGES.empty };
  }
  if (/^-/.test(text) || /^\$?-/.test(text)) return { ok: false, error: MONEY_MESSAGES.negative };
  const match = VALID.exec(text);
  if (!match) {
    // A dot followed by one, two or four or more digits, or a comma before a
    // group of three, reads like the other convention: ask for ours.
    if (/^[\d.,]+$/.test(text)) return { ok: false, error: MONEY_MESSAGES.cents };
    return { ok: false, error: MONEY_MESSAGES.format };
  }
  const whole = Number(match[1].replace(/\./g, ''));
  const fraction = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  return { ok: true, cents: whole * 100 + fraction };
}
