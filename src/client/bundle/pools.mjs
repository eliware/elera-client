export function createRefreshedPools({ primaryConfig, balancedConfig, makeRoute }) {
  const primary = makeRoute("primary", primaryConfig);
  const balanced = balancedConfig ? makeRoute("balanced", balancedConfig) : null;
  return { primary, balanced };
}
