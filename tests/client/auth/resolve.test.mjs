import { expect, test } from "@jest/globals";
import { resolveCredentials } from "../../../src/client/auth/resolve.mjs";
test("resolves credential providers", async () => {
  expect(await resolveCredentials(undefined, {})).toEqual({});
  await expect(resolveCredentials("bad", {})).rejects.toThrow();
  await expect(resolveCredentials(async () => null, {})).rejects.toThrow();
  await expect(resolveCredentials(async () => ({ user: "u" }), {})).rejects.toThrow();
  await expect(
    resolveCredentials(async (context) => ({ user: context.identity, password: "p" }), {
      identity: "id",
    }),
  ).resolves.toEqual({ user: "id", password: "p" });
});
