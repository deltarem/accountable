import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom lacks a few browser APIs that Radix, cmdk and Recharts use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};

// Node 25 and later define their own localStorage, which is undefined unless
// Node is started with --localstorage-file, and it hides jsdom's. Use jsdom's
// storage, as a browser would have.
const { window: jsdomWindow } = (globalThis as unknown as { jsdom: { window: Window & typeof globalThis } }).jsdom;
for (const name of ['localStorage', 'sessionStorage', 'Storage'] as const) {
  Object.defineProperty(globalThis, name, { value: jsdomWindow[name], configurable: true, writable: true });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
