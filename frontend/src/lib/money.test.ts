import { describe, expect, it } from "vitest";

import { cents, money, priceText, readPrice, shortMoney } from "./money";

describe("money", () => {
  it("shows whole dollars with the currency and separators", () => {
    expect(money(48000)).toBe("$48,000");
    expect(money(1240000)).toBe("$1,240,000");
  });

  it("shows zero with its currency", () => {
    expect(money(0)).toBe("$0");
  });

  it("handles large values", () => {
    expect(money(12500000)).toBe("$12,500,000");
  });
});

describe("shortMoney", () => {
  it("shortens thousands", () => {
    expect(shortMoney(40000)).toBe("$40k");
    expect(shortMoney(100000)).toBe("$100k");
    expect(shortMoney(12500)).toBe("$12.5k");
  });

  it("shortens millions", () => {
    expect(shortMoney(1200000)).toBe("$1.2M");
    expect(shortMoney(2000000)).toBe("$2M");
  });

  it("leaves small values and zero alone, with the currency", () => {
    expect(shortMoney(0)).toBe("$0");
    expect(shortMoney(950)).toBe("$950");
  });
});

describe("cents", () => {
  it("shows dollars and cents with the currency and separators", () => {
    expect(cents(0)).toBe("$0.00");
    expect(cents(29)).toBe("$0.29");
    expect(cents(4950)).toBe("$49.50");
    expect(cents(120000)).toBe("$1,200.00");
    expect(cents(100_000_000)).toBe("$1,000,000.00");
  });
});

describe("priceText", () => {
  it("gives a saved price as the price box shows it", () => {
    expect(priceText(4950)).toBe("49.50");
    expect(priceText(7)).toBe("0.07");
    expect(priceText(120000)).toBe("1200.00");
  });
});

describe("readPrice", () => {
  it.each([
    ["49.50", 4950],
    ["49.5", 4950],
    ["49", 4900],
    ["$49", 4900],
    ["1200", 120000],
    ["1,200.00", 120000],
    [" 49.50 ", 4950],
    ["0", 0],
    // Read as digits: 0.29 * 100 is 28.999… in floating point.
    ["0.29", 29],
    ["0.07", 7],
    ["1,000,000.00", 100_000_000],
  ])("reads %j as %i cents", (text, wanted) => {
    expect(readPrice(text)).toEqual({ cents: wanted });
  });

  it.each([
    ["", "Enter a price"],
    ["   ", "Enter a price"],
    ["1.005", "Enter a price in dollars and cents, such as 49.50"],
    ["-1", "Enter a price in dollars and cents, such as 49.50"],
    ["abc", "Enter a price in dollars and cents, such as 49.50"],
    ["1,20.00", "Enter a price in dollars and cents, such as 49.50"],
    ["1,000,000.01", "Enter a price of $1,000,000.00 or less"],
    ["99999999999999999999", "Enter a price of $1,000,000.00 or less"],
  ])("refuses %j with %j", (text, message) => {
    expect(readPrice(text)).toEqual({ message });
  });
});
