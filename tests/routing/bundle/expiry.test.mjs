import { expect, test } from "@jest/globals";
import { bundleExpired, bundleNeedsRefresh } from "../../../src/routing/bundle/expiry.mjs";

const valid = { expiresAt: "2030-01-01T00:00:00Z" };
test("detects expiration and refresh deadlines", () => {
  expect(bundleExpired({ expiresAt: "2000-01-01T00:00:00Z" })).toBe(true);
  expect(bundleNeedsRefresh({ expiresAt: "2099-01-01T00:00:00Z" })).toBe(false);
  expect(bundleExpired(valid, 0)).toBe(false);
  expect(
    bundleExpired({ expiresAt: "2000-01-01T00:00:00Z" }, Date.parse("2030-01-01T00:00:00Z")),
  ).toBe(true);
  expect(bundleNeedsRefresh(valid, 0)).toBe(false);
  expect(
    bundleNeedsRefresh(
      { ...valid, refreshAfter: "2000-01-01T00:00:00Z" },
      Date.parse("2030-01-01T00:00:00Z"),
    ),
  ).toBe(true);
});
