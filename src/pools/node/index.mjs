import { createNodeOperations } from "./operations.mjs";
import { createNodeLifecycle } from "./lifecycle.mjs";
import { createNodeMethods } from "./methods.mjs";
import { createNodeConnections } from "./connections.mjs";
import { createDriverPool, createDriverPoolCloser } from "./driver-pool.mjs";
import { createNodeHealth } from "./health.mjs";
import { createNodeFailurePolicy } from "./failure-policy.mjs";
import { createNodeInterface } from "./interface.mjs";
export function createNodePool({
  profile,
  mysqlLib,
  log,
  now = () => Date.now(),
  quarantineMs = 5000,
}) {
  const pool = createDriverPool(profile, mysqlLib);
  const sessionStatements = profile.options?.sessionStatements ?? [];
  const state = { failures: 0, unavailableUntil: 0 };
  const failurePolicy = createNodeFailurePolicy({ state, now, quarantineMs });
  let lifecycle;
  lifecycle = createNodeLifecycle({ onForceClose: createDriverPoolCloser(pool) });
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
    isAvailable: () => lifecycle.available && now() >= state.unavailableUntil,
  });
  const connections = createNodeConnections({
    profile,
    pool,
    lifecycle,
    ...failurePolicy,
    isAvailable: () => lifecycle.available && now() >= state.unavailableUntil,
  });
  const health = createNodeHealth({ profile, pool, state, ...failurePolicy });
  return createNodeInterface({
    profile,
    state,
    lifecycle,
    methods: { ...methods, ...connections },
    health,
    now,
  });
}
