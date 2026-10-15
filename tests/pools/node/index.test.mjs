import { expect, test, jest } from "@jest/globals";
import { createNodePool } from "../../../src/pools/node/index.mjs";
import { driver, profile } from "../../../test-fixtures/pools/node.mjs";

test("node pool exposes connections, health, and close", async () => {
  const node = createNodePool({ profile, mysqlLib: driver(), log: { warn: jest.fn() } });
  const acquired = await node.getConnection();
  acquired.release();
  acquired.release();
  await expect(node.health()).resolves.toMatchObject({ ok: true, host: "db" });
  await node.close();
});
