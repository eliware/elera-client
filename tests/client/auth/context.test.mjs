import { expect, test } from "@jest/globals";
import { credentialContext } from "../../../src/client/auth/context.mjs";

test("builds credential context from profile and options", () => {
  expect(credentialContext({ database: "app" }, {})).toEqual({
    database: "app",
    identity: null,
    route: "primary",
  });
  expect(credentialContext({ database: "app" }, { identity: "id", route: "balanced" })).toEqual({
    database: "app",
    identity: "id",
    route: "balanced",
  });
});
