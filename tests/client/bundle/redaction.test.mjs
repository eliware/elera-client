import { expect, test } from "@jest/globals";
import { redactBundle } from "../../../src/client/bundle/redaction.mjs";

test("removes credentials and preserves other bundle fields", () => {
  expect(redactBundle({ credentials: { token: "secret" }, nodes: ["a"] })).toEqual({
    nodes: ["a"],
  });
});

test("returns an absent bundle unchanged", () => {
  expect(redactBundle()).toBeUndefined();
});
