import { expect, test, jest } from "@jest/globals";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/runtime.mjs";

const primaryHosts = (client) =>
  client
    .nodeStates()
    .filter((node) => node.route === "primary")
    .map((node) => node.host);

test("requires options with a primary connection profile", async () => {
  await expect(createDb()).rejects.toThrow("primary connection profile");
});

test("routes reads to balanced pools and writes to the primary pool", async () => {
  const mysqlLib = driver();
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    mysqlLib,
  });
  await client.query("SELECT 1");
  await client.query("SELECT 1", [], { route: "balanced" });
  await client.execute("UPDATE app SET x=1");
  const pools = mysqlLib.createPool.mock.results.map((result) => result.value);
  expect(pools[0].query).toHaveBeenCalledTimes(0);
  expect(pools[0].execute).toHaveBeenCalledTimes(1);
  expect(pools.slice(1).reduce((count, pool) => count + pool.query.mock.calls.length, 0)).toBe(2);
  await client.close();
});

test("runs application transactions through the client", async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await expect(
    client.transaction(async (tx) => {
      await tx.query("SELECT 1");
      return tx.execute("UPDATE app SET x=1");
    }),
  ).resolves.toBeTruthy();
  await client.close();
});

test("sets availability through the runtime client", async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  client.setNodeAvailability("primary", "db", false);
  client.setNodeAvailability("balanced", "read", false);
  await client.close();
});

test("reports primary and balanced health through the client", async () => {
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    mysqlLib: driver(),
  });
  await expect(client.health()).resolves.toMatchObject({ ok: true, route: "primary" });
  await expect(client.health("balanced")).resolves.toMatchObject({ ok: true, route: "balanced" });
  await client.close();
});

test("logs setup and closes the client", async () => {
  const log = { debug: jest.fn() };
  const client = await createDb({ primary: profile, mysqlLib: driver(), log });
  expect(log.debug).toHaveBeenCalled();
  expect(client.bundle()).toBeUndefined();
  await expect(client.attachRoutingStream()).rejects.toThrow("routing stream is required");
  await client.end();
  await client.end();
});

test("preserves MariaDB query, execute, and connection results", async () => {
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
  const client = await createDb({ primary: profile, mysqlLib: { createPool: () => pool } });
  await expect(client.query("SELECT 1")).resolves.toEqual([[{ ok: 1 }], [{ name: "ok" }]]);
  const tx = await client.getConnection();
  await tx.beginTransaction();
  await tx.execute("UPDATE users SET active=?", [true]);
  await tx.commit();
  tx.release();
  await client.close();
  expect(connection.commit).toHaveBeenCalledTimes(1);
});

test("keeps refresh updates isolated between client instances", async () => {
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
    writer: { host: "app-a-next", port: 3306 },
    failover: [{ host: "a-backup", port: 3306 }],
    bundleVersion: 2,
    routes: { ...bundle.routes, primary: [{ host: "app-a-next", port: 3306 }] },
  });
  expect(clientA.bundle().writer.host).toBe("app-a-next");
  expect(clientB.bundle().writer.host).toBe("app-b-writer");
  expect(primaryHosts(clientA)).toEqual(["app-a-next", "a-backup"]);
  expect(primaryHosts(clientB)).toEqual(["app-b-writer", "b-backup"]);
  await update({
    ...bundle,
    type: "routing.update",
    writer: { host: "app-a-final", port: 3306 },
    failover: [],
    bundleVersion: 3,
    routes: { ...bundle.routes, primary: [{ host: "app-a-final", port: 3306 }] },
  });
  expect(clientA.nodeStates().find((node) => node.route === "primary").host).toBe("app-a-final");
  expect(
    clientA
      .nodeStates()
      .filter((node) => node.route === "balanced")
      .map((node) => node.host),
  ).toEqual(bundle.routes.balanced.map((node) => node.host));
  expect(clientB.bundle().writer.host).toBe("app-b-writer");
  await clientA.close();
  await clientB.close();
});

test("rejects invalid refreshes and applies a primary-only client refresh", async () => {
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    bundle,
    mysqlLib: driver(),
  });
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
  expect(client.nodeStates().filter((node) => node.route === "balanced")).toEqual([]);
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
