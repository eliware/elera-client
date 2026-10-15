import { expect, jest, test } from "@jest/globals";
import { createLifecycleAvailability } from "../../../src/pools/node/lifecycle-availability.mjs";

test("tracks lifecycle state and cancels drain on recovery", () => {
  const state = { value: "draining", closed: false };
  const cancelDrain = jest.fn();
  const lifecycle = createLifecycleAvailability({
    now: () => 1,
    getState: () => state.value,
    setState: (value) => (state.value = value),
    isClosed: () => state.closed,
    cancelDrain,
    drain: jest.fn(),
  });
  expect(lifecycle.available).toBe(false);
  lifecycle.available = true;
  expect(lifecycle.available).toBe(true);
  expect(cancelDrain).toHaveBeenCalledTimes(1);
});

test("does not recover a closed lifecycle", () => {
  const lifecycle = createLifecycleAvailability({
    now: () => 1,
    getState: () => "unavailable",
    setState: jest.fn(),
    isClosed: () => true,
    cancelDrain: jest.fn(),
    drain: jest.fn(),
  });
  expect(lifecycle.recover()).toBe("unavailable");
});
