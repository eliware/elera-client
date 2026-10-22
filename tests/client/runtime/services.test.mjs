import { expect, test } from "@jest/globals";
import { createDbServices } from "../../../src/client/runtime/services.mjs";

test("wires the client service groups to the supplied pool state", async () => {
  const pool = {
    nodes: [],
    drain: () => {},
    waitForIdle: async () => true,
    close: async () => {},
    query: async () => [],
    execute: async () => [],
  };
  const setup = {
    metrics: undefined,
    now: () => 0,
    selection: () => ({}),
    routing: "auto",
    getPools: () => [pool],
    getPrimaryPool: () => pool,
    getBalancedPool: () => null,
    getBundle: () => undefined,
    setBundle: () => {},
    getPrimaryConfig: () => ({}),
    setPrimaryConfig: () => {},
    setBalancedPool: () => {},
    setPrimaryPool: () => {},
    makeRoute: () => pool,
    validateBundle: (value) => value,
    validateProfile: (value) => value,
  };
  const services = createDbServices({ setup, drainTimeoutMs: 10 });
  expect(services.diagnostics).toBeDefined();
  expect(services.execution).toBeDefined();
  expect(services.transaction).toBeInstanceOf(Function);
  await services.shutdown.close();
});
