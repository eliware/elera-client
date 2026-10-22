import { expect, jest, test } from "@jest/globals";
import { createQuery } from "../../../src/client/routing/query.mjs";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/runtime.mjs";

function queryRunner(selection) {
  return (sql, options, operation) => operation(selection(), sql, options);
}

test("retries only when selection marks a failed query safe", async () => {
  const failure = new Error("temporary");
  const primary = { query: jest.fn().mockRejectedValue(failure) };
  const balanced = { query: jest.fn(async () => ["retried"]) };
  const record = jest.fn();
  const balancedSelection = jest.fn(() => balanced);
  const selection = () => ({
    choose: (_sql, options) => (options?.route === "balanced" ? balancedSelection() : primary),
    isSafeBalancedRetry: () => true,
  });
  const query = createQuery({
    run: queryRunner(selection),
    metrics: { record },
    getBalancedPool: () => balanced,
  });
  await expect(query("SELECT 1")).resolves.toEqual(["retried"]);
  expect(record).toHaveBeenCalledWith({ retry: true, route: "balanced" });
  expect(balancedSelection).toHaveBeenCalledTimes(1);
});

test("retries a balanced read on a different node", async () => {
  const failure = new Error("temporary");
  const first = { query: jest.fn().mockRejectedValue(failure) };
  const second = { query: jest.fn(async () => ["retried"]) };
  const chooseNode = jest.fn((excluded = []) => (excluded.includes(first) ? second : first));
  const pool = { choose: chooseNode };
  const query = createQuery({
    run: queryRunner(() => ({ choose: () => pool, isSafeBalancedRetry: () => true })),
    metrics: {},
  });
  await expect(query("SELECT 1", [], { route: "balanced" })).resolves.toEqual(["retried"]);
  expect(chooseNode).toHaveBeenNthCalledWith(1);
  expect(chooseNode).toHaveBeenNthCalledWith(2, [first]);
  expect(first.query).toHaveBeenCalledTimes(1);
  expect(second.query).toHaveBeenCalledTimes(1);
});

test("propagates failures when retry is unsafe", async () => {
  const failure = new Error("unsafe");
  const pool = { query: jest.fn().mockRejectedValue(failure) };
  const selection = () => ({ choose: () => pool, isSafeBalancedRetry: () => false });
  const query = createQuery({
    run: queryRunner(selection),
    metrics: {},
    getBalancedPool: () => pool,
  });
  await expect(query("UPDATE t SET x=1")).rejects.toBe(failure);
});

test("does not retry an uncertain write on another node", async () => {
  const failure = Object.assign(new Error("connection lost"), { code: "ECONNRESET" });
  const runQuery = jest.fn().mockRejectedValue(failure);
  const client = await createDb({
    primary: profile,
    bundle,
    mysqlLib: driver({ query: runQuery, execute: runQuery }),
    log: { warn: () => {} },
  });
  await expect(client.query("UPDATE app SET x=1")).rejects.toThrow("connection lost");
  expect(runQuery).toHaveBeenCalledTimes(1);
  await client.close();
});

test("retries safe reads and honors explicit connections through the client", async () => {
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
  expect(explicit.query).toHaveBeenCalledWith("SELECT 1", []);
  expect(explicit.execute).toHaveBeenCalledWith("SELECT 1", []);
  await client.close();
});
