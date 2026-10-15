import { expect, test } from "@jest/globals";
import { validateProfile, redactedProfile } from "../../../src/config.mjs";
import {
  resolveCredentials,
  credentialContext,
} from "../../../src/client/internal/credential-provider.mjs";
const valid = { host: "db", user: "u", password: "p", database: "app" };
test("validates profile defaults and values and redacts secret connection fields", () => {
  expect(validateProfile({ host: "db", database: "app" })).toMatchObject({
    port: 3306,
    options: { connectionLimit: 10 },
  });
  expect(redactedProfile({ host: "db", database: "app" })).toMatchObject({
    host: "db",
    database: "app",
    options: {},
  });
  const profile = validateProfile({ ...valid, options: { ssl: { key: "private", ca: "ca" } } });
  expect(profile.port).toBe(3306);
  expect(redactedProfile(profile)).toMatchObject({ host: "db", options: { ssl: { ca: "ca" } } });
  for (const value of [
    null,
    { ...valid, host: 1 },
    { ...valid, user: 1 },
    { ...valid, password: 1 },
    { ...valid, database: "" },
    { ...valid, port: 0 },
    { ...valid, options: { ssl: true } },
  ])
    expect(() => validateProfile(value)).toThrow();
});
test("resolves credential providers and creates request context", async () => {
  expect(await resolveCredentials(undefined, {})).toEqual({});
  await expect(resolveCredentials("bad", {})).rejects.toThrow();
  await expect(resolveCredentials(async () => null, {})).rejects.toThrow();
  await expect(resolveCredentials(async () => ({ user: "u" }), {})).rejects.toThrow();
  await expect(
    resolveCredentials(async (context) => ({ user: context.identity, password: "p" }), {
      identity: "id",
    }),
  ).resolves.toEqual({ user: "id", password: "p" });
  expect(credentialContext(valid, {})).toEqual({
    database: "app",
    identity: null,
    route: "primary",
  });
});
