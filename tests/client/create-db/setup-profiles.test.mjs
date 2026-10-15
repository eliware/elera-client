import { expect, test } from "@jest/globals";
import { prepareDbProfiles } from "../../../src/client/create-db/setup-profiles.mjs";
import { profile } from "../../../test-fixtures/client/create-db.mjs";

test("validates primary profile defaults when no credential provider is set", async () => {
  const result = await prepareDbProfiles({ primary: profile });
  expect(result.primaryConfig).toMatchObject({ host: "db", port: 3306, user: "u" });
  expect(result.balancedConfig).toBeUndefined();
  expect(result.credentials).toEqual({});
});

test("applies credential overlays to primary and balanced profiles", async () => {
  const result = await prepareDbProfiles({
    primary: { ...profile, user: undefined, password: undefined },
    balanced: { host: "read", port: 3307 },
    credentialProvider: async () => ({ user: "service", password: "secret" }),
    identity: "worker",
  });
  expect(result.primaryConfig).toMatchObject({ user: "service", password: "secret" });
  expect(result.balancedConfig).toMatchObject({ host: "read", port: 3307, user: "service" });
});

test("rejects missing and incomplete primary profiles", async () => {
  await expect(prepareDbProfiles()).rejects.toThrow("primary connection profile");
  await expect(prepareDbProfiles({ primary: { ...profile, password: undefined } })).rejects.toThrow(
    "primary.user and primary.password are required",
  );
});
