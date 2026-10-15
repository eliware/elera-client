import { expect, jest, test } from "@jest/globals";
import { createDrainController } from "../../../src/pools/node/drain-controller.mjs";

test("replaces drain timers and supports unref", () => {
  const first = { unref: jest.fn() };
  const second = { unref: jest.fn() };
  const timers = [first, second];
  const setTimeoutImpl = jest.fn(() => timers.shift());
  const clearTimeoutImpl = jest.fn();
  const forceClose = jest.fn();
  const drainController = createDrainController({ forceClose, setTimeoutImpl, clearTimeoutImpl });
  drainController.drain(10);
  drainController.drain(20);
  drainController.cancel();
  expect(clearTimeoutImpl).toHaveBeenCalledWith(first);
  expect(clearTimeoutImpl).toHaveBeenLastCalledWith(second);
  expect(first.unref).toHaveBeenCalledTimes(1);
  expect(second.unref).toHaveBeenCalledTimes(1);
  expect(setTimeoutImpl).toHaveBeenNthCalledWith(2, expect.any(Function), 20);
  setTimeoutImpl.mock.calls[1][0]();
  expect(forceClose).toHaveBeenCalledTimes(1);
});

test("clears safely before a timer starts and supports handles without unref", () => {
  const handle = {};
  const clearTimeoutImpl = jest.fn();
  const drainController = createDrainController({
    forceClose: jest.fn(),
    setTimeoutImpl: () => handle,
    clearTimeoutImpl,
  });
  drainController.cancel();
  drainController.drain(10);
  drainController.cancel();
  drainController.cancel();
  expect(clearTimeoutImpl).toHaveBeenCalledTimes(1);
});
