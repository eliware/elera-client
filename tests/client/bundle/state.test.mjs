import { expect, test } from "@jest/globals";
import { bundlesHaveEquivalentPools, hasUsablePool } from "../../../src/client/bundle/state.mjs";

test("compares bundle pools and usability", () => {
  const bundle = {
    bundleVersion: "1",
    physicalDatabase: "db",
    credentials: {},
    writer: {},
    routes: [],
  };
  expect(bundlesHaveEquivalentPools(bundle, { ...bundle })).toBe(true);
  expect(hasUsablePool({ nodes: [{ available: true }] })).toBe(true);
});
