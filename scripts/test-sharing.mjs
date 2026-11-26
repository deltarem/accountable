// Lets runs of the checks in different worktrees share this computer. Each run takes a
// block of ports of its own, and the speed tests wait until no other run is busy, because
// their timings only mean something on a quiet machine.
//
// Every claim is a port held open on 127.0.0.1. The system closes it when the run ends,
// however it ends, so a run that crashed leaves nothing behind for the next one to clear.

import net from "node:net";

import { MAX_RUNS, QUIET_PORT, claimPortsFor, portsFor } from "./test-plan.mjs";

const CHECK_EVERY_MS = 200;
const LONGEST_WAIT_MS = 30 * 60_000;

export const WAITING_FOR_SPEED_TESTS = "Waiting for the speed tests in another worktree to finish.";
export const WAITING_FOR_QUIET =
  "Waiting for the checks in another worktree to finish, so the speed tests have the computer to themselves.";

function workerPorts(block, workers) {
  return Array.from({ length: workers }, (_, index) => Object.values(portsFor(index, block))).flat();
}

/** Where the claims are. The unit tests pass their own, so they never meet a real run's. */
export const COMPUTER = { runs: MAX_RUNS, quiet: QUIET_PORT, claims: claimPortsFor, workerPorts };

/** Resolves to the open server, or to the error code that stopped it opening. */
function listen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => resolve(error.code));
    server.listen({ port, host, exclusive: true }, () => resolve(server));
  });
}

const isOpen = (result) => typeof result !== "string";
const close = (server) => new Promise((resolve) => server.close(() => resolve()));

/** Opens the port, or returns null while someone else holds it. */
async function take(port) {
  const result = await listen(port);
  if (isOpen(result)) return result;
  if (result === "EADDRINUSE") return null;
  throw new Error(`Port ${port} can't be used (${result}), and the test runs need it to share this computer.`);
}

// Opening the port for a moment shows whether anyone holds it. A port the system keeps
// back gives another error, and no run can be holding one of those.
async function isHeld(port) {
  const result = await listen(port);
  if (isOpen(result)) await close(result);
  return result === "EADDRINUSE";
}

// Another app on ::1 would take the requests sent to localhost, so both have to be free.
// A computer without IPv6 can't open ::1 at all, which leaves nothing there to clash with.
async function isFree(port) {
  for (const host of ["127.0.0.1", "::1"]) {
    const result = await listen(port, host);
    if (result === "EADDRINUSE" || result === "EACCES") return false;
    if (isOpen(result)) await close(result);
  }
  return true;
}

/** Calls attempt until it returns something, and returns that. */
async function poll(attempt) {
  const deadline = Date.now() + LONGEST_WAIT_MS;
  for (;;) {
    const result = await attempt();
    if (result) return result;
    if (Date.now() > deadline) {
      throw new Error("Gave up after 30 minutes of waiting for the checks in another worktree. Is one of them stuck?");
    }
    await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS));
  }
}

/**
 * Takes the first block of ports that no other run has and nothing else is using, checking
 * the ports this many workers need, for as long as this run lasts. Returns null if every
 * block is in use.
 */
export async function claimBlock(workers, computer = COMPUTER) {
  for (let block = 0; block < computer.runs; block += 1) {
    const claim = await listen(computer.claims(block).taken);
    if (!isOpen(claim)) continue;
    const ports = [computer.claims(block).busy, ...computer.workerPorts(block, workers)];
    if ((await Promise.all(ports.map(isFree))).every(Boolean)) return { block, release: () => close(claim) };
    await close(claim);
  }
  return null;
}

/**
 * Marks this run busy, once no other run's speed tests are going, and returns what ends it.
 * The run ends it before its own speed tests.
 */
export async function startBusy(block, computer = COMPUTER) {
  let told = false;
  for (;;) {
    // Another run's look at this port holds it for a moment, so it's tried until it opens.
    const busy = await poll(() => take(computer.claims(block).busy));
    // Busy first, then the look. The speed tests take their port first, then look, so
    // when both happen at once, at least one of the two runs sees the other.
    if (!(await isHeld(computer.quiet))) return () => close(busy);
    await close(busy);
    if (!told) console.log(WAITING_FOR_SPEED_TESTS);
    told = true;
    await poll(async () => !(await isHeld(computer.quiet)));
  }
}

/**
 * Waits until no other run's speed tests are going and no other run is busy, and keeps it
 * that way until the returned function is called.
 */
export async function claimQuiet(block, computer = COMPUTER) {
  let quiet = await take(computer.quiet);
  if (!quiet) {
    console.log(WAITING_FOR_SPEED_TESTS);
    quiet = await poll(() => take(computer.quiet));
  }
  const others = Array.from({ length: computer.runs }, (_, other) => other).filter((other) => other !== block);
  const anotherIsBusy = async () =>
    (await Promise.all(others.map((other) => isHeld(computer.claims(other).busy)))).some(Boolean);
  if (await anotherIsBusy()) {
    console.log(WAITING_FOR_QUIET);
    await poll(async () => !(await anotherIsBusy()));
  }
  return () => close(quiet);
}
