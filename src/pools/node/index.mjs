import { createNodeOperations } from "./operations.mjs";
import { createNodeMethods } from "./methods.mjs";
import { createNodeConnections } from "./connections.mjs";
import { createDriverPool } from "./driver-pool.mjs";
import { createNodeHealth } from "./health.mjs";
import { createNodeInterface } from "./interface.mjs";
import { createNodeSetup } from "./setup.mjs";
import { createNodeRuntime } from "./runtime.mjs";
export function createNodePool({
  profile,
  mysqlLib,
  log,
  now = () => Date.now(),
  quarantineMs = 5000,
}) {
  const pool = createDriverPool(profile, mysqlLib);
  const { state, sessionStatements } = createNodeSetup(profile);
  const { failurePolicy, lifecycle, isAvailable } = createNodeRuntime({
    pool,
    state,
    now,
    quarantineMs,
  });
  const operations = createNodeOperations({
    pool,
    sessionStatements,
    begin: () => lifecycle.begin(),
    end: () => lifecycle.end(),
  });
  const methods = createNodeMethods({
    profile,
    pool,
    operations,
    lifecycle,
    state,
    log,
    ...failurePolicy,
    isAvailable,
  });
  const connections = createNodeConnections({
    profile,
    pool,
    lifecycle,
    ...failurePolicy,
    isAvailable,
  });
  const health = createNodeHealth({ profile, pool, state, ...failurePolicy });
  return createNodeInterface({
    profile,
    state,
    lifecycle,
    methods: { ...methods, ...connections },
    health,
    now,
    clearQuarantine: failurePolicy.clearQuarantine,
  });
}
