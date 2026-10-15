import { expect, jest, test } from "@jest/globals";
import { retireObsoletePools } from "../../../src/client/lifecycle/pool-retirement.mjs";

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
