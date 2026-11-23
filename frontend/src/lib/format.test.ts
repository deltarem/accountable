import { describe, expect, test } from 'vitest';

import {
  daysFrom,
  displayWebsite,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatMonth,
  formatMonthShort,
  formatMoney,
  formatMoneyInput,
  formatMoneyShort,
  formatMoneyWhole,
  formatPercent,
  formatRelative,
  initials,
  plural,
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

describe('more dates', () => {
  test('a missing date or time shows nothing', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDateTime(null)).toBe('');
  });

  test('month keys for chart axes and tooltips', () => {
    expect(formatMonth('2026-11')).toBe('Nov 2026');
    expect(formatMonth('2027-01')).toBe('Jan 2027');
    expect(formatMonthShort('2026-11')).toBe('Nov');
    expect(formatMonthShort('2025-12')).toBe('Dec');
  });

  test('days between two dates ignore the time of day', () => {
    expect(daysFrom('2026-11-23', '2026-11-30T23:59:00')).toBe(7);
    expect(daysFrom('2026-11-23T08:00:00', '2026-11-22')).toBe(-1);
    expect(daysFrom('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('more money', () => {
  test('negative amounts keep their sign in front of the dollar', () => {
    expect(formatMoney(-1_250_050)).toBe('-$12.500,50');
    expect(formatMoneyWhole(-41_250_000)).toBe('-$412.500');
    expect(formatMoneyShort(-8_600_000)).toBe('-$86k');
    expect(formatMoneyShort(-120_000_000)).toBe('-$1,2M');
  });

  test('headline money rounds half a dollar up', () => {
    expect(formatMoneyWhole(12_350)).toBe('$124');
    expect(formatMoneyWhole(12_349)).toBe('$123');
  });

  test('small amounts on an axis show whole dollars', () => {
    expect(formatMoneyShort(45_000)).toBe('$450');
  });

  test('money for an input has no dollar sign (DEC-04)', () => {
    expect(formatMoneyInput(1_250_050)).toBe('12.500,50');
    expect(formatMoneyInput(0)).toBe('0,00');
  });
});

test('a missing percentage shows nothing', () => {
  expect(formatPercent(null)).toBe('');
  expect(formatPercent(undefined)).toBe('');
  expect(formatPercent(0)).toBe('0%');
});

test('plural picks the word by count, with an optional irregular plural', () => {
  expect(plural(1, 'deal')).toBe('1 deal');
  expect(plural(0, 'deal')).toBe('0 deals');
  expect(plural(3, 'activity', 'activities')).toBe('3 activities');
  expect(plural(2, 'to do', 'to do')).toBe('2 to do');
});

test('initials of a blank name are empty', () => {
  expect(initials('   ')).toBe('');
  expect(initials('  ana   silva ')).toBe('AS');
});

test('websites show without the scheme or a trailing slash', () => {
  expect(displayWebsite('https://acme.example/')).toBe('acme.example');
  expect(displayWebsite('http://acme.example/shop')).toBe('acme.example/shop');
  expect(displayWebsite('acme.example')).toBe('acme.example');
});
