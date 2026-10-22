import { expect, jest, test } from "@jest/globals";
import { createQueryExecution } from "../../../src/client/routing/query-execution.mjs";

test("selects a route and times the operation with its metadata", async () => {
  const selected = { choose: jest.fn(() => "pool") };
  const selection = jest.fn(() => selected);
  const routeFor = jest.fn(() => "balanced");
  const timed = jest.fn(async (operation, metadata) => operation(metadata));
  const run = createQueryExecution({ selection, timed, routeFor, routing: "auto" });
  const operation = jest.fn(async (chosen, sql, options) => [chosen, sql, options]);
  await expect(run("SELECT ?", { route: "balanced" }, operation)).resolves.toEqual([
    selected,
    "SELECT ?",
    { route: "balanced" },
  ]);
  expect(routeFor).toHaveBeenCalledWith("SELECT ?", "balanced");
  expect(timed).toHaveBeenCalledWith(expect.any(Function), { route: "balanced" });
  expect(selection).toHaveBeenCalledTimes(1);
});

test("does not report a pool route for an explicit connection", async () => {
  const connection = { query: jest.fn() };
  const selection = jest.fn(() => ({ choose: () => connection }));
  const routeFor = jest.fn(() => "balanced");
  const timed = jest.fn(async (operation, metadata) => operation(metadata));
  const run = createQueryExecution({ selection, timed, routeFor, routing: "auto" });

  await run("SELECT 1", { connection }, async () => "ok");

  expect(timed).toHaveBeenCalledWith(expect.any(Function), {});
});

test("logs safe operation context after a query succeeds", async () => {
  const log = { error: jest.fn(), verbose: jest.fn(), silly: jest.fn() };
  const run = createQueryExecution({
    selection: () => ({ choose: () => "pool" }),
    timed: async (operation) => operation(),
    routeFor: () => "balanced",
    routing: "auto",
    log,
  });
  await expect(run("SELECT ?", { values: ["private-value"] }, async () => "rows")).resolves.toBe(
    "rows",
  );
  expect(log.silly).toHaveBeenCalledWith("SQL route selected", {
    operation: "sql.query.route_select",
    route: "balanced",
  });
  expect(log.verbose).toHaveBeenCalledWith("SQL operation completed", {
    operation: "sql.query",
    outcome: "success",
    route: "balanced",
  });
  expect(JSON.stringify([log.silly.mock.calls, log.verbose.mock.calls])).not.toContain(
    "private-value",
  );
});

test("logs a safe error code when a query fails", async () => {
  const failure = Object.assign(new Error("private-value"), { code: "ER_QUERY_FAILED" });
  const log = { error: jest.fn() };
  const run = createQueryExecution({
    selection: () => ({ choose: () => "pool" }),
    timed: async (operation) => operation(),
    routeFor: () => "primary",
    routing: "auto",
    log,
  });
  await expect(
    run("UPDATE users SET secret = ?", {}, async () => Promise.reject(failure)),
  ).rejects.toBe(failure);
  expect(log.error).toHaveBeenCalledWith("SQL operation failed", {
    operation: "sql.query",
    outcome: "failure",
    route: "primary",
    errorCode: "ER_QUERY_FAILED",
  });
  expect(JSON.stringify(log.error.mock.calls)).not.toContain("private-value");
  expect(JSON.stringify(log.error.mock.calls)).not.toContain("UPDATE users");
});
