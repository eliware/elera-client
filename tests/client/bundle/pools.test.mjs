import { expect, jest, test } from "@jest/globals";
import { createRefreshedPools } from "../../../src/client/bundle/pools.mjs";

test("creates and assigns the refreshed primary and balanced pools", () => {
  const primary = {};
  const balanced = {};
  const makeRoute = jest.fn((route) => (route === "primary" ? primary : balanced));
  const setPrimaryPool = jest.fn();
  const setBalancedPool = jest.fn();
  expect(
    createRefreshedPools({
      primaryConfig: {},
      balancedConfig: {},
      makeRoute,
      setPrimaryPool,
      setBalancedPool,
    }),
  ).toEqual({ primary, balanced });
  expect(setPrimaryPool).toHaveBeenCalledWith(primary);
  expect(setBalancedPool).toHaveBeenCalledWith(balanced);
});

test("clears balanced pool state when the new profile has no reader", () => {
  const primary = {};
  const makeRoute = jest.fn(() => primary);
  const setBalancedPool = jest.fn();
  expect(
    createRefreshedPools({
      primaryConfig: {},
      balancedConfig: undefined,
      makeRoute,
      setPrimaryPool: jest.fn(),
      setBalancedPool,
    }),
  ).toEqual({ primary, balanced: null });
  expect(makeRoute).toHaveBeenCalledTimes(1);
  expect(setBalancedPool).toHaveBeenCalledWith(null);
});
