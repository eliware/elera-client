import { expect, test } from "@jest/globals";
import { validateSslSetting } from "../../src/config/ssl-settings.mjs";

test.each([undefined, "required", {}, null])("accepts supported SSL settings %j", (ssl) => {
  expect(() => validateSslSetting(ssl)).not.toThrow();
});

test("rejects SSL settings that are neither strings nor objects", () => {
  expect(() => validateSslSetting(true, "primary")).toThrow(
    "primary.options.ssl must be an object or string",
  );
});
