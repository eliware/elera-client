import { expect, test } from "@jest/globals";
import {
  bundlesHaveEquivalentPools,
  hasUsablePool,
  isOlderBundle,
  redactBundle,
} from "../../../src/client/create-db/bundle-state.mjs";

test("compares bundle versions and pool state", () => {
  expect(isOlderBundle("1.0.0", "2.0.0")).toBe(true);
  const bundle = {
    bundleVersion: "1",
    physicalDatabase: "db",
    credentials: {},
    writer: {},
    routes: [],
  };
  expect(bundlesHaveEquivalentPools(bundle, { ...bundle })).toBe(true);
  expect(hasUsablePool({ nodes: [{ available: true }] })).toBe(true);
  expect(redactBundle(bundle)).not.toHaveProperty("credentials");
  expect(redactBundle()).toBeUndefined();
});
