import { createTimedOperation } from "../telemetry/operation.mjs";
import { bundleNeedsRefresh } from "../../routing/bundle/expiry.mjs";
import { createDiagnostics } from "../diagnostics/diagnostics.mjs";
import { createTransactionOperation } from "../routing/transaction.mjs";
import { createBundleRefresh } from "../bundle/refresh.mjs";
import { bundlesHaveEquivalentPools, hasUsablePool, isOlderBundle } from "../bundle/state.mjs";
import { createPoolShutdown } from "../lifecycle/shutdown.mjs";
import { createDbExecution } from "./execution.mjs";

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
  const execution = createDbExecution({
    selection,
    timed,
    routing,
    metrics,
    getBalancedPool: setup.getBalancedPool,
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
