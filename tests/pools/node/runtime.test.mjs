import { expect, jest, test } from "@jest/globals";
import { createNodeRuntime } from "../../../src/pools/node/runtime.mjs";

test("coordinates node lifecycle and failure availability", async () => {
  let now = 0;
  const pool = { end: jest.fn(async () => {}) };
  const state = { failures: 0, unavailableUntil: 0 };
  const runtime = createNodeRuntime({ pool, state, now: () => now, quarantineMs: 10 });

  expect(runtime.isAvailable()).toBe(true);
  runtime.failurePolicy.quarantine();
  expect(runtime.isAvailable()).toBe(false);
  now = 10;
  expect(runtime.isAvailable()).toBe(true);
  runtime.lifecycle.drain(10000);
  expect(runtime.isAvailable()).toBe(false);
  runtime.lifecycle.recover();
  expect(runtime.isAvailable()).toBe(true);
  await runtime.lifecycle.close();
  expect(pool.end).toHaveBeenCalledTimes(1);
});
