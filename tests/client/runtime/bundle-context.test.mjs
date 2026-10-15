import { expect, jest, test } from "@jest/globals";
import { updateBundleMetricsContext } from "../../../src/client/runtime/bundle-context.mjs";

test("projects bundle identity into metrics context", () => {
  const setContext = jest.fn();
  updateBundleMetricsContext(
    { setContext },
    {
      application: "app",
      credentialName: "credential",
      database: "db",
      scopes: ["read"],
    },
  );
  expect(setContext).toHaveBeenCalledWith({
    application: "app",
    credentialName: "credential",
    database: "db",
    scopes: ["read"],
  });
});

test("does nothing when metrics are absent", () => {
  expect(() => updateBundleMetricsContext(undefined, {})).not.toThrow();
});
