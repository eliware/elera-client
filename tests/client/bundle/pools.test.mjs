import { expect, jest, test } from "@jest/globals";
import { createRefreshedPools } from "../../../src/client/bundle/pools.mjs";

test("creates and assigns the refreshed primary and balanced pools", () => {
  const primary = {};
  const balanced = {};
  const makeRoute = jest.fn((route) => (route === "primary" ? primary : balanced));
  expect(
    createRefreshedPools({
      primaryConfig: {},
      balancedConfig: {},
      makeRoute,
    }),
  ).toEqual({ primary, balanced });
});

test("clears balanced pool state when the new profile has no reader", () => {
  const primary = {};
  const makeRoute = jest.fn(() => primary);
  expect(
    createRefreshedPools({
      primaryConfig: {},
      balancedConfig: undefined,
      makeRoute,
    }),
  ).toEqual({ primary, balanced: null });
  expect(makeRoute).toHaveBeenCalledTimes(1);
});
