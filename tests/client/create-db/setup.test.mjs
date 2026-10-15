import { expect, jest, test } from "@jest/globals";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { createDbSetup } from "../../../src/client/create-db/setup.mjs";
import { driver, profile, bundle } from "../../../test-fixtures/client/create-db.mjs";

test("rejects invalid setup and expired bundles", async () => {
  await expect(createDbSetup()).rejects.toThrow("primary connection profile");
  await expect(createDb()).rejects.toThrow("primary connection profile");
  await expect(createDb({ primary: { ...profile, user: "" }, mysqlLib: driver() })).rejects.toThrow(
    "primary.user",
  );
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await expect(
    createDb({
      primary: profile,
      bundle: { ...bundle, expiresAt: new Date(0).toISOString() },
      mysqlLib: driver(),
    }),
  ).rejects.toThrow("future");
  await expect(client.refresh({ ...bundle, expiresAt: new Date(0).toISOString() })).rejects.toThrow(
    "future",
  );
  await client.close();
});

test("enforces the single-token database context on refresh", async () => {
  const scopedBundle = {
    ...bundle,
    application: "billing",
    credentialName: "core-writer",
    identity: "client-1",
    scopes: ["read", "write"],
  };
  const client = await createDb({
    primary: profile,
    bundle: scopedBundle,
    tokenContext: {
      application: "billing",
      database: "app",
      credentialName: "core-writer",
      identity: "client-1",
      scopes: ["read"],
    },
    mysqlLib: driver(),
  });
  await expect(client.refresh({ ...scopedBundle, database: "other" })).rejects.toThrow("database");
  await client.close();
});

test("applies credential overlays to query errors", async () => {
  const failure = Object.assign(new Error("bad query"), { code: "ER_PARSE_ERROR" });
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    credentialProvider: async () => ({ user: "u", password: "p" }),
    mysqlLib: driver({
      query: jest.fn(async () => {
        throw failure;
      }),
    }),
  });
  await expect(client.query("SELECT 1", [], { route: "balanced" })).rejects.toThrow("bad query");
  await client.close();
});
