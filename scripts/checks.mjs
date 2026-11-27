// Runs the layers behind npm test and npm run check, in three stages, then one summary.
//
// 1. The quick layers: the code checks (npm run check only) and the type checks side by
//    side, then the backend and frontend unit tests with their coverage, one after the
//    other. Each unit test has to take under a second (Q5), which is only a fair test
//    with nothing else of this run's competing for the cores.
// 2. The end-to-end tests, on as many workers as this machine can run well. Runs in other
//    worktrees share those workers, so one run's tests may wait for another's.
// 3. The speed tests, alone, because their timings need a quiet machine. They also wait
//    for the checks in any other worktree, and new checks there wait for them.
//
// Each run takes a block of ports of its own, so worktrees can run the checks at once.
//
// The database path is chosen here, once, because Playwright reads its config again
// in every worker: a path made there would differ between the servers and the resets.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { availableParallelism, tmpdir, totalmem } from "node:os";
import path from "node:path";

import { ROOT, localEnv, setup, start, stop } from "./setup.mjs";
import { MAX_RUNS, chooseWorkers } from "./test-plan.mjs";
import { claimBlock, claimQuiet, claimSeats, startBusy } from "./test-sharing.mjs";
import { readPlaywright, readPytest, readVitest, summarize } from "./test-report.mjs";

const node = process.execPath;
const bin = (...parts) => path.join(ROOT, "node_modules", ...parts);
const playwright = bin("@playwright", "test", "cli.js");

// The root holds TypeScript 6 for typescript-eslint, which can't read TypeScript 7 yet,
// so the type check asks for the frontend's own TypeScript.
const frontendRequire = createRequire(path.join(ROOT, "frontend", "package.json"));
const tsc = path.join(path.dirname(frontendRequire.resolve("typescript/package.json")), "bin", "tsc");

const GITLEAKS_HELP =
  "The secrets check needs gitleaks, which isn't installed. Install it from https://github.com/gitleaks/gitleaks#installing and try again.";

// Captured output loses its color unless the runner is told it's still wanted.
const color = process.stdout.isTTY && !process.env.NO_COLOR ? { FORCE_COLOR: "1" } : {};

const codeChecks = [
  { name: "Prettier", command: node, args: [bin("prettier", "bin", "prettier.cjs"), "--check", "."] },
  { name: "ESLint", command: node, args: [bin("eslint", "bin", "eslint.js"), "--max-warnings=0", "."] },
  { name: "Ruff format", command: "uv", args: ["run", "--no-sync", "ruff", "format", "--check"] },
  { name: "Ruff check", command: "uv", args: ["run", "--no-sync", "ruff", "check"] },
  {
    name: "Secrets in git history",
    command: "gitleaks",
    args: ["git", "--redact", "--no-banner", "--verbose"],
    missing: GITLEAKS_HELP,
  },
  {
    name: "Secrets in files",
    command: "gitleaks",
    args: ["dir", "--redact", "--no-banner", "--verbose"],
    missing: GITLEAKS_HELP,
  },
];

const typeChecks = [
  { name: "Frontend types", command: node, args: [tsc, "--noEmit", "-p", "frontend"] },
  { name: "Backend types", command: "uv", args: ["run", "--no-sync", "ty", "check"] },
];

function unitTests(report, text) {
  return [
    {
      name: "Backend",
      command: "uv",
      args: [
        "run",
        "--no-sync",
        "pytest",
        "-q",
        "--cov",
        "--cov-report=term:skip-covered",
        `--junit-xml=${report("backend.xml")}`,
      ],
      env: { COVERAGE_FILE: report(".coverage") },
      read: () => readPytest(text("backend.xml")),
    },
    {
      name: "Frontend",
      command: node,
      args: [
        bin("vitest", "vitest.mjs"),
        "run",
        "--root",
        "frontend",
        "--coverage.enabled",
        `--coverage.reportsDirectory=${report("frontend-coverage")}`,
        "--reporter=default",
        "--reporter=json",
        `--outputFile.json=${report("frontend.json")}`,
      ],
      read: () => readVitest(text("frontend.json"), ROOT),
    },
  ];
}

function browserLayer(name, project, count, report, text) {
  const file = `${project}.json`;
  return {
    name,
    command: node,
    args: [playwright, "test", `--project=${project}`],
    live: true,
    env: {
      ACCOUNTABLE_TEST_WORKERS: String(count),
      ACCOUNTABLE_E2E_REPORT: report(file),
      // Outside the temporary folder, which goes at the end, so it's still there to read.
      ACCOUNTABLE_E2E_HTML: path.join(ROOT, "playwright-report", project),
    },
    read: () => readPlaywright(text(file)),
  };
}

function run(layer, env, failuresOnly) {
  const began = performance.now();
  return new Promise((resolve) => {
    const child = start(layer.command, layer.args, {
      env: { ...env, ...(layer.live ? {} : color), ...layer.env },
      stdio: layer.live ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout?.on("data", (chunk) => (output += chunk));
    child.stderr?.on("data", (chunk) => (output += chunk));
    child.once("error", (error) => {
      output += `${error.code === "ENOENT" && layer.missing ? layer.missing : error.message}\n`;
      resolve({ code: 1, output });
    });
    child.once("close", (code) => resolve({ code, output }));
  }).then(({ code, output }) => {
    if (!layer.live && !(failuresOnly && code === 0)) console.log(`\n${layer.name}\n${output.trimEnd()}`);

    let results = null;
    try {
      results = layer.read?.() ?? null;
    } catch {
      // Nothing written, or something unreadable. Summarize treats both as a failure.
    }
    return { name: layer.name, code, ms: performance.now() - began, runsTests: Boolean(layer.read), results };
  });
}

const computer = { cores: availableParallelism(), memoryGb: totalmem() / 2 ** 30 };

function chooseBrowserWorkers() {
  try {
    return chooseWorkers({ ...computer, requested: process.env.ACCOUNTABLE_TEST_WORKERS });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

async function claimPorts(workers) {
  const claim = await claimBlock(workers);
  if (!claim) stop(`Every block of test ports is in use. Only ${MAX_RUNS} runs of the checks can share this computer.`);
  return claim;
}

/**
 * Runs the type checks and unit tests, plus the code checks and the browser tests when asked.
 * With failuresOnly, a check that passes shows only its line in the summary.
 */
export async function runChecks({ withCodeChecks, withBrowserTests, failuresOnly = false }) {
  setup();
  const startedAt = performance.now();
  const workers = withBrowserTests ? chooseBrowserWorkers() : 0;
  const { block } = await claimPorts(workers);

  const folder = mkdtempSync(path.join(tmpdir(), "accountable-test-"));
  const report = (name) => path.join(folder, name);
  const text = (file) => readFileSync(report(file), "utf8");

  // Without the shared app's settings, so no check or test can reach Supabase.
  const env = {
    ...localEnv(),
    ACCOUNTABLE_DB: report("test.db"),
    // Kept between runs to save filling it each time, and apart from the cache npm run dev uses.
    ACCOUNTABLE_VITE_CACHE: path.join(ROOT, "node_modules", ".vite-test"),
    ACCOUNTABLE_TEST_BLOCK: String(block),
  };

  const endBusy = await startBusy(block);
  const checks = [...(withCodeChecks ? codeChecks : []), ...typeChecks];
  const finished = await Promise.all(checks.map((layer) => run(layer, env, failuresOnly)));
  for (const layer of unitTests(report, text)) finished.push(await run(layer, env, failuresOnly));

  if (withBrowserTests) {
    console.log(`\nEnd-to-end tests, on ${workers} ${workers === 1 ? "worker" : "workers"}\n`);
    // Every run on this computer shares the workers it can run well, which is what one run gets.
    const endSeats = await claimSeats(workers, chooseWorkers(computer));
    finished.push(await run(browserLayer("End-to-end", "main", workers, report, text), env));
    await endSeats();
  }
  await endBusy();

  if (withBrowserTests) {
    console.log("\nSpeed tests, on their own\n");
    const endQuiet = await claimQuiet(block);
    finished.push(await run(browserLayer("Speed", "speed", 1, report, text), env));
    await endQuiet();
  }

  rmSync(folder, { recursive: true, force: true });

  const summary = summarize(finished, performance.now() - startedAt);
  console.log(summary.text);
  process.exit(summary.passed ? 0 : 1);
}
