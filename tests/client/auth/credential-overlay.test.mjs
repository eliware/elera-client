import { expect, test } from "@jest/globals";
import { revalidateCredentialOverlay } from "../../../src/client/auth/credential-overlay.mjs";
import { profile } from "../../../test-fixtures/client/runtime.mjs";

test("applies credentials to primary and balanced profiles", () => {
  const primary = { ...profile, user: "old" };
  const balanced = { ...profile, host: "read", user: "old" };
  const result = revalidateCredentialOverlay({
    primaryConfig: primary,
    balancedConfig: balanced,
    credentials: { user: "service", password: "secret" },
  });
  expect(result.primaryConfig).toMatchObject({ host: "db", user: "service", password: "secret" });
  expect(result.balancedConfig).toMatchObject({
    host: "read",
    user: "service",
    password: "secret",
  });
});

test("does not create a balanced profile when none exists", () => {
  const result = revalidateCredentialOverlay({
    primaryConfig: profile,
    balancedConfig: undefined,
    credentials: { user: "service", password: "secret" },
  });
  expect(result.balancedConfig).toBeUndefined();
});
