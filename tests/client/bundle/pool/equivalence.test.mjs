import { expect, test } from "@jest/globals";
import { bundlesHaveEquivalentPools } from "../../../../src/client/bundle/pool/equivalence.mjs";

test("matches equivalent bundle pool configuration", () => {
  const bundle = {
    bundleVersion: 1,
    physicalDatabase: "db",
    credentials: {},
    writer: {},
    routes: [],
  };
  expect(bundlesHaveEquivalentPools(bundle, { ...bundle })).toBe(true);
});

test("rejects missing or different bundle pool configuration", () => {
  const current = {
    bundleVersion: 1,
    physicalDatabase: "db",
    credentials: {},
    writer: {},
    routes: [],
  };
  expect(bundlesHaveEquivalentPools(current, undefined)).toBeFalsy();
  expect(bundlesHaveEquivalentPools({ ...current, bundleVersion: 2 }, current)).toBe(false);
  expect(bundlesHaveEquivalentPools({ ...current, physicalDatabase: "other" }, current)).toBe(
    false,
  );
  expect(bundlesHaveEquivalentPools({ ...current, expiresAt: "later" }, current)).toBe(false);
});
