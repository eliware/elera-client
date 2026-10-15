import { expect, test } from "@jest/globals";
import { compareBundleVersions, isOlderBundle } from "../../../src/routing/bundle/version.mjs";
test("compares numeric, dotted, textual, and missing versions", () => {
  expect(compareBundleVersions(2, 1)).toBeGreaterThan(0);
  expect(compareBundleVersions("1.2", "1.10")).toBeLessThan(0);
  expect(compareBundleVersions("release", "candidate")).toBeGreaterThan(0);
  expect(compareBundleVersions("1", "1.0.1")).toBeLessThan(0);
  expect(compareBundleVersions("1.0.1", "1")).toBeGreaterThan(0);
  expect(compareBundleVersions("1.0", "1")).toBe(0);
  expect(compareBundleVersions(undefined, 1)).toBe(0);
  expect(isOlderBundle("1.0.0", "2.0.0")).toBe(true);
  expect(isOlderBundle("2.0.0", "1.0.0")).toBe(false);
});
