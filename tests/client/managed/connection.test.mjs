import "../../../test-fixtures/silence-default-logger.mjs";
import { expect, jest, test } from "@jest/globals";
import { makeManagedClient } from "../../../test-fixtures/client/managed.mjs";

test("returns the primary connection and preserves transaction methods", async () => {
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
