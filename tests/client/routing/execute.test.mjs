import { expect, jest, test } from "@jest/globals";
import { createExecute } from "../../../src/client/routing/execute.mjs";
import { createQueryExecution } from "../../../src/client/routing/query-execution.mjs";

test("dispatches prepared statements through the selected pool", async () => {
  const pool = { execute: jest.fn(async (sql, values) => [sql, values]) };
  const run = (_sql, _options, operation) => operation({ choose: () => pool });
  const execute = createExecute({ run });
  await expect(execute("UPDATE t SET x=?", [2])).resolves.toEqual(["UPDATE t SET x=?", [2]]);
  expect(pool.execute).toHaveBeenCalledWith("UPDATE t SET x=?", [2]);
});

test("logs the execute operation with its selected route", async () => {
  const log = { silly: jest.fn(), verbose: jest.fn() };
  const pool = { execute: jest.fn(async () => ["result"]) };
  const execute = createExecute({
    run: createQueryExecution({
      selection: () => ({ choose: () => pool }),
      timed: (operation) => operation(),
      routeFor: () => "primary",
      routing: "auto",
      log,
    }),
  });
  await expect(execute("UPDATE t SET x=?", [1])).resolves.toEqual(["result"]);
  expect(log.verbose).toHaveBeenCalledWith("SQL operation completed", {
    operation: "sql.execute",
    outcome: "success",
    route: "primary",
  });
});
