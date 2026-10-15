import { createNodeOperations } from "./node-pool/operations.mjs";
import { createNodeLifecycle } from "./node-pool/lifecycle.mjs";
import { createNodeMethods } from "./node-pool/methods.mjs";
import { createDriverPool } from "./node-pool/driver-pool.mjs";
import { createNodeHealth } from "./node-pool/health.mjs";
import { createNodeFailurePolicy } from "./node-pool/failure-policy.mjs";
import { createNodeInterface } from "./node-pool/interface.mjs";
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
  const forceClosePool = () => pool.end();
  lifecycle = createNodeLifecycle({ pool, now, onForceClose: forceClosePool });
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
  const health = createNodeHealth({ profile, pool, state, ...failurePolicy });
  return createNodeInterface({ profile, state, lifecycle, methods, health, now });
}
