import { createTimedOperation } from "../telemetry-wrapper.mjs";
import { bundleNeedsRefresh } from "../../routing/bundle-expiry.mjs";
import { routeFor } from "../../routing.mjs";
import { createDiagnostics } from "./diagnostics.mjs";
import { createQueryExecution } from "./query-execution.mjs";
import { createTransactionOperation } from "./transaction.mjs";
import { createBundleRefresh } from "./bundle-refresh.mjs";
import { bundlesHaveEquivalentPools, hasUsablePool, isOlderBundle } from "./bundle-state.mjs";
import { createPoolShutdown } from "./shutdown.mjs";

export function createDbServices({ setup, drainTimeoutMs }) {
  const { metrics, now, selection, routing } = setup;
  const timed = createTimedOperation({ metrics, now });
  const shutdown = createPoolShutdown({ getPools: setup.getPools, drainTimeoutMs, metrics });
  const diagnostics = createDiagnostics({
    getPools: setup.getPools,
    getPrimaryPool: setup.getPrimaryPool,
    getBalancedPool: setup.getBalancedPool,
    now,
  });
  const execution = createQueryExecution({
    selection,
    timed,
    metrics,
    getBalancedPool: setup.getBalancedPool,
    routeFor,
    routing,
  });
  const transaction = createTransactionOperation({ primaryPool: setup.getPrimaryPool(), timed });
  const refreshBundle = createBundleRefresh({
    validateBundle: setup.validateBundle,
    getBundle: setup.getBundle,
    setBundle: setup.setBundle,
    getPrimaryConfig: setup.getPrimaryConfig,
    setPrimaryConfig: setup.setPrimaryConfig,
    getBalancedPool: setup.getBalancedPool,
    setBalancedPool: setup.setBalancedPool,
    getPrimaryPool: setup.getPrimaryPool,
    setPrimaryPool: setup.setPrimaryPool,
    makeRoute: setup.makeRoute,
    validateProfile: setup.validateProfile,
    bundleNeedsRefresh,
    isOlderBundle,
    equivalentPools: bundlesHaveEquivalentPools,
    usablePool: hasUsablePool,
    drainTimeoutMs,
    now,
  });
  return { shutdown, diagnostics, execution, transaction, refreshBundle };
}
