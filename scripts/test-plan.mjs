// How npm test shares out the machine. Used by the test scripts, playwright.config.ts
// and the end-to-end helpers, so they all agree on where each worker's servers are.

import path from "node:path";

export const READY = "All test servers are up.";

export const MAX_WORKERS = 64;

// Runs of the checks in different worktrees can go at once, and each takes a block of
// ports of its own. Blocks are 1000 apart, so no range in one reaches a range in
// another, and block 0 has the ports every run used before there were blocks.
export const MAX_RUNS = 10;
const BLOCK_SIZE = 1000;

// Held open by a run, which the system closes however the run ends, so nothing is left to clear up.
export const QUIET_PORT = 5190;
// The computer's end-to-end workers are shared by every run on it, as seats, one port each.
// Seats are taken one run at a time, holding the first port.
export const SEAT_LOCK_PORT = 5099;
const FIRST_SEAT_PORT = 5100;

// Measured on 10 cores: the time stops falling at 6 workers, and 8 to 12 are slower,
// because each worker is a browser, a backend and a Vite server.
const WORKERS_PER_CORE = 0.6;
// Each worker adds about 1GB, and the machine needs room for everything else it's doing.
const GB_PER_WORKER = 1;
const GB_SET_ASIDE = 4;

/** Starts from cores and memory, so a smaller machine gets fewer workers rather than failures. */
export function chooseWorkers({ cores, memoryGb, requested }) {
  if (requested) {
    const count = Number(requested);
    if (!Number.isInteger(count) || count < 1 || count > MAX_WORKERS) {
      throw new Error(`ACCOUNTABLE_TEST_WORKERS must be a whole number from 1 to ${MAX_WORKERS}, not "${requested}".`);
    }
    return count;
  }
  const byCores = Math.floor(cores * WORKERS_PER_CORE);
  const byMemory = Math.floor((memoryGb - GB_SET_ASIDE) / GB_PER_WORKER);
  return Math.max(1, Math.min(byCores, byMemory, MAX_WORKERS));
}

function checkBlock(block) {
  if (!Number.isInteger(block) || block < 0 || block >= MAX_RUNS) {
    throw new Error(`The block of test ports must be a whole number from 0 to ${MAX_RUNS - 1}, not ${block}.`);
  }
}

/** The port a run holds open while one of its end-to-end workers has this seat. */
export function seatPort(seat) {
  if (!Number.isInteger(seat) || seat < 0 || seat >= MAX_WORKERS) {
    throw new Error(`A seat must be a whole number from 0 to ${MAX_WORKERS - 1}, not ${seat}.`);
  }
  return FIRST_SEAT_PORT + seat;
}

/** The ports a run holds open while it has its block, and while it's busy with anything but the speed tests. */
export function claimPortsFor(block) {
  checkBlock(block);
  return { taken: QUIET_PORT + 1 + block * BLOCK_SIZE, busy: QUIET_PORT + 2 + block * BLOCK_SIZE };
}

/** The ports one Playwright worker's servers use, in the run's block. */
export function portsFor(index, block) {
  checkBlock(block);
  const offset = block * BLOCK_SIZE + index;
  return { webPort: 5200 + offset, apiPort: 8800 + offset, copyWebPort: 5300 + offset, copyApiPort: 8900 + offset };
}

/** Everything one Playwright worker has to itself, so workers can run side by side. */
export function stackFor(index, database, block) {
  return {
    ...portsFor(index, block),
    database: path.join(path.dirname(database), `worker-${index}`, path.basename(database)),
  };
}
