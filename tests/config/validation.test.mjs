import { expect, test } from "@jest/globals";
import { validateProfile } from "../../src/config/validation.mjs";

test("validates required fields and normalizes profile settings", () => {
  expect(
    validateProfile({
      host: "db",
      user: "u",
      password: "p",
      database: "app",
      port: "3307",
      options: { connectionLimit: "20", custom: true },
    }),
  ).toEqual({
    host: "db",
    user: "u",
    password: "p",
    database: "app",
    port: 3307,
    options: {
      connectionLimit: 20,
      custom: true,
      queueLimit: 0,
      connectTimeout: 10000,
      acquireTimeout: 10000,
    },
  });
});

test("rejects missing profiles and invalid field types", () => {
  const valid = { host: "db", user: "u", password: "p", database: "app" };
  for (const profile of [
    undefined,
    null,
    { ...valid, host: 1 },
    { ...valid, user: 1 },
    { ...valid, password: 1 },
    { ...valid, database: "" },
  ])
    expect(() => validateProfile(profile)).toThrow();
});
