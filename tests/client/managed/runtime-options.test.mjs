import { expect, test, jest } from "@jest/globals";
import { resolveManagedRuntimeOptions } from "../../../src/client/managed/runtime-options.mjs";

test("applies runtime defaults", () => {
  const options = resolveManagedRuntimeOptions();
  expect(options).toMatchObject({
    fetchImpl: globalThis.fetch,
    fetchPath: undefined,
    WebSocketImpl: globalThis.WebSocket,
    routing: "auto",
    quarantineMs: 5000,
    drainTimeoutMs: 45000,
    telemetry: true,
  });
  expect(options.now).toEqual(expect.any(Function));
  expect(options.now()).toEqual(expect.any(Number));
});

test("preserves configured runtime dependencies and settings", () => {
  const options = {
    fetchImpl: jest.fn(),
    fetchPath: "/bundle",
    WebSocketImpl: class WebSocketImpl {},
    mysqlLib: {},
    log: {},
    routing: "primary",
    quarantineMs: 4,
    drainTimeoutMs: 5,
    now: jest.fn(() => 6),
    telemetry: false,
  };
  expect(resolveManagedRuntimeOptions(options)).toEqual(options);
});
