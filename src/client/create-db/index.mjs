import { log as defaultLog } from "@eliware/common";
import { clientDrainTimeout } from "../drain-policy.mjs";
import { routeFor } from "../../routing.mjs";
import { createRoutingEventHandler } from "./routing-events.mjs";
import { createClientApi } from "./public-api.mjs";
import { createDbSetup } from "./setup.mjs";
import { createDbServices } from "./services.mjs";

export async function createDb(options = {}) {
  const {
    primary,
    balanced,
    bundle,
    credentialProvider,
    mysqlLib,
    log = defaultLog,
    routing = "auto",
    identity,
    tokenContext,
    quarantineMs = 5000,
    drainTimeoutMs = 45000,
    now = () => Date.now(),
    telemetry,
  } = options;
  const setup = await createDbSetup({
    primary,
    balanced,
    bundle,
    credentialProvider,
    mysqlLib,
    log,
    routing,
    identity,
    tokenContext,
    quarantineMs,
    now,
    telemetry,
  });
  const services = createDbServices({ setup, drainTimeoutMs });
  const client = createClientApi({
    ...services,
    routeFor,
    getPrimaryPool: setup.getPrimaryPool,
    getBundle: () => {
      const value = setup.getBundle();
      if (!value) return value;
      const { credentials: _credentials, ...redacted } = value;
      return redacted;
    },
    setNodeAvailability: (route, host, available) => {
      const pool = route === "balanced" ? setup.getBalancedPool() : setup.getPrimaryPool();
      pool?.setAvailability(host, available);
    },
    attachRoutingStream: async (stream, api) => {
      if (!stream?.connect) throw new TypeError("routing stream is required");
      setup.metrics?.start?.(stream);
      stream.setTelemetry?.(setup.metrics);
      stream.setOnUpdate?.(
        createRoutingEventHandler({
          refresh: (event) => api.refresh(event),
          getPools: setup.getPools,
          drainTimeoutMs,
        }),
      );
      await stream.connect();
      return () => stream.close?.();
    },
    drain: (host, timeoutMs = drainTimeoutMs) => {
      const effectiveTimeout = clientDrainTimeout(timeoutMs);
      const pools = setup.getPools();
      pools.forEach((pool) => pool.drain(host, effectiveTimeout));
      return {
        host,
        timeoutMs: effectiveTimeout,
        wait: () => Promise.all(pools.map((pool) => pool.waitForIdle(effectiveTimeout))),
        forceClose: () => Promise.all(pools.map((pool) => pool.forceClose(host))),
      };
    },
    telemetry: setup.metrics,
  });
  log.debug?.("SQL client created", {
    balanced: Boolean(setup.getBalancedPool()),
    routing,
  });
  return client;
}
