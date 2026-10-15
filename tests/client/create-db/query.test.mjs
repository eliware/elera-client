import { expect, jest, test } from "@jest/globals";
import { createQuery } from "../../../src/client/create-db/query.mjs";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

const timed = async (operation, metadata) => operation(metadata);

test("retries only when selection marks a failed query safe", async () => {
  const failure = new Error("temporary");
  const primary = { query: jest.fn().mockRejectedValue(failure) };
  const balanced = { query: jest.fn(async () => ["retried"]) };
  const record = jest.fn();
  const query = createQuery({
    selection: () => ({ choose: () => primary, isSafeBalancedRetry: () => true }),
    timed,
    metrics: { record },
    getBalancedPool: () => balanced,
    routeFor: () => "balanced",
    routing: "auto",
  });
  await expect(query("SELECT 1")).resolves.toEqual(["retried"]);
  expect(record).toHaveBeenCalledWith({ retry: true, route: "balanced" });
});

test("propagates failures when retry is unsafe", async () => {
  const failure = new Error("unsafe");
  const pool = { query: jest.fn().mockRejectedValue(failure) };
  const query = createQuery({
    selection: () => ({ choose: () => pool, isSafeBalancedRetry: () => false }),
    timed,
    metrics: {},
    getBalancedPool: () => pool,
    routeFor: () => "primary",
    routing: "auto",
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
