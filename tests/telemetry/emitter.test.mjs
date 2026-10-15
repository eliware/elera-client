import { expect, jest, test } from "@jest/globals";
import { createTelemetryEmitter } from "../../src/telemetry/emitter.mjs";

test("starts one telemetry timer, sends snapshots, and stops it", () => {
  let callback;
  const timer = { unref: jest.fn() };
  const setIntervalImpl = jest.fn((fn) => {
    callback = fn;
    return timer;
  });
  const clearIntervalImpl = jest.fn();
  const sendTelemetry = jest.fn();
  const emitter = createTelemetryEmitter({
    snapshot: () => ({ type: "client.telemetry" }),
    intervalMs: 50,
    setIntervalImpl,
    clearIntervalImpl,
  });
  emitter.start({ sendTelemetry });
  emitter.start({ sendTelemetry });
  callback();
  emitter.stop();
  expect(setIntervalImpl).toHaveBeenCalledTimes(1);
  expect(timer.unref).toHaveBeenCalledTimes(1);
  expect(sendTelemetry).toHaveBeenCalledWith({ type: "client.telemetry" });
  expect(clearIntervalImpl).toHaveBeenCalledWith(timer);
});

test("supports missing timer handles and streams", () => {
  let callback;
  const emitter = createTelemetryEmitter({
    snapshot: () => ({}),
    intervalMs: 10,
    setIntervalImpl: (fn) => {
      callback = fn;
      return {};
    },
    clearIntervalImpl: jest.fn(),
  });
  expect(() => emitter.start({})).not.toThrow();
  expect(() => callback()).not.toThrow();
  expect(() => emitter.stop()).not.toThrow();
  expect(() => emitter.stop()).not.toThrow();
});
