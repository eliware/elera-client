import { expect, test } from "@jest/globals";
import { hasUsablePool } from "../../../../src/client/bundle/pool/usability.mjs";

test("detects pools with available nodes", () => {
  expect(hasUsablePool({ nodes: [{ available: true }] })).toBe(true);
  expect(hasUsablePool({ nodes: [{ available: false }] })).toBe(false);
});

test("handles absent pools and node lists", () => {
  expect(hasUsablePool(undefined)).toBeUndefined();
  expect(hasUsablePool({ nodes: [] })).toBe(false);
  expect(hasUsablePool({})).toBeUndefined();
});
