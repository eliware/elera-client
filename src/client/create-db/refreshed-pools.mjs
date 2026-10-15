export function createRefreshedPools({
  primaryConfig,
  balancedConfig,
  makeRoute,
  setPrimaryPool,
  setBalancedPool,
}) {
  const primary = makeRoute("primary", primaryConfig);
  setPrimaryPool(primary);
  const balanced = balancedConfig ? makeRoute("balanced", balancedConfig) : null;
  setBalancedPool(balanced);
  return { primary, balanced };
}
