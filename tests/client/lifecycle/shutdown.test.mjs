import "../../../test-fixtures/silence-default-logger.mjs";
import { expect, test, jest } from "@jest/globals";
import { createPoolShutdown } from "../../../src/client/lifecycle/shutdown.mjs";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/runtime.mjs";

test("drains, waits for idle, and closes pools once", async () => {
  const pool = {
    drain: jest.fn(),
    waitForIdle: jest.fn(async () => {}),
    close: jest.fn(async () => {}),
  };
  const shutdown = createPoolShutdown({
    getPools: () => [pool],
    drainTimeoutMs: 10,
    metrics: { stop: jest.fn() },
  });
  await Promise.all([shutdown.close(), shutdown.close()]);
  expect(pool.drain).toHaveBeenCalledWith(10);
  expect(pool.waitForIdle).toHaveBeenCalledWith(10);
  expect(pool.close).toHaveBeenCalledTimes(1);
});

test("drains route pools and reports node lifecycle state", async () => {
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    bundle,
    mysqlLib: driver(),
    log: { warn: () => {} },
  });
  const drain = client.drain("db", 25);
  expect(drain.timeoutMs).toBe(25);
  await drain.wait();
  expect(client.nodeStates().find((node) => node.host === "db").state).toBe("draining");
  await drain.forceClose();
  await client.close();
});

test("shutdown shares concurrent close completion", async () => {
  const end = jest.fn(async () => {});
  const client = await createDb({
    primary: profile,
    mysqlLib: {
      createPool: () => ({
        query: async () => [[]],
        execute: async () => [[]],
        getConnection: async () => ({}),
        end,
      }),
    },
  });
  const first = client.close();
  const second = client.close();
  await Promise.all([first, second]);
  expect(end).toHaveBeenCalledTimes(1);
});
