import { expect, test } from "@jest/globals";
import { validateBundle, validateRoutingEvent } from "../../../src/routing/bundle/validation.mjs";
import { bundle } from "../../../test-fixtures/client/runtime.mjs";

test("validates shared bundles and routing events from the published library", () => {
  expect(validateBundle(bundle)).toBeTruthy();
  expect(
    validateRoutingEvent({
      type: "routing.recovery",
      version: 1,
      generatedAt: "2099-01-01T00:00:00Z",
      node: "writer",
      context: {},
    }),
  ).toMatchObject({ type: "routing.recovery" });
});

test("shared bundle validation rejects invalid ports and missing route arrays", () => {
  expect(() => validateBundle({ ...bundle, ports: { sql: "3306", http: 8080 } })).toThrow();
  expect(() => validateBundle({ ...bundle, routes: { primary: bundle.routes.primary } })).toThrow();
});
