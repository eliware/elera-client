import { expect, test, jest } from "@jest/globals";
import { createPoolOperations } from "../../../src/pools/route/operations.mjs";

test("delegates query and execute to the selected node", async () => {
  const node = {
    query: jest.fn().mockResolvedValue(["rows"]),
    execute: jest.fn().mockResolvedValue(["result"]),
  };
  const operations = createPoolOperations(() => node);
  await expect(operations.query("SELECT 1", [1])).resolves.toEqual(["rows"]);
  await expect(operations.execute("SELECT ?", [1])).resolves.toEqual(["result"]);
  expect(node.query).toHaveBeenCalledWith("SELECT 1", [1]);
  expect(node.execute).toHaveBeenCalledWith("SELECT ?", [1]);
});
