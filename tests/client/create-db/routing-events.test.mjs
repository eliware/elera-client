import { expect, test, jest } from "@jest/globals";
import { createRoutingEventHandler } from "../../../src/client/create-db/routing-events.mjs";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

test("handles routing updates and lifecycle events across pools", async () => {
  const refresh = jest.fn();
  const pool = { drain: jest.fn(), recover: jest.fn() };
  const handle = createRoutingEventHandler({ refresh, getPools: () => [pool], drainTimeoutMs: 20 });
  await handle({ type: "routing.update", bundleVersion: 2 });
  await handle({ type: "routing.drain", node: "db", drainTimeoutMs: 10 });
  await handle({ type: "routing.shutdown", node: "db", reconnectDeadlineMs: 5 });
  await handle({ type: "routing.recovery", node: "db" });
  expect(refresh).toHaveBeenCalledWith({ bundleVersion: 2 });
  expect(pool.drain).toHaveBeenCalledTimes(2);
  expect(pool.recover).toHaveBeenCalledWith("db", 20);
});

test("normalizes update metadata and handles REST resync events", async () => {
  const refresh = jest.fn();
  const handle = createRoutingEventHandler({ refresh, getPools: () => [], drainTimeoutMs: 20 });
  await handle({
    type: "routing.update",
    bundleVersion: 2,
    version: 3,
    generatedAt: "2099-01-01T00:00:00Z",
  });
  await handle({ type: "routing.resync", version: 4, bundle: { bundleVersion: 4 } });
  const pool = { drain: jest.fn(), recover: jest.fn() };
  const lifecycleHandle = createRoutingEventHandler({
    refresh,
    getPools: () => [pool],
    drainTimeoutMs: 20,
  });
  await lifecycleHandle({ type: "routing.drain", node: "db" });
  await handle({ type: "routing.unknown" });
  expect(refresh).toHaveBeenNthCalledWith(1, { bundleVersion: 2 });
  expect(refresh).toHaveBeenNthCalledWith(2, { bundleVersion: 4 });
  expect(pool.drain).toHaveBeenCalledWith("db", 20);
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

test("updates one application client without changing another client assignment", async () => {
  const clientA = await createDb({
    primary: profile,
    bundle: {
      ...bundle,
      writer: { host: "app-a-writer", port: 3306 },
      failover: [{ host: "a-backup", port: 3306 }],
    },
    mysqlLib: driver(),
  });
  const clientB = await createDb({
    primary: profile,
    bundle: {
      ...bundle,
      writer: { host: "app-b-writer", port: 3306 },
      failover: [{ host: "b-backup", port: 3306 }],
    },
    mysqlLib: driver(),
  });
  let update;
  await clientA.attachRoutingStream({
    connect: async () => {},
    setOnUpdate: (handler) => {
      update = handler;
    },
  });
  await update({
    ...bundle,
    type: "routing.update",
    writer: { host: "app-a-new-writer", port: 3306 },
    failover: [{ host: "a-backup", port: 3306 }],
    bundleVersion: 2,
    routes: {
      primary: [{ host: "app-a-new-writer", port: 3306 }],
      balanced: bundle.routes.balanced,
    },
    database: "app",
  });
  expect(clientA.bundle().writer.host).toBe("app-a-new-writer");
  expect(clientB.bundle().writer.host).toBe("app-b-writer");
  expect(
    clientA
      .nodeStates()
      .filter((node) => node.route === "primary")
      .map((node) => node.host),
  ).toEqual(["app-a-new-writer", "a-backup"]);
  expect(
    clientB
      .nodeStates()
      .filter((node) => node.route === "primary")
      .map((node) => node.host),
  ).toEqual(["app-b-writer", "b-backup"]);
  await clientA.close();
  await clientB.close();
});
