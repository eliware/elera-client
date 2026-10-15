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
