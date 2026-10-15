import { expect, jest, test } from "@jest/globals";
import {
  asSqlError,
  classifyError,
  ClusterUnavailableError,
  ServerUnavailableError,
  SqlClientError,
} from "../src/errors.mjs";
import { createDb } from "../src/client/create-db/index.mjs";
import { bundle, driver, profile } from "../test-fixtures/client/create-db.mjs";
import { makeManagedClient } from "../test-fixtures/client/managed.mjs";

test("classifies retryable and non-retryable SQL failures", () => {
  expect(classifyError({ code: "ECONNRESET" }).retryable).toBe(true);
  expect(classifyError({ code: "ER_ACCESS_DENIED_ERROR" }).retryable).toBe(false);
});

test("wraps errors without double wrapping", () => {
  const original = new Error("failed");
  const wrapped = asSqlError(original);
  expect(wrapped).toBeInstanceOf(SqlClientError);
  expect(asSqlError(wrapped)).toBe(wrapped);
});

test("uses the fallback message when an error has no message", () => {
  expect(asSqlError({ code: "ER_PARSE_ERROR" }, "fallback message")).toMatchObject({
    message: "fallback message",
    code: "ER_PARSE_ERROR",
  });
});

test("uses default error options and classifies an empty error", () => {
  expect(new SqlClientError("failure")).toMatchObject({
    code: "SQL_CLIENT_ERROR",
    retryable: false,
  });
  expect(new ClusterUnavailableError().code).toBe("CLUSTER_UNAVAILABLE");
  expect(new ServerUnavailableError().code).toBe("SERVER_UNAVAILABLE");
  expect(classifyError()).toEqual({ code: "SQL_ERROR", retryable: false });
  expect(asSqlError().message).toBe("SQL operation failed");
});

test("maps query failures while applying credential overlays", async () => {
  const failure = Object.assign(new Error("bad query"), { code: "ER_PARSE_ERROR" });
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    credentialProvider: async () => ({ user: "u", password: "p" }),
    mysqlLib: driver({
      query: jest.fn(async () => {
        throw failure;
      }),
    }),
  });
  await expect(client.query("SELECT 1", [], { route: "balanced" })).rejects.toThrow("bad query");
  await expect(
    client.refresh({ ...bundle, routes: { primary: [{ host: "new", port: 3306 }], balanced: [] } }),
  ).resolves.toMatchObject({ bundleVersion: 1 });
  await client.close();
});

test("preserves mysql2 SQL error properties without secret fields", async () => {
  const failure = Object.assign(new Error("syntax error"), {
    code: "ER_PARSE_ERROR",
    errno: 1064,
    sqlState: "42000",
    sqlMessage: "bad SQL",
    fatal: false,
  });
  const { client } = await makeManagedClient({
    execute: jest.fn(async () => {
      throw failure;
    }),
  });
  await expect(client.execute("BAD SQL")).rejects.toMatchObject({
    message: "syntax error",
    code: "ER_PARSE_ERROR",
    errno: 1064,
    sqlState: "42000",
    sqlMessage: "bad SQL",
    fatal: false,
  });
  await expect(client.execute("BAD SQL")).rejects.not.toHaveProperty("password");
  await client.end();
});
