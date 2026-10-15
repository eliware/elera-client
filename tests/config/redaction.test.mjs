import { expect, test } from "@jest/globals";
import { redactedProfile } from "../../src/config/redaction.mjs";

test("removes passwords and private SSL options from a copied profile", () => {
  const profile = {
    host: "db",
    password: "secret",
    options: { ssl: { ca: "public-ca", key: "private-key", passphrase: "secret" } },
  };
  const safe = redactedProfile(profile);
  expect(safe).not.toHaveProperty("password");
  expect(safe.options.ssl).toEqual({ ca: "public-ca" });
  expect(profile.options.ssl.key).toBe("private-key");
  expect(redactedProfile({ host: "db" })).toEqual({ host: "db", options: {} });
});
