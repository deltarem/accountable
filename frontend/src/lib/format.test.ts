import { describe, expect, test } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatLongDate,
  formatMoney,
  formatMoneyShort,
  formatMoneyWhole,
  formatPercent,
  formatRelative,
  initials,
} from './format';

describe('dates', () => {
  test('day first', () => {
    expect(formatDate('2026-11-23')).toBe('23 Nov 2026');
    expect(formatDate('2027-01-05')).toBe('5 Jan 2027');
    expect(formatDate(null)).toBe('');
  });

  test('date and time on a 24-hour clock', () => {
    expect(formatDateTime('2026-11-23T14:05:00')).toBe('23 Nov 2026, 14:05');
    expect(formatDateTime('2026-11-23T09:30:00')).toBe('23 Nov 2026, 09:30');
  });

  test('long date for the dashboard', () => {
    expect(formatLongDate('2026-11-23')).toBe('Monday, 23 Nov 2026');
  });
});

describe('money', () => {
  test('dot for thousands, comma for cents, always the dollar sign', () => {
    expect(formatMoney(1_250_000)).toBe('$12.500,00');
    expect(formatMoney(0)).toBe('$0,00');
    expect(formatMoney(113_000_000)).toBe('$1.130.000,00');
    expect(formatMoney(1_250_050)).toBe('$12.500,50');
    expect(formatMoney(5)).toBe('$0,05');
  });

  test('headline money drops the cents', () => {
    expect(formatMoneyWhole(41_250_000)).toBe('$412.500');
    expect(formatMoneyWhole(113_000_000)).toBe('$1.130.000');
  });

  test('axis money is short', () => {
    expect(formatMoneyShort(40_000_000)).toBe('$400k');
    expect(formatMoneyShort(120_000_000)).toBe('$1,2M');
    expect(formatMoneyShort(8_600_000)).toBe('$86k');
    expect(formatMoneyShort(100_000_000)).toBe('$1M');
    expect(formatMoneyShort(0)).toBe('$0');
  });
});

test('percent', () => {
  expect(formatPercent(75)).toBe('75%');
});

describe('relative dates against a fixed today', () => {
  const today = '2026-11-23';
  test.each([
    ['2026-11-23', 'Today'],
    ['2026-11-24', 'Tomorrow'],
    ['2026-11-26', 'In 3 days'],
    ['2026-11-20', '3 days overdue'],
    ['2026-11-22', '1 day overdue'],
    ['2026-12-01', 'In 8 days'],
  ])('%s is "%s"', (date, expected) => {
    expect(formatRelative(date, today)).toBe(expected);
  });
});

test('initials', () => {
  expect(initials('Sam Whitfield')).toBe('SW');
  expect(initials('Grace van der Liu')).toBe('GL');
  expect(initials('Madonna')).toBe('MA');
});
