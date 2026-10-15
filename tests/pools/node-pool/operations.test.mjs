import { expect, jest, test } from "@jest/globals";
import { createNodeOperations } from "../../../src/pools/node-pool/operations.mjs";

test("runs direct and session-scoped requests with lifecycle accounting", async () => {
  const connection = {
    query: jest.fn(async () => ["session rows"]),
    execute: jest.fn(async () => ["session result"]),
    release: jest.fn(),
  };
  const pool = {
    query: jest.fn(async () => ["rows"]),
    execute: jest.fn(async () => ["result"]),
    getConnection: jest.fn(async () => connection),
  };
  const begin = jest.fn();
  const end = jest.fn();
  const direct = createNodeOperations({ pool, sessionStatements: [], begin, end });
  await expect(direct.query("SELECT 1")).resolves.toEqual(["rows"]);
  await expect(direct.execute("SELECT 1")).resolves.toEqual(["result"]);
  const scoped = createNodeOperations({ pool, sessionStatements: ["SET x=1"], begin, end });
  await expect(scoped.query("SELECT 1")).resolves.toEqual(["session rows"]);
  await expect(scoped.execute("SELECT 1")).resolves.toEqual(["session result"]);
  expect(connection.query).toHaveBeenCalledWith("SET x=1");
  expect(connection.release).toHaveBeenCalledTimes(2);
  expect(begin).toHaveBeenCalledTimes(4);
  expect(end).toHaveBeenCalledTimes(4);
});

test("releases a session connection when a request fails", async () => {
  const connection = {
    query: async () => {},
    execute: async () => {
      throw new Error("fail");
    },
    release: jest.fn(),
  };
  const operations = createNodeOperations({
    pool: { getConnection: async () => connection },
    sessionStatements: [],
    begin: () => {},
    end: () => {},
  });
  await expect(operations.withConnection((conn) => conn.execute("BAD"))).rejects.toThrow("fail");
  expect(connection.release).toHaveBeenCalled();
});
