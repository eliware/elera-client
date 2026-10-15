import { expect, jest, test } from "@jest/globals";
import { createTelemetry } from "../src/telemetry.mjs";

test("connects telemetry state to a stream emitter", () => {
  let callback;
  const stream = { sendTelemetry: jest.fn() };
  const metrics = createTelemetry({
    application: "app",
    now: () => 1000,
    setIntervalImpl: (fn) => {
      callback = fn;
      return { unref() {} };
    },
    clearIntervalImpl: jest.fn(),
  });
  metrics.begin();
  metrics.record({ latencyMs: 4 });
  metrics.start(stream);
  callback();
  expect(stream.sendTelemetry).toHaveBeenCalledWith(
    expect.objectContaining({ application: "app", queries: 1 }),
  );
  metrics.stop();
});

test("keeps one timer and supports missing stream methods", () => {
  let callback;
  const setIntervalImpl = jest.fn((fn) => {
    callback = fn;
    return {};
  });
  const metrics = createTelemetry({ setIntervalImpl, clearIntervalImpl: jest.fn() });
  metrics.start({});
  metrics.start({});
  callback();
  metrics.stop();
  expect(setIntervalImpl).toHaveBeenCalledTimes(1);
});

test("stops before the first start", () => {
  const metrics = createTelemetry();
  expect(() => metrics.stop()).not.toThrow();
});
