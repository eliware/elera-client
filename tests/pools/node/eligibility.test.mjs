import { expect, jest, test } from "@jest/globals";
import { createNodeEligibility } from "../../../src/pools/node/eligibility.mjs";

test("requires lifecycle availability and no active quarantine", () => {
  const lifecycle = { available: true };
  const isQuarantined = jest.fn(() => false);
  const isAvailable = createNodeEligibility({ lifecycle, isQuarantined });

  expect(isAvailable()).toBe(true);
  isQuarantined.mockReturnValue(true);
  expect(isAvailable()).toBe(false);
  isQuarantined.mockReturnValue(false);
  lifecycle.available = false;
  expect(isAvailable()).toBe(false);
});
