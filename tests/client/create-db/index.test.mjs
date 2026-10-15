import { expect, test, jest } from "@jest/globals";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { bundle, connection, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

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
  expect(client.bundle()).toBeUndefined();
  await expect(client.attachRoutingStream()).rejects.toThrow("routing stream is required");
  await client.end();
});

test("retries safe client queries and honors explicit connections", async () => {
  const error = Object.assign(new Error("temporary"), { code: "ECONNRESET" });
  const mysqlLib = driver({
    query: jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue([["ok"]]),
  });
  const client = await createDb({
    primary: profile,
    bundle,
    credentialProvider: async () => ({ user: "u", password: "p" }),
    mysqlLib,
    log: { warn: () => {} },
  });
  await client.query("SELECT 1", [], { route: "balanced" });
  const explicit = {
    query: jest.fn(async () => ["explicit"]),
    execute: jest.fn(async () => ["explicit"]),
  };
  await client.query("SELECT 1", [], { connection: explicit });
  await client.execute("SELECT 1", [], { connection: explicit });
  await client.close();
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

test("rolls back application transaction failures through the client", async () => {
  const failure = Object.assign(new Error("boom"), { code: "ER_LOCK_DEADLOCK" });
  const conn = connection();
  conn.query.mockRejectedValueOnce(failure);
  const client = await createDb({
    primary: profile,
    bundle,
    mysqlLib: driver({ getConnection: jest.fn(async () => conn) }),
  });
  await expect(client.transaction((tx) => tx.query("UPDATE x"))).rejects.toThrow("boom");
  expect(conn.rollback).toHaveBeenCalled();
  await client.close();
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
  expect(
    clientA
      .nodeStates()
      .filter((node) => node.route === "primary")
      .map((node) => node.host),
  ).toEqual(["app-a-next", "a-backup"]);
  expect(
    clientB
      .nodeStates()
      .filter((node) => node.route === "primary")
      .map((node) => node.host),
  ).toEqual(["app-b-writer", "b-backup"]);
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
