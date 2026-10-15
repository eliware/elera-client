import { expect, jest, test } from "@jest/globals";
import { createDrainTimer } from "../../../src/pools/node-pool/drain-timer.mjs";

test("replaces drain timers and supports unref", () => {
  const first = { unref: jest.fn() };
  const second = { unref: jest.fn() };
  const timers = [first, second];
  const setTimeoutImpl = jest.fn(() => timers.shift());
  const clearTimeoutImpl = jest.fn();
  const onExpire = jest.fn();
  const drainTimer = createDrainTimer({ onExpire, setTimeoutImpl, clearTimeoutImpl });
  drainTimer.schedule(10);
  drainTimer.schedule(20);
  drainTimer.clear();
  expect(clearTimeoutImpl).toHaveBeenCalledWith(first);
  expect(clearTimeoutImpl).toHaveBeenLastCalledWith(second);
  expect(first.unref).toHaveBeenCalledTimes(1);
  expect(second.unref).toHaveBeenCalledTimes(1);
  expect(setTimeoutImpl).toHaveBeenNthCalledWith(2, onExpire, 20);
});

test("clears safely before a timer starts and supports handles without unref", () => {
  const handle = {};
  const clearTimeoutImpl = jest.fn();
  const drainTimer = createDrainTimer({
    onExpire: jest.fn(),
    setTimeoutImpl: () => handle,
    clearTimeoutImpl,
  });
  drainTimer.clear();
  drainTimer.schedule(10);
  drainTimer.clear();
  drainTimer.clear();
  expect(clearTimeoutImpl).toHaveBeenCalledTimes(1);
});
