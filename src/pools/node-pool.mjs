import { createNodeOperations } from "./node-pool/operations.mjs";
import { createNodeLifecycle } from "./node-pool/lifecycle.mjs";
import { createNodeMethods } from "./node-pool/methods.mjs";
import { createDriverPool } from "./node-pool/driver-pool.mjs";
import { createNodeHealth } from "./node-pool/health.mjs";
import { createNodeFailurePolicy } from "./node-pool/failure-policy.mjs";
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
  return {
    host: profile.host,
    port: profile.port,
    weight: Number(profile.weight ?? 100),
    get available() {
      return lifecycle.available && now() >= state.unavailableUntil;
    },
    set available(value) {
      lifecycle.available = value;
      if (value && !lifecycle.closed) state.unavailableUntil = 0;
    },
    get failures() {
      return state.failures;
    },
    get state() {
      return lifecycle.state;
    },
    get active() {
      return lifecycle.active;
    },
    drain: lifecycle.drain,
    recover: () => {
      lifecycle.recover();
      return lifecycle.state;
    },
    waitForIdle: lifecycle.waitForIdle,
    forceClose: lifecycle.forceClose,
    ...methods,
    health,
    async close() {
      await lifecycle.close();
    },
  };
}
