import { expect, test } from "@jest/globals";
import { createSetupBundleValidator } from "../../../src/client/create-db/setup-bundle.mjs";
import { bundle } from "../../../test-fixtures/client/create-db.mjs";

test("validates a shared routing bundle without a token context", () => {
  expect(createSetupBundleValidator()(bundle)).toMatchObject({
    application: "app",
    bundleVersion: 1,
  });
});

test("rejects malformed bundles and token-context mismatches", () => {
  const validate = createSetupBundleValidator({ application: "other" });
  expect(() => validate({})).toThrow();
  expect(() => validate(bundle)).toThrow();
});
