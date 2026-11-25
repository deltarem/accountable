/// <reference types="vitest/config" />
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const backendPort = process.env.BACKEND_PORT ?? '8000';
const frontendPort = Number(process.env.FRONTEND_PORT ?? 5173);
const repoRoot = path.resolve(__dirname, '..');

/**
 * What the browser is told about sign-in, fixed into the build (ARC-17): the
 * Supabase address and publishable key, and whether this is local mode. Nothing
 * else from .env or the environment reaches the browser, DATABASE_URL least of all.
 * Local mode and the unit tests get no Supabase settings at all (ARC-14).
 */
export function browserSettings(env: Record<string, string>, mode: string) {
  const local = mode === 'test' || env.ACCOUNTABLE_LOCAL === '1';
  return {
    __ACCOUNTABLE_LOCAL__: JSON.stringify(local),
    __SUPABASE_URL__: JSON.stringify(local ? '' : (env.SUPABASE_URL ?? '')),
    __SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(local ? '' : (env.SUPABASE_PUBLISHABLE_KEY ?? '')),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The repo root's .env, plus the environment (Render), which wins.
  define: browserSettings(loadEnv(mode, repoRoot, ''), mode),
  server: {
    host: '127.0.0.1',
    port: frontendPort,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
}));
