import "../../../test-fixtures/silence-default-logger.mjs";
import { expect, jest, test } from "@jest/globals";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { createDbSetup } from "../../../src/client/runtime/setup.mjs";
import { driver, profile, bundle } from "../../../test-fixtures/client/runtime.mjs";

test("rejects missing and invalid primary profiles", async () => {
  await expect(createDbSetup()).rejects.toThrow("primary connection profile");
  await expect(createDb()).rejects.toThrow("primary connection profile");
  await expect(createDb({ primary: { ...profile, user: "" }, mysqlLib: driver() })).rejects.toThrow(
    "primary.user",
  );
});

test("rejects an expired initial bundle", async () => {
  await expect(
    createDb({
      primary: profile,
      bundle: { ...bundle, expiresAt: new Date(0).toISOString() },
      mysqlLib: driver(),
    }),
  ).rejects.toThrow("future");
});

test("rejects an expired bundle refresh", async () => {
  const client = await createDb({ primary: profile, mysqlLib: driver() });
  await expect(client.refresh({ ...bundle, expiresAt: new Date(0).toISOString() })).rejects.toThrow(
    "future",
  );
  await client.close();
});

test("creates routes and uses the default clock for node availability", async () => {
  const setup = await createDbSetup({ primary: profile, mysqlLib: driver() });
  expect(setup.makeRoute("primary", profile).nodes).toHaveLength(1);
  expect(setup.getPrimaryPool().nodes[0].available).toBe(true);
});

test("passes the configured clock to setup", async () => {
  const now = jest.fn(() => 123);
  const setup = await createDbSetup({ primary: profile, mysqlLib: driver(), now });
  expect(setup.now()).toBe(123);
  expect(now).toHaveBeenCalledTimes(1);
});

test("passes balanced routing to the credential provider", async () => {
  const credentialProvider = jest.fn(async () => ({ user: "u", password: "p" }));
  await createDbSetup({
    primary: { ...profile, user: undefined, password: undefined },
    credentialProvider,
    routing: "balanced",
    mysqlLib: driver(),
  });
  expect(credentialProvider.mock.calls[0][0]).toMatchObject({ route: "balanced" });
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
