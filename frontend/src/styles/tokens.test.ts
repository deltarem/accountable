import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

// tokens.css holds every colour, once for each mode (ARC-15, DES-01, DES-02,
// and the spec's Design, "Dark mode"). These tests check the contrast the spec
// lists, that light mode keeps today's values, and that no colour lives
// anywhere else.

// Vitest runs from frontend/, and jsdom's import.meta.url isn't a file: URL.
const SRC = path.resolve('src');
const TOKENS_CSS = readFileSync(path.join(SRC, 'styles', 'tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = TOKENS_CSS.indexOf(`${selector} {`);
  expect(start, `tokens.css has a ${selector} block`).toBeGreaterThanOrEqual(0);
  const body = TOKENS_CSS.slice(start, TOKENS_CSS.indexOf('\n}', start));
  const tokens: Record<string, string> = {};
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return tokens;
}

const LIGHT = block(':root');
const DARK_ONLY = block(":root[data-theme='dark']");
const DARK = { ...LIGHT, ...DARK_ONLY };

/** A token's final value, following var() references within one mode. */
function resolve(tokens: Record<string, string>, name: string): string {
  let value = tokens[name];
  expect(value, `${name} is defined`).toBeDefined();
  for (let i = 0; i < 10 && value.startsWith('var('); i++) {
    value = tokens[value.slice(4, -1).trim()];
  }
  return value.toLowerCase();
}

function luminance(hex: string): number {
  expect(hex, 'a six-digit hex colour').toMatch(/^#[0-9a-f]{6}$/);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text, background]: each must reach 4.5:1, the rule for small text (DEC-06).
const SHADES = ['sea', 'marigold', 'coral', 'cerulean', 'raspberry'];
const TEXT_PAIRS: [string, string][] = [
  ...['--page', '--panel', '--card', '--raised', '--highlight'].flatMap((bg): [string, string][] => [
    ['--ink', bg],
    ['--muted', bg],
  ]),
  ...SHADES.flatMap((c): [string, string][] => [
    [`--${c}-text`, '--panel'],
    [`--${c}-text`, '--card'],
    [`--${c}-text`, '--raised'],
    [`--${c}-text`, `--${c}-tint`],
  ]),
  ['--ink', '--midnight-tint'],
  ['--muted', '--midnight-tint'],
  ['--on-bright', '--sea'],
  ['--on-bright', '--marigold'],
  ['--on-bright', '--coral'],
  ['--on-bright', '--lost'],
  ['--on-solid', '--stage-new'],
  ['--on-solid', '--danger'],
  ['--on-strong', '--strong'],
  ['--on-tip', '--tip'],
  ['--on-toast', '--toast'],
  ['--on-toast-error', '--toast-error'],
  ['--on-dark', '--dark-panel'],
  ['--on-dark-muted', '--dark-panel'],
  ...['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s): [string, string] => [
    `--stage-${s}-ink`,
    `--stage-${s}`,
  ]),
];

describe.each([
  ['light', LIGHT],
  ['dark', DARK],
])('contrast in %s mode', (_mode, tokens) => {
  test.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (text, bg) => {
    const ratio = contrast(resolve(tokens, text), resolve(tokens, bg));
    expect(ratio, `${resolve(tokens, text)} on ${resolve(tokens, bg)}`).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the two modes', () => {
  test('light mode keeps the values it had before dark mode was added', () => {
    const today: Record<string, string> = {
      '--page': '#f0f4f5',
      '--panel': '#ffffff',
      '--card': '#f3f7f8',
      '--card-hover': '#edf3f4',
      '--card-lift': '#ffffff',
      '--row-hover': '#f7fafa',
      '--raised': '#ffffff',
      '--highlight': '#f3f7f8',
      '--line': '#e8eef0',
      '--ring': '#cdd8db',
      '--ink': '#073b4c',
      '--muted': '#4d6973',
      '--placeholder': '#6b858e',
      '--on-bright': '#073b4c',
      '--on-solid': '#ffffff',
      '--strong': '#073b4c',
      '--strong-hover': '#0b4a5e',
      '--on-strong': '#ffffff',
      '--dark-panel': '#073b4c',
      '--on-dark': '#cdd8db',
      '--on-dark-strong': '#ffffff',
      '--on-dark-muted': '#9fb4ba',
      '--dark-grid': '#1c5568',
      '--dark-hover': 'rgba(205, 216, 219, 0.12)',
      '--dark-skeleton': 'rgba(205, 216, 219, 0.14)',
      '--dark-up-tint': 'rgba(6, 214, 160, 0.16)',
      '--tip': '#ffffff',
      '--on-tip': '#073b4c',
      '--toast': '#073b4c',
      '--on-toast': '#ffffff',
      '--toast-icon': '#06d6a0',
      '--toast-error': '#ffffff',
      '--on-toast-error': '#073b4c',
      '--toast-error-icon': '#c2264f',
      '--overlay': 'rgba(7, 59, 76, 0.45)',
      '--chart-grid': '#cdd8db',
      '--chart-cursor': 'rgba(7, 59, 76, 0.05)',
      '--sea': '#06d6a0',
      '--sea-hover': '#05c491',
      '--marigold': '#ffc145',
      '--coral': '#f78c6b',
      '--cerulean': '#118ab2',
      '--raspberry': '#ef476f',
      '--midnight': '#073b4c',
      '--mist': '#cdd8db',
      '--lost': '#8fa3aa',
      '--danger': '#c2264f',
      '--danger-hover': '#a81f43',
      '--count-pill': 'rgba(255, 255, 255, 0.28)',
      '--sea-text': '#067a5c',
      '--sea-tint': '#e6fbf5',
      '--marigold-text': '#8a5a00',
      '--marigold-tint': '#fff6e3',
      '--coral-text': '#b4472a',
      '--coral-tint': '#feeee9',
      '--cerulean-text': '#0d6e8f',
      '--cerulean-tint': '#e7f3f7',
      '--raspberry-text': '#c2264f',
      '--raspberry-tint': '#fdecf0',
      '--midnight-tint': '#e8eef0',
      '--stage-new': '#0d6e8f',
      '--stage-new-ink': '#ffffff',
      '--stage-qualified': '#ffc145',
      '--stage-qualified-ink': '#073b4c',
      '--stage-proposal': '#f78c6b',
      '--stage-proposal-ink': '#073b4c',
      '--stage-negotiation': '#073b4c',
      '--stage-negotiation-ink': '#ffffff',
      '--stage-won': '#06d6a0',
      '--stage-won-ink': '#073b4c',
      '--stage-lost': '#8fa3aa',
      '--stage-lost-ink': '#073b4c',
    };
    const actual = Object.fromEntries(Object.keys(today).map((name) => [name, resolve(LIGHT, name)]));
    expect(actual).toEqual(today);
  });

  test('the dark block only redefines tokens that light mode has', () => {
    const unknown = Object.keys(DARK_ONLY).filter((name) => !(name in LIGHT));
    expect(unknown).toEqual([]);
  });

  test('the colours meant to stay the same are not redefined in dark mode', () => {
    // The brand fills, the text on them, the delete button, and the rail and
    // headline panels, which stay Midnight in both modes (spec: "Dark surfaces").
    const fixed = [
      '--sea',
      '--marigold',
      '--coral',
      '--cerulean',
      '--raspberry',
      '--midnight',
      '--mist',
      '--lost',
      '--on-bright',
      '--on-solid',
      '--danger',
      '--dark-panel',
      '--on-dark',
      '--on-dark-strong',
      '--on-dark-muted',
      '--dark-grid',
    ];
    expect(fixed.filter((name) => name in DARK_ONLY)).toEqual([]);
  });

  test('dark mode uses the brand surfaces and tells the browser it is dark', () => {
    expect(resolve(DARK, '--page')).toBe('#04232e');
    expect(resolve(DARK, '--panel')).toBe('#000000');
    expect(TOKENS_CSS).toMatch(/:root\[data-theme='dark'\] \{[^}]*color-scheme: dark;/);
  });
});

describe('colours live only in tokens.css', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return name === 'test' ? [] : files(full);
      return /\.(css|ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
    });
  }

  test('no other file under src/ holds a hex, rgb() or rgba() colour', () => {
    const tokensFile = path.join(SRC, 'styles', 'tokens.css');
    const offenders = files(SRC)
      .filter((file) => file !== tokensFile)
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => ({ line, i }))
          .filter(({ line }) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line))
          .map(({ line, i }) => `${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`),
      );
    expect(offenders).toEqual([]);
  });
});
