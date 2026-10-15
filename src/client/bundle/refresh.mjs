import { retireObsoletePools } from "../lifecycle/pool-retirement.mjs";
import { createRefreshedProfiles } from "./refreshed-profiles.mjs";
import { createRefreshedPools } from "./pools.mjs";
import { getRefreshSkipResult } from "./refresh-policy.mjs";

export function createBundleRefresh({
  validateBundle,
  getBundle,
  setBundle,
  getPrimaryConfig,
  setPrimaryConfig,
  getBalancedPool,
  setBalancedPool,
  getPrimaryPool,
  setPrimaryPool,
  makeRoute,
  validateProfile,
  bundleNeedsRefresh,
  isOlderBundle,
  equivalentPools,
  usablePool,
  drainTimeoutMs,
  now,
}) {
  return async function refresh(nextBundle) {
    const candidate = validateBundle(nextBundle);
    const active = getBundle();
    const primary = getPrimaryPool();
    const balanced = getBalancedPool();
    const skipped = getRefreshSkipResult({
      candidate,
      active,
      primary,
      balanced,
      equivalentPools,
      usablePool,
      isOlderBundle,
      bundleNeedsRefresh,
      now,
    });
    if (skipped) return skipped;
    const previous = [primary, balanced];
    const profiles = createRefreshedProfiles({
      candidate,
      primaryConfig: getPrimaryConfig(),
      validateProfile,
    });
    const primaryConfig = profiles.primary;
    const { primary: nextPrimary, balanced: nextBalanced } = createRefreshedPools({
      primaryConfig,
      balancedConfig: profiles.balanced,
      makeRoute: (route, fallback) => makeRoute(route, fallback, candidate),
    });
    setBundle(candidate);
    setPrimaryConfig(primaryConfig);
    setPrimaryPool(nextPrimary);
    setBalancedPool(nextBalanced);
    retireObsoletePools({
      previous,
      retained: [nextPrimary, nextBalanced],
      drainTimeoutMs,
    });
    return {
      bundleVersion: candidate.bundleVersion,
      refreshRequired: bundleNeedsRefresh(candidate, now()),
    };
  };
}
