import { expect, test } from "@jest/globals";
import {
  asSqlError,
  classifyError,
  ClusterUnavailableError,
  ServerUnavailableError,
  SqlClientError,
} from "../src/errors.mjs";

test("classifies retryable and non-retryable SQL failures", () => {
  expect(classifyError({ code: "ECONNRESET" }).retryable).toBe(true);
  expect(classifyError({ code: "ER_ACCESS_DENIED_ERROR" }).retryable).toBe(false);
  expect(classifyError({ code: "ER_ACCESS_DENIED_ERROR" }).code).toBe("AUTHENTICATION_ERROR");
  expect(classifyError({ code: "OTHER" }).code).toBe("OTHER");
  expect(classifyError({}).code).toBe("SQL_ERROR");
});

test("wraps errors without double wrapping", () => {
  const original = new Error("failed");
  const wrapped = asSqlError(original);
  expect(wrapped).toBeInstanceOf(SqlClientError);
  expect(asSqlError(wrapped)).toBe(wrapped);
  const driverError = Object.assign(new Error("syntax error"), {
    code: "ER_PARSE_ERROR",
    errno: 1064,
    sqlState: "42000",
    sqlMessage: "bad SQL",
    fatal: false,
    password: "secret",
  });
  const sqlError = asSqlError(driverError);
  expect(sqlError).toMatchObject({
    message: "syntax error",
    code: "ER_PARSE_ERROR",
    errno: 1064,
    sqlState: "42000",
    sqlMessage: "bad SQL",
    fatal: false,
  });
  expect(sqlError).not.toHaveProperty("password");
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
