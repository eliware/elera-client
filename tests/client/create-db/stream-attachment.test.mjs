import { expect, jest, test } from "@jest/globals";
import { attachRoutingStream } from "../../../src/client/create-db/stream-attachment.mjs";

test("configures and connects the routing stream, then returns its close action", async () => {
  let onUpdate;
  const refresh = jest.fn();
  const close = jest.fn();
  const stream = {
    connect: jest.fn(),
    close,
    setTelemetry: jest.fn(),
    setOnUpdate: (handler) => (onUpdate = handler),
  };
  const metrics = { start: jest.fn() };
  const attached = await attachRoutingStream({
    stream,
    api: { refresh },
    metrics,
    getPools: () => [],
    drainTimeoutMs: 10,
  });
  expect(metrics.start).toHaveBeenCalledWith(stream);
  expect(stream.setTelemetry).toHaveBeenCalledWith(metrics);
  expect(stream.connect).toHaveBeenCalledTimes(1);
  await onUpdate({ type: "routing.update", bundleVersion: 2 });
  expect(refresh).toHaveBeenCalledWith({ bundleVersion: 2 });
  attached();
  expect(close).toHaveBeenCalledTimes(1);
});

test("rejects a stream without a connect method", async () => {
  await expect(attachRoutingStream({ stream: {} })).rejects.toThrow("routing stream is required");
});
