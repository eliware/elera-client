import { expect, test } from "@jest/globals";
import { classifyQuery } from "../../src/routing/classify-query.mjs";

test("classifies safe single statement reads as balanced", () => {
  expect(classifyQuery("SELECT 1")).toBe("balanced");
  expect(classifyQuery("/* note */ SHOW STATUS")).toBe("balanced");
});

test("classifies unsafe and ambiguous statements as primary", () => {
  expect(classifyQuery("UPDATE t SET x = 1")).toBe("primary");
  expect(classifyQuery("SELECT 1; SELECT 2")).toBe("primary");
  expect(classifyQuery("SELECT * FROM t FOR UPDATE")).toBe("primary");
  expect(classifyQuery(null)).toBe("primary");
});
