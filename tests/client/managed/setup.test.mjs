import { expect, jest, test } from "@jest/globals";
import { createManagedSetup } from "../../../src/client/managed/setup.mjs";

test("fetches the bundle and creates its token context", async () => {
  const bundle = {
    application: "app",
    database: "db",
    credentialName: "credential",
    identity: "identity",
    scopes: ["read"],
  };
  const fetchBundle = jest.fn(async () => bundle);
  await expect(createManagedSetup(fetchBundle)).resolves.toEqual({
    bundle,
    tokenContext: {
      application: "app",
      database: "db",
      credentialName: "credential",
      identity: "identity",
      scopes: ["read"],
    },
  });
  expect(fetchBundle).toHaveBeenCalledTimes(1);
});

test("passes bundle fetch errors to the caller", async () => {
  const failure = new Error("bundle failed");
  await expect(
    createManagedSetup(async () => {
      throw failure;
    }),
  ).rejects.toBe(failure);
});
