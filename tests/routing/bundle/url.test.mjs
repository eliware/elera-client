import { expect, test } from "@jest/globals";
import { buildBundleUrl, DEFAULT_BUNDLE_PATH } from "../../../src/routing/bundle/url.mjs";

test("builds the default bundle URL from an endpoint with or without a trailing slash", () => {
  expect(DEFAULT_BUNDLE_PATH).toBe("/api/v1/routing/bundle");
  expect(buildBundleUrl("https://elera.example.test")).toBe(
    "https://elera.example.test/api/v1/routing/bundle",
  );
  expect(buildBundleUrl("https://elera.example.test/")).toBe(
    "https://elera.example.test/api/v1/routing/bundle",
  );
});

test("builds a custom bundle URL", () => {
  expect(buildBundleUrl("https://elera.example.test/", "/custom")).toBe(
    "https://elera.example.test/custom",
  );
});

test("requires an endpoint", () => {
  expect(() => buildBundleUrl()).toThrow("endpoint");
});
