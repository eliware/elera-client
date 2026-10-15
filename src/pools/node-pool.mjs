import { createNodeOperations } from "./node-pool/operations.mjs";
import { createNodeLifecycle } from "./node-pool/lifecycle.mjs";
import { createNodeMethods } from "./node-pool/methods.mjs";
export function createNodePool({
  profile,
  mysqlLib,
  log,
  now = () => Date.now(),
  quarantineMs = 5000,
}) {
  const { acquireTimeout: _acquireTimeout, ...driverOptions } = profile.options ?? {};
  if (driverOptions.socketPath === undefined) delete driverOptions.socketPath;
  const pool = mysqlLib.createPool({
    host: profile.host,
    port: profile.port,
    user: profile.user,
    password: profile.password,
    database: profile.database,
    waitForConnections: true,
    ...driverOptions,
  });
  const sessionStatements = profile.options?.sessionStatements ?? [];
  const state = { failures: 0, unavailableUntil: 0 };
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
    now,
    quarantineMs,
    isAvailable: () => lifecycle.available && now() >= state.unavailableUntil,
  });
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
    async close() {
      await lifecycle.close();
    },
  };
}
