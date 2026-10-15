import { expect, test } from "@jest/globals";
import { classifyEventVersion } from "../../../src/routing/stream/version-classification.mjs";

test("classifies stale, adjacent, and unversioned events", () => {
  expect(classifyEventVersion(2, 3)).toBe("stale");
  expect(classifyEventVersion(4, 3)).toBe("accepted");
  expect(classifyEventVersion(undefined, 3)).toBe("accepted");
});

test("classifies version gaps that need resynchronization", () => {
  expect(classifyEventVersion(5, 3)).toBe("gap");
  expect(classifyEventVersion(3, 1)).toBe("gap");
});
