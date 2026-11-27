import { availableParallelism } from "node:os";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const webPort = Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173);
const apiPort = Number(process.env.ACCOUNTABLE_API_PORT ?? 8765);
// The tests set their own cache so they can't disturb a running copy.
const cacheDir = process.env.ACCOUNTABLE_VITE_CACHE ?? "node_modules/.vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir,
  server: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: true,
    // This is the address the browser uses, so it guards the customer data. By
    // default, pages on other local ports can call /api through it, and it serves
    // the whole repo, database included.
    cors: false,
    fs: { allow: [".", "../node_modules", cacheDir] },
    proxy: { "/api": `http://127.0.0.1:${apiPort}` },
  },
  // Listed up front, or Vite finds them during a first visit and reloads the page.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router",
      "react-router/dom",
      "@tanstack/react-query",
      "@tanstack/react-table",
      "recharts",
      "@dnd-kit/core",
      "radix-ui",
      "cmdk",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "zod",
      "date-fns",
      "sonner",
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "../scripts/*.test.mjs"],
    setupFiles: ["src/test-setup.ts"],
    restoreMocks: true,
    // A test that hangs still ends. On a machine with fewer cores a table test can pass 5s, Vitest's default.
    testTimeout: 15_000,
    // On a 4-core laptop with two threads a core, Vitest's usual worker a thread made each test
    // three to five times slower, past the one-second limit (Q5). A quarter of the threads kept
    // them under it. CI only lists slow tests, so there Vitest takes its usual number.
    maxWorkers: process.env.CI ? undefined : Math.max(1, Math.floor(availableParallelism() / 4)),
    // A leftover .only would skip the rest of its file and still pass.
    allowOnly: false,
    // On when npm test asks for it, so a run while working stays quick.
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test-setup.ts", "src/test-utils.tsx"],
      reporter: ["text-summary"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
