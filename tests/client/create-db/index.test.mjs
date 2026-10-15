import { expect, test, jest } from "@jest/globals";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

test("creates a client and routes reads, writes, transactions, health, and close", async () => {
  const log = { debug: jest.fn() };
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    mysqlLib: driver(),
    log,
  });
  await client.query("SELECT 1");
  await client.query("SELECT 1", [], { route: "balanced" });
  await client.execute("UPDATE app SET x=1");
  await client.transaction(async (tx) => {
    await tx.query("SELECT 1");
    await tx.execute("UPDATE app SET x=1");
  });
  await expect(client.health()).resolves.toMatchObject({ ok: true, route: "primary" });
  await expect(client.health("balanced")).resolves.toMatchObject({ ok: true, route: "balanced" });
  expect(log.debug).toHaveBeenCalled();
  await client.close();
});

test("supports an unbundled client view and the end alias", async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  expect(client.bundle()).toBeUndefined();
  await expect(client.attachRoutingStream()).rejects.toThrow("routing stream is required");
  await client.end();
});

test("validates bundle updates and applies a primary-only refresh", async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  await expect(
    client.refresh({
      ...bundle,
      writer: undefined,
      routes: { primary: [], balanced: bundle.routes.balanced },
      bundleVersion: 2,
    }),
  ).rejects.toThrow("writer");
  await expect(
    client.refresh({
      ...bundle,
      writer: { host: "new", port: 3306 },
      routes: { primary: [{ host: "new", port: 3306 }], balanced: [] },
      readers: [],
      bundleVersion: 2,
    }),
  ).resolves.toMatchObject({ bundleVersion: 2 });
  expect(client.nodeStates().filter((node) => node.route === "balanced")).toHaveLength(0);
  await expect(client.refresh({ ...bundle, bundleVersion: 1 })).resolves.toMatchObject({
    bundleVersion: 2,
  });
  await expect(client.refresh({ ...bundle, bundleVersion: 0 })).resolves.toMatchObject({
    bundleVersion: 2,
  });
  await expect(client.refresh({ ...bundle, bundleVersion: undefined })).rejects.toThrow(
    "bundleVersion",
  );
  await client.close();
});

test("keeps routing updates local to the owning client", async () => {
  const first = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  const second = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  let update;
  await first.attachRoutingStream({
    connect: async () => {},
    setOnUpdate: (handler) => {
      update = handler;
    },
  });
  await update({
    ...bundle,
    type: "routing.update",
    bundleVersion: 2,
    writer: { host: "new-writer", port: 3306 },
    routes: { primary: [{ host: "new-writer", port: 3306 }], balanced: bundle.routes.balanced },
  });
  expect(first.bundle().writer.host).toBe("new-writer");
  expect(second.bundle().writer.host).toBe("db");
  await first.close();
  await second.close();
});

test("drains a node after a shutdown event", async () => {
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

test("merges writer-only updates with active route sets", async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  let update;
  await client.attachRoutingStream({
    connect: async () => {},
    setOnUpdate: (handler) => {
      update = handler;
    },
  });
  await update({
    ...bundle,
    type: "routing.update",
    writer: { host: "writer-only", port: 3306 },
    failover: [],
    bundleVersion: 2,
    routes: { ...bundle.routes, primary: [{ host: "writer-only", port: 3306 }] },
  });
  expect(client.nodeStates().find((node) => node.route === "primary").host).toBe("writer-only");
  await client.close();
});

test("preserves MariaDB client query and connection results", async () => {
  const connection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    query: jest.fn(async () => [[{ ok: 1 }], [{ name: "ok" }]]),
    execute: jest.fn(async () => [{ affectedRows: 1 }, []]),
    release: jest.fn(),
  };
  const pool = {
    query: jest.fn(async () => [[{ ok: 1 }], [{ name: "ok" }]]),
    execute: jest.fn(async () => [{ affectedRows: 1 }, []]),
    getConnection: jest.fn(async () => connection),
    end: jest.fn(async () => {}),
  };
  const client = await createDb({
    primary: profile,
    bundle,
    mysqlLib: { createPool: () => pool },
  });
  await expect(client.query("SELECT 1")).resolves.toEqual([[{ ok: 1 }], [{ name: "ok" }]]);
  const tx = await client.getConnection();
  await tx.beginTransaction();
  await tx.execute("UPDATE users SET active=?", [true]);
  await tx.commit();
  tx.release();
  await client.close();
  expect(connection.commit).toHaveBeenCalledTimes(1);
});
