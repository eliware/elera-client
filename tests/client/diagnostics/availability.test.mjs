import { expect, test } from "@jest/globals";
import { getAvailability } from "../../../src/client/diagnostics/availability.mjs";

test("classifies primary and balanced availability", () => {
  expect(
    getAvailability([
      { route: "primary", available: false },
      { route: "primary", available: false },
      { route: "balanced", available: true },
    ]),
  ).toEqual({
    state: "cluster-unavailable",
    routes: { primary: false, balanced: true },
  });
});

test("classifies a single unavailable primary node", () => {
  expect(getAvailability([{ route: "primary", available: false }]).state).toBe(
    "standalone-unavailable",
  );
});
