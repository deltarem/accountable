import { notifyManager } from "@tanstack/react-query";
import { cleanup, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeAll } from "vitest";

// The first render, click and keystroke in a file each take far longer than later ones, while
// the engine warms up, and that would all land on whichever test comes first (Q5).
beforeAll(async () => {
  render(createElement("input", { "aria-label": "Warm up" }));
  await userEvent.setup({ delay: null }).type(screen.getByRole("textbox"), "warm");
  cleanup();
});

// React Query passes every change to the page on with a setTimeout(0), which on Windows
// waits for the system's 15ms timer tick, and a page's reads add up past a second (Q5).
// setImmediate still runs it after the current task, as the browser does, without the wait.
notifyManager.setScheduler((callback) => setImmediate(callback));

// The checks run these beside the backend's tests, and maybe beside another worktree's
// checks, so something a test waits for can take more than the default second to show.
// A wait returns as soon as it's met, so this only matters on a busy machine.
configure({ asyncUtilTimeout: 5000 });

// jsdom keeps storage and the page's own element between tests, so one test's mode
// or session would otherwise carry into the next. The page goes first, so nothing
// on it reacts to the session ending.
afterEach(() => {
  cleanup();
  localStorage.clear();
  // Like a browser, jsdom tells only other tabs that storage changed, so the session
  // is told by hand, the way it hears another tab sign out.
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
  delete document.documentElement.dataset.mode;
  document.documentElement.style.colorScheme = "";
});

// jsdom leaves these out, and Radix and cmdk call them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;
