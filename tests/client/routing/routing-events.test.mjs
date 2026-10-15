import { expect, test, jest } from "@jest/globals";
import { createRoutingEventHandler } from "../../../src/client/routing/routing-events.mjs";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/runtime.mjs";

test("handles routing updates and lifecycle events across pools", async () => {
  const refresh = jest.fn();
  const pool = { drain: jest.fn(), recover: jest.fn() };
  const handle = createRoutingEventHandler({ refresh, getPools: () => [pool], drainTimeoutMs: 20 });
  await handle({ type: "routing.update", bundleVersion: 2 });
  await handle({ type: "routing.drain", node: "db", drainTimeoutMs: 10 });
  await handle({ type: "routing.drain", node: "db" });
  await handle({ type: "routing.shutdown", node: "db", reconnectDeadlineMs: 5 });
  await handle({ type: "routing.recovery", node: "db" });
  expect(refresh).toHaveBeenCalledWith({ bundleVersion: 2 });
  expect(pool.drain).toHaveBeenCalledTimes(3);
  expect(pool.drain).toHaveBeenNthCalledWith(2, "db", 20);
  expect(pool.recover).toHaveBeenCalledWith("db", 20);
});

test("rejects incomplete stream updates and accepts a complete update", async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  let update;
  await client.attachRoutingStream({
    connect: async () => {},
    setOnUpdate: (handler) => {
      update = handler;
    },
  });
  await expect(
    update({ type: "routing.update", routes: { primary: [{ host: "next", port: 3306 }] } }),
  ).rejects.toThrow();
  await update({
    ...bundle,
    type: "routing.update",
    bundleVersion: 2,
    routes: { ...bundle.routes, primary: [{ host: "versioned-writer", port: 3306 }] },
  });
  expect(client.bundle()).toMatchObject({ bundleVersion: 2, writer: bundle.writer });
  await update({
    ...bundle,
    type: "routing.update",
    bundleVersion: 3,
    routes: { ...bundle.routes, primary: [{ host: "top-level-writer", port: 3306 }] },
  });
  expect(client.bundle()).toMatchObject({ bundleVersion: 3, writer: bundle.writer });
  expect(client.bundle()).not.toHaveProperty("credentials");
  await client.close();
});

test("drains the addressed node after a shutdown event", async () => {
  const eventBundle = {
    ...bundle,
    writer: { host: "writer", port: 3306 },
    failover: [{ host: "backup", port: 3306 }],
    routes: {
      primary: [
        { host: "writer", port: 3306 },
        { host: "backup", port: 3306 },
      ],
      balanced: [],
    },
  };
  const client = await createDb({ primary: profile, bundle: eventBundle, mysqlLib: driver() });
  let update;
  await client.attachRoutingStream({
    connect: async () => {},
    setOnUpdate: (handler) => {
      update = handler;
    },
  });
  await update({ type: "routing.shutdown", node: "writer" });
  expect(client.nodeStates().find((node) => node.host === "writer")).toMatchObject({
    state: "draining",
    available: false,
  });
  await client.close();
});
