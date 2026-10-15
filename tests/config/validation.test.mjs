import { expect, test } from "@jest/globals";
import { validateProfile } from "../../src/config/validation.mjs";

test("validates profile defaults and numeric bounds", () => {
  expect(validateProfile({ host: "db", database: "app" }).options).toMatchObject({
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    acquireTimeout: 10000,
  });
  expect(() => validateProfile({ host: "db", database: "app", port: 65536 })).toThrow();
  expect(() => validateProfile({ host: "db", database: "app", options: { ssl: true } })).toThrow();
});
