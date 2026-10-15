import { createDbFromBundle, profilesFromBundle } from "../../src/client/from-bundle.mjs";
import { expect, test } from "@jest/globals";
import { bundle } from "../../test-fixtures/client/create-db.mjs";
test("derives generic SQL profiles from a routing bundle", () => {
  expect(profilesFromBundle(bundle)).toMatchObject({
    primary: { host: "db", user: "u", database: "physical_app" },
    balanced: { host: "read", database: "physical_app" },
  });
});
test("creates a client from only a validated bundle", async () => {
  const client = await createDbFromBundle({
    bundle,
    createClient: async (options) => ({
      options,
      bundle: () => options.bundle,
      close: async () => {},
    }),
  });
  expect(client.bundle()).toBe(bundle);
  await client.close();
});
test("requires strict route arrays and rejects invalid bundles", () => {
  expect(
    profilesFromBundle({
      ...bundle,
      readers: [],
      routes: { primary: [{ host: "writer", port: 3306 }], balanced: [] },
    }).balanced,
  ).toBeUndefined();
  expect(() =>
    profilesFromBundle({
      ...bundle,
      credentials: undefined,
      routes: { primary: [{ host: "writer", port: 3306 }], balanced: [] },
    }),
  ).toThrow("credentials");
  expect(() =>
    profilesFromBundle({ ...bundle, routes: { primary: bundle.routes.primary } }),
  ).toThrow("balanced");
  expect(() => profilesFromBundle({})).toThrow();
});
test("rejects bundles where the balanced route property is absent", () => {
  const { balanced: _balanced, ...routes } = bundle.routes;
  expect(() => profilesFromBundle({ ...bundle, readers: [], routes })).toThrow("balanced");
});
test("can construct the default SQL client factory", async () => {
  const client = await createDbFromBundle({
    bundle,
    mysqlLib: {
      createPool: () => ({
        query: async () => [[]],
        execute: async () => [[]],
        getConnection: async () => ({}),
        end: async () => {},
      }),
    },
    log: {},
  });
  await client.close();
});
test("rejects an omitted bundle before selecting a client factory", async () => {
  await expect(createDbFromBundle()).rejects.toThrow();
});
