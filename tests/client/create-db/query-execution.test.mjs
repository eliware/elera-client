import { expect, jest, test } from "@jest/globals";
import { createQueryExecution } from "../../../src/client/create-db/query-execution.mjs";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { profile, bundle, driver } from "../../../test-fixtures/client/create-db.mjs";
import { makeManagedClient } from "../../../test-fixtures/client/managed.mjs";

const timed = async (operation, metadata) => operation(metadata);

test("executes query and execute with the selected route metadata", async () => {
  const pool = {
    query: jest.fn(async (sql, values) => [sql, values]),
    execute: jest.fn(async (sql, values) => [sql, values]),
  };
  const routeFor = jest.fn(() => "balanced");
  const execution = createQueryExecution({
    selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => false }),
    timed,
    metrics: {},
    routeFor,
    routing: "auto",
  });
  await expect(execution.query("SELECT ?", [1], { route: "balanced" })).resolves.toEqual([
    "SELECT ?",
    [1],
  ]);
  await expect(execution.execute("UPDATE t SET x=?", [2])).resolves.toEqual([
    "UPDATE t SET x=?",
    [2],
  ]);
  expect(routeFor).toHaveBeenCalledWith("SELECT ?", "balanced");
  expect(routeFor).toHaveBeenCalledWith("UPDATE t SET x=?", "auto");
});

test("retries only when selection marks a failed query safe", async () => {
  const failure = new Error("temporary");
  const primary = { query: jest.fn().mockRejectedValue(failure), execute: jest.fn() };
  const balanced = { query: jest.fn(async () => ["retried"]) };
  const record = jest.fn();
  const execution = createQueryExecution({
    selection: () => ({ choose: () => primary, isSafeBalancedRetry: () => true }),
    timed,
    metrics: { record },
    getBalancedPool: () => balanced,
    routeFor: () => "balanced",
    routing: "auto",
  });
  await expect(execution.query("SELECT 1")).resolves.toEqual(["retried"]);
  expect(record).toHaveBeenCalledWith({ retry: true, route: "balanced" });
});

test("propagates failures when retry is unsafe and supports the legacy pool injection", async () => {
  const failure = new Error("unsafe");
  const pool = { query: jest.fn().mockRejectedValue(failure), execute: jest.fn() };
  const execution = createQueryExecution({
    selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => false }),
    timed,
    metrics: {},
    balancedPool: pool,
    routeFor: () => "primary",
    routing: "auto",
  });
  await expect(execution.query("UPDATE t SET x=1")).rejects.toBe(failure);
});

test("uses the legacy balancedPool fallback when no getter is supplied", async () => {
  const pool = {
    query: jest.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue(["retried"]),
    execute: jest.fn(),
  };
  const execution = createQueryExecution({
    selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => true }),
    timed,
    metrics: {},
    balancedPool: pool,
    routeFor: () => "balanced",
    routing: "auto",
  });
  await expect(execution.query("SELECT 1")).resolves.toEqual(["retried"]);
});

test("supports client retries and explicit connections", async () => {
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
    log: { warn: () => {} },
    mysqlLib,
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

test("forwards driver result tuples and parameters unchanged", async () => {
  const rows = [{ id: 1 }];
  const fields = [{ name: "id" }];
  const result = [{ affectedRows: 1 }, fields];
  const query = jest.fn(async () => [rows, fields]);
  const execute = jest.fn(async () => result);
  const { client } = await makeManagedClient({ query, execute });
  await expect(client.query("SELECT ?", [1])).resolves.toEqual([rows, fields]);
  await expect(client.execute("UPDATE t SET x=?", [2])).resolves.toBe(result);
  expect(query).toHaveBeenCalledWith("SELECT ?", [1]);
  expect(execute).toHaveBeenCalledWith("UPDATE t SET x=?", [2]);
  await client.end();
});

test("does not replay an unsafe write after a retryable failure", async () => {
  const failure = Object.assign(new Error("connection lost"), { code: "ECONNRESET" });
  const execute = jest.fn(async () => {
    throw failure;
  });
  const { client } = await makeManagedClient({ execute });
  await expect(client.execute("UPDATE accounts SET balance=?", [10])).rejects.toMatchObject({
    code: "ECONNRESET",
    retryable: true,
  });
  expect(execute).toHaveBeenCalledTimes(1);
  await client.end();
});
