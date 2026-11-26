import net from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import { WAITING_FOR_QUIET, WAITING_FOR_SPEED_TESTS, claimBlock, claimQuiet, startBusy } from "./test-sharing.mjs";

const RUNS = 3;
const toRelease = [];

function open(port = 0) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen({ port, host: "127.0.0.1", exclusive: true }, () => resolve(server));
  });
}

const close = (server) => new Promise((resolve) => server.close(() => resolve()));

/** Ports the system says are free, so these tests never meet the claims of a real run. */
async function freePorts(count) {
  const servers = await Promise.all(Array.from({ length: count }, () => open()));
  const ports = servers.map((server) => server.address().port);
  await Promise.all(servers.map(close));
  return ports;
}

/** A computer with three blocks, each with one claim, one busy port and two ports per worker. */
async function makeComputer() {
  const ports = await freePorts(1 + RUNS * 4);
  const block = (index) => ports.slice(1 + index * 4, 5 + index * 4);
  return {
    runs: RUNS,
    quiet: ports[0],
    claims: (index) => ({ taken: block(index)[0], busy: block(index)[1] }),
    workerPorts: (index, workers) => block(index).slice(2, 2 + workers * 2),
  };
}

async function claim(...args) {
  const result = await claimBlock(...args);
  if (result) toRelease.push(result.release);
  return result;
}

/** Whether the promise is still waiting a little later. */
async function stillWaiting(promise) {
  const later = new Promise((resolve) => setTimeout(() => resolve("waiting"), 400));
  return (await Promise.race([promise.then(() => "done"), later])) === "waiting";
}

afterEach(async () => {
  await Promise.all(toRelease.splice(0).map((release) => release()));
});

describe("claimBlock", () => {
  it("gives runs side by side a block each, and a block back once its run ends", async () => {
    const computer = await makeComputer();
    const first = await claim(1, computer);
    const second = await claim(1, computer);
    expect(first.block).not.toBe(second.block);

    await first.release();
    expect((await claim(1, computer)).block).toBe(first.block);
  });

  it("passes over a block with something else on one of its ports", async () => {
    const computer = await makeComputer();
    const other = await open(computer.workerPorts(0, 1)[1]);
    toRelease.push(() => close(other));
    expect((await claim(1, computer)).block).toBe(1);
  });

  it("finds no block when every one is taken", async () => {
    const computer = await makeComputer();
    for (let run = 0; run < RUNS; run += 1) await claim(1, computer);
    expect(await claim(1, computer)).toBeNull();
  });
});

describe("startBusy and claimQuiet", () => {
  it("hold back a run's start while another run's speed tests have the computer", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const computer = await makeComputer();
    const endQuiet = await claimQuiet(0, computer);

    const busy = startBusy(1, computer);
    expect(await stillWaiting(busy)).toBe(true);
    expect(log).toHaveBeenCalledWith(WAITING_FOR_SPEED_TESTS);

    await endQuiet();
    await (
      await busy
    )();
  });

  it("hold back the speed tests until no other run is busy, whatever this run is doing", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const computer = await makeComputer();
    const endOwnBusy = await startBusy(0, computer);
    const endOtherBusy = await startBusy(1, computer);

    const quiet = claimQuiet(0, computer);
    expect(await stillWaiting(quiet)).toBe(true);
    expect(log).toHaveBeenCalledWith(WAITING_FOR_QUIET);

    await endOtherBusy();
    await (
      await quiet
    )();
    await endOwnBusy();
  });

  it("let one run's speed tests go at a time", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const computer = await makeComputer();
    const endFirst = await claimQuiet(0, computer);

    const second = claimQuiet(1, computer);
    expect(await stillWaiting(second)).toBe(true);

    await endFirst();
    await (
      await second
    )();
  });
});
