import { expect, jest, test } from "@jest/globals";
import { createTransactionOperation } from "../../../src/client/create-db/transaction.mjs";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { bundle, connection, driver, profile } from "../../../test-fixtures/client/create-db.mjs";
import { makeManagedClient } from "../../../test-fixtures/client/managed.mjs";

const run = (connection) =>
  createTransactionOperation({
    primaryPool: { choose: () => ({ getConnection: async () => connection }) },
    timed: (callback) => callback(),
  });

test("commits query and execute work and releases the pinned connection", async () => {
  const connection = {
    beginTransaction: jest.fn(),
    query: jest.fn(async () => ["rows"]),
    execute: jest.fn(async () => ["result"]),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  await expect(
    run(connection)(async (tx) => [
      await tx.query("SELECT 1", []),
      await tx.execute("UPDATE t SET x=?", [1]),
    ]),
  ).resolves.toEqual([["rows"], ["result"]]);
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection.commit).toHaveBeenCalledTimes(1);
  expect(connection.rollback).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test("maps application transaction failures through the managed client", async () => {
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
  expect(conn.release).toEqual(expect.any(Function));
  await client.close();
});

test("preserves writer connection transaction methods and release behavior", async () => {
  const release = jest.fn();
  const connection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    query: jest.fn(),
    execute: jest.fn(),
    release,
  };
  const { client } = await makeManagedClient({ connection });
  const acquired = await client.getConnection();
  await acquired.beginTransaction();
  await acquired.execute("UPDATE t SET x=?", [1]);
  await acquired.commit();
  acquired.release();
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection.commit).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
  await client.end();
});

test("keeps rollback and release available after a failed connection query", async () => {
  const release = jest.fn();
  const connection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    query: jest.fn(),
    execute: jest.fn(async () => {
      throw new Error("constraint");
    }),
    release,
  };
  const { client } = await makeManagedClient({ connection });
  const acquired = await client.getConnection();
  await acquired.beginTransaction();
  await expect(acquired.execute("INSERT INTO t VALUES (?)", [1])).rejects.toThrow("constraint");
  await acquired.rollback();
  acquired.release();
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
  await client.end();
});

test("rolls back and maps callback failures before releasing", async () => {
  const failure = Object.assign(new Error("transaction failed"), { code: "ER_LOCK_DEADLOCK" });
  const connection = {
    beginTransaction: jest.fn(),
    query: jest.fn(),
    execute: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(async () => {}),
    release: jest.fn(),
  };
  await expect(
    run(connection)(async () => {
      throw failure;
    }),
  ).rejects.toMatchObject({ message: "transaction failed", code: "ER_LOCK_DEADLOCK" });
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test("preserves the original failure when rollback also fails", async () => {
  const failure = new Error("query failed");
  const connection = {
    beginTransaction: jest.fn(),
    query: jest.fn(),
    execute: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn().mockRejectedValue(new Error("rollback failed")),
    release: jest.fn(),
  };
  await expect(
    run(connection)(async () => {
      throw failure;
    }),
  ).rejects.toMatchObject({ message: "query failed" });
  expect(connection.release).toHaveBeenCalledTimes(1);
});
