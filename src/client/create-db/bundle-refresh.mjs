import { retireObsoletePools } from "./pool-retirement.mjs";
import { createRefreshedProfiles } from "./refreshed-profiles.mjs";
import { createRefreshedPools } from "./refreshed-pools.mjs";

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
    if (
      equivalentPools(candidate, active) &&
      usablePool(primary) &&
      (!balanced || usablePool(balanced))
    )
      return {
        bundleVersion: active.bundleVersion,
        refreshRequired: bundleNeedsRefresh(active, now()),
      };
    if (isOlderBundle(candidate.bundleVersion, active?.bundleVersion))
      return {
        bundleVersion: active?.bundleVersion,
        refreshRequired: bundleNeedsRefresh(active, now()),
      };
    const previous = [primary, balanced];
    setBundle(candidate);
    const profiles = createRefreshedProfiles({
      candidate,
      primaryConfig: getPrimaryConfig(),
      validateProfile,
    });
    const primaryConfig = profiles.primary;
    setPrimaryConfig(primaryConfig);
    const { primary: nextPrimary, balanced: nextBalanced } = createRefreshedPools({
      primaryConfig,
      balancedConfig: profiles.balanced,
      makeRoute,
      setPrimaryPool,
      setBalancedPool,
    });
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
