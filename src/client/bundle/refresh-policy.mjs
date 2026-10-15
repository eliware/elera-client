export function getRefreshSkipResult({
  candidate,
  active,
  primary,
  balanced,
  equivalentPools,
  usablePool,
  isOlderBundle,
  bundleNeedsRefresh,
  now,
}) {
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
  return null;
}
