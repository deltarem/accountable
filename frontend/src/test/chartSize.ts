import { vi } from 'vitest';

/**
 * jsdom lays nothing out, so every element measures 0 x 0 and Recharts'
 * ResponsiveContainer draws an empty chart. This gives every element a fixed
 * size for the current test (setup.ts restores the spy afterwards).
 */
export function giveChartsASize(width = 600, height = 232) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width, height }),
  );
}
