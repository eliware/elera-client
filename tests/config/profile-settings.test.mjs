import { expect, test } from "@jest/globals";
import { normalizeProfileSettings } from "../../src/config/profile-settings.mjs";

test("applies defaults and converts numeric settings", () => {
  expect(normalizeProfileSettings({})).toEqual({
    port: 3306,
    options: { connectionLimit: 10, queueLimit: 0, connectTimeout: 10000, acquireTimeout: 10000 },
  });
  expect(
    normalizeProfileSettings({
      port: "3307",
      options: {
        connectionLimit: "20",
        queueLimit: "2",
        connectTimeout: "3000",
        acquireTimeout: "4000",
        ssl: "required",
      },
    }),
  ).toMatchObject({
    port: 3307,
    options: { connectionLimit: 20, queueLimit: 2, connectTimeout: 3000, acquireTimeout: 4000 },
  });
});

test.each([
  [{ port: 0 }],
  [{ port: 65536 }],
  [{ port: 1.5 }],
  [{ options: { connectionLimit: 0 } }],
  [{ options: { connectionLimit: 1001 } }],
  [{ options: { queueLimit: -1 } }],
  [{ options: { queueLimit: 1000001 } }],
  [{ options: { connectTimeout: 3600001 } }],
  [{ options: { acquireTimeout: 3600001 } }],
  [{ options: { ssl: true } }],
])("rejects invalid profile settings %j", (profile) => {
  expect(() => normalizeProfileSettings(profile)).toThrow();
});
