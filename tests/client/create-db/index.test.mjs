import { expect, test, jest } from "@jest/globals";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { driver, profile } from "../../../test-fixtures/client/create-db.mjs";

test("creates a client and routes reads, writes, transactions, health, and close", async () => {
  const log = { debug: jest.fn() };
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    mysqlLib: driver(),
    log,
  });
  await client.query("SELECT 1");
  await client.query("SELECT 1", [], { route: "balanced" });
  await client.execute("UPDATE app SET x=1");
  await client.transaction(async (tx) => {
    await tx.query("SELECT 1");
    await tx.execute("UPDATE app SET x=1");
  });
  await expect(client.health()).resolves.toMatchObject({ ok: true, route: "primary" });
  await expect(client.health("balanced")).resolves.toMatchObject({ ok: true, route: "balanced" });
  expect(log.debug).toHaveBeenCalled();
  expect(client.bundle()).toBeUndefined();
  await expect(client.attachRoutingStream()).rejects.toThrow("routing stream is required");
  await client.end();
});
