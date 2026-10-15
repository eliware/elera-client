import { expect, test } from "@jest/globals";
import { routeFor } from "../src/routing.mjs";

test("supports explicit routes and rejects unknown routes", () => {
  expect(routeFor("UPDATE t SET x = 1", "balanced")).toBe("balanced");
  expect(() => routeFor("SELECT 1", "unknown")).toThrow();
});

test("defaults automatic and non-string inputs to primary when appropriate", () => {
  expect(routeFor("SELECT 1")).toBe("balanced");
});
