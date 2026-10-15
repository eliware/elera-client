import { expect, jest, test } from "@jest/globals";
import { getRefreshSkipResult } from "../../../src/client/bundle/refresh-policy.mjs";

const shared = {
  candidate: { bundleVersion: 2 },
  active: { bundleVersion: 2 },
  primary: { nodes: [{ available: true }] },
  balanced: null,
  equivalentPools: () => true,
  usablePool: (pool) => pool.nodes.some((node) => node.available),
  isOlderBundle: () => false,
  bundleNeedsRefresh: () => false,
  now: () => 1,
};

test("keeps equivalent bundles with usable pools", () => {
  expect(getRefreshSkipResult(shared)).toEqual({ bundleVersion: 2, refreshRequired: false });
});

test("keeps older candidates and checks refresh expiry", () => {
  const bundleNeedsRefresh = jest.fn(() => true);
  const result = getRefreshSkipResult({
    ...shared,
    isOlderBundle: () => true,
    bundleNeedsRefresh,
  });
  expect(result).toEqual({ bundleVersion: 2, refreshRequired: true });
  expect(bundleNeedsRefresh).toHaveBeenCalledWith(shared.active, 1);
});

test("allows refresh when an equivalent pool is not usable", () => {
  expect(getRefreshSkipResult({ ...shared, usablePool: () => false })).toBeNull();
});
