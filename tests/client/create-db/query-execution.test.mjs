import { expect, jest, test } from "@jest/globals";
import { createQueryExecution } from "../../../src/client/create-db/query-execution.mjs";

const timed = async (operation, metadata) => operation(metadata);

test("executes a prepared statement with the selected route metadata", async () => {
  const pool = {
    execute: jest.fn(async (sql, values) => [sql, values]),
  };
  const routeFor = jest.fn(() => "balanced");
  const execution = createQueryExecution({
    selection: () => ({ choose: () => pool }),
    timed,
    metrics: {},
    routeFor,
    routing: "auto",
  });
  await expect(execution.execute("UPDATE t SET x=?", [2])).resolves.toEqual([
    "UPDATE t SET x=?",
    [2],
  ]);
  expect(routeFor).toHaveBeenCalledWith("UPDATE t SET x=?", "auto");
});
