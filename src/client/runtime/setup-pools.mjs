import { createRouteFactory } from "../routing/route-factory.mjs";
import { updateBundleMetricsContext } from "./bundle-context.mjs";

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
  const makeRoute = (route, fallback, bundle = activeBundle) =>
    createRouteFactory({ bundle, now, mysqlLib, log, quarantineMs })(route, fallback);
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
      updateBundleMetricsContext(metrics, value);
    },
    makeRoute,
  };
}
