import { expect, test } from "@jest/globals";
import { classifyQuery } from "../../../src/routing/query/classify.mjs";

test("classifies one safe statement as balanced", () => {
  expect(classifyQuery("SELECT 1")).toBe("balanced");
});

test("classifies multiple, empty, and invalid input as primary", () => {
  expect(classifyQuery("SELECT 1; SELECT 2")).toBe("primary");
  expect(classifyQuery("")).toBe("primary");
  expect(classifyQuery(null)).toBe("primary");
});
