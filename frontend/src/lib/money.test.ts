import { describe, expect, test } from 'vitest';

import { MONEY_MESSAGES, parseMoney } from './money';

describe('parseMoney accepts', () => {
  test.each([
    ['12500', 1_250_000],
    ['12.500', 1_250_000],
    ['12.500,50', 1_250_050],
    ['$12.500,00', 1_250_000],
    ['0', 0],
    ['1.130.000', 113_000_000],
    ['12,5', 1_250],
    [' $ 2.500 ', 250_000],
  ])('%s as %i cents', (input, cents) => {
    expect(parseMoney(input)).toEqual({ ok: true, cents });
  });
});

describe('parseMoney turns down', () => {
  test.each([
    ['12.5', MONEY_MESSAGES.cents],
    ['12,500.00', MONEY_MESSAGES.cents],
    ['1.2345', MONEY_MESSAGES.cents],
    ['-5', MONEY_MESSAGES.negative],
    ['abc', MONEY_MESSAGES.format],
    ['', MONEY_MESSAGES.empty],
  ])('%s', (input, error) => {
    expect(parseMoney(input)).toEqual({ ok: false, error });
  });

  test('says how to write cents for 12.5', () => {
    expect(MONEY_MESSAGES.cents).toBe('Use a comma for cents, like 12.500,50');
  });
});

test('an empty value counts as 0 only where the form allows it', () => {
  expect(parseMoney('', { allowEmpty: true })).toEqual({ ok: true, cents: 0 });
  expect(parseMoney('   ', { allowEmpty: true })).toEqual({ ok: true, cents: 0 });
  expect(parseMoney('').ok).toBe(false);
});
