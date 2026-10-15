import { expect, test } from "@jest/globals";
import { profilesFromBundle } from "../../../src/client/bundle/profiles-from-bundle.mjs";
import { bundle } from "../../../test-fixtures/client/runtime.mjs";

test("derives generic SQL profiles from a routing bundle", () => {
  expect(profilesFromBundle(bundle)).toMatchObject({
    primary: { host: "db", user: "u", database: "physical_app" },
    balanced: { host: "read", database: "physical_app" },
  });
});

test("allows bundles without a balanced route", () => {
  expect(
    profilesFromBundle({
      ...bundle,
      readers: [],
      routes: { primary: [{ host: "writer", port: 3306 }], balanced: [] },
    }).balanced,
  ).toBeUndefined();
});

test("rejects invalid credentials and route arrays", () => {
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
