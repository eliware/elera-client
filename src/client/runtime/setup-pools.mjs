import { createRouteFactory } from "../routing/route-factory.mjs";

export function createDbPoolState({
  primaryConfig,
  balancedConfig,
  bundle,
  now,
  mysqlLib,
  log,
  quarantineMs,
  metrics,
}) {
  let activeBundle = bundle;
  let activePrimaryConfig = primaryConfig;
  let activeBalancedConfig = balancedConfig;
  const makeRoute = (route, fallback) =>
    createRouteFactory({ bundle: activeBundle, now, mysqlLib, log, quarantineMs })(route, fallback);
  let primaryPool = makeRoute("primary", activePrimaryConfig);
  let balancedPool =
    activeBalancedConfig || activeBundle?.routes?.balanced?.length
      ? makeRoute("balanced", activeBalancedConfig ?? activePrimaryConfig)
      : null;
  return {
    getPools: () => [primaryPool, balancedPool].filter(Boolean),
    getPrimaryPool: () => primaryPool,
    getBalancedPool: () => balancedPool,
    setPrimaryPool: (value) => {
      primaryPool = value;
    },
    setBalancedPool: (value) => {
      balancedPool = value;
    },
    getPrimaryConfig: () => activePrimaryConfig,
    setPrimaryConfig: (value) => {
      activePrimaryConfig = value;
    },
    getBundle: () => activeBundle,
    setBundle: (value) => {
      activeBundle = value;
      metrics?.setContext?.({
        application: value.application,
        credentialName: value.credentialName,
        database: value.database,
        scopes: value.scopes,
      });
    },
    makeRoute,
  };
}
