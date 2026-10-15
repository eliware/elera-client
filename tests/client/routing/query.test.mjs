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
  const selection = () => ({ choose: () => primary, isSafeBalancedRetry: () => true });
  const query = createQuery({
    run: queryRunner(selection),
    metrics: { record },
    getBalancedPool: () => balanced,
  });
  await expect(query("SELECT 1")).resolves.toEqual(["retried"]);
  expect(record).toHaveBeenCalledWith({ retry: true, route: "balanced" });
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
