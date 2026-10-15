import { expect, jest, test } from "@jest/globals";
import { createExecute } from "../../../src/client/routing/execute.mjs";

test("dispatches prepared statements through the selected pool", async () => {
  const pool = { execute: jest.fn(async (sql, values) => [sql, values]) };
  const run = (_sql, _options, operation) => operation({ choose: () => pool });
  const execute = createExecute({ run });
  await expect(execute("UPDATE t SET x=?", [2])).resolves.toEqual(["UPDATE t SET x=?", [2]]);
  expect(pool.execute).toHaveBeenCalledWith("UPDATE t SET x=?", [2]);
});
