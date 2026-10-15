import { expect, test } from "@jest/globals";
import { createNodePool, createRoutePool } from "../../src/pools/index.mjs";
import { driver, profile } from "../../test-fixtures/pools/node.mjs";

test("exports the node and route pool factories", async () => {
  const node = createNodePool({ profile, mysqlLib: driver() });
  const routes = createRoutePool([node]);
  expect(routes.choose()).toBe(node);
  await routes.close();
});
