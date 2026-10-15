import { expect, jest, test } from "@jest/globals";
import { createDbExecution } from "../../../src/client/runtime/execution.mjs";

test("assembles query and execute methods with shared route timing", async () => {
  const pool = {
    query: jest.fn(async () => ["rows"]),
    execute: jest.fn(async () => ["result"]),
  };
  const selection = jest.fn(() => ({ choose: () => pool }));
  const timed = async (operation, metadata) => operation(metadata);
  const execution = createDbExecution({
    metrics: undefined,
    getBalancedPool: () => pool,
    selection,
    timed,
    routing: "auto",
  });

  await expect(execution.query("SELECT 1")).resolves.toEqual(["rows"]);
  await expect(execution.execute("UPDATE t SET x = 1")).resolves.toEqual(["result"]);
  expect(selection).toHaveBeenCalledTimes(2);
});
