import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { retireObsoletePools } from "../../../src/client/lifecycle/pool-retirement.mjs";

beforeEach(() => jest.useFakeTimers({ doNotFake: ["setImmediate"] }));
afterEach(() => jest.useRealTimers());

test("drains and closes obsolete pools after they become idle", async () => {
  const events = [];
  const obsolete = {
    nodes: [{ drain: jest.fn(() => events.push("drain")) }],
    waitForIdle: jest.fn(async () => events.push("idle")),
    close: jest.fn(async () => events.push("close")),
  };
  const retained = { nodes: [{ drain: jest.fn() }] };
  retireObsoletePools({
    previous: [null, obsolete, retained],
    retained: [retained],
    drainTimeoutMs: 5,
  });
  await new Promise((resolve) => setImmediate(resolve));
  expect(events).toEqual(["drain", "idle", "close"]);
  expect(retained.nodes[0].drain).not.toHaveBeenCalled();
});

test("does nothing when all previous pools remain active", () => {
  const pool = { nodes: [{ drain: jest.fn() }] };
  retireObsoletePools({ previous: [pool], retained: [pool], drainTimeoutMs: 5 });
  expect(pool.nodes[0].drain).not.toHaveBeenCalled();
});

test("keeps an obsolete pool open when active work misses the idle deadline", async () => {
  const pool = {
    nodes: [{ drain: jest.fn() }],
    waitForIdle: jest.fn(async () => [true, false]),
    close: jest.fn(),
  };

  retireObsoletePools({ previous: [pool], retained: [], drainTimeoutMs: 5 });
  await new Promise((resolve) => setImmediate(resolve));

  expect(pool.close).not.toHaveBeenCalled();
});

test("handles a rejected idle wait and closes the obsolete pool", async () => {
  const pool = {
    nodes: [{ drain: jest.fn() }],
    waitForIdle: jest.fn().mockRejectedValue(new Error("idle wait failed")),
    close: jest.fn(async () => {}),
  };
  retireObsoletePools({ previous: [pool], retained: [], drainTimeoutMs: 5 });
  await new Promise((resolve) => setImmediate(resolve));
  expect(pool.close).toHaveBeenCalledTimes(1);
});

test("handles a rejected close without an unhandled retirement error", async () => {
  const close = jest.fn().mockRejectedValue(new Error("close failed"));
  const pool = {
    nodes: [{ drain: jest.fn() }],
    waitForIdle: jest.fn(async () => [true]),
    close,
  };
  retireObsoletePools({ previous: [pool], retained: [], drainTimeoutMs: 5 });
  await new Promise((resolve) => setImmediate(resolve));
  expect(close).toHaveBeenCalledTimes(2);
});
