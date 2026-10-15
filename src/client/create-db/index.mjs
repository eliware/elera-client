import { log as defaultLog } from "@eliware/common";
import { routeFor } from "../../routing.mjs";
import { attachRoutingStream } from "./stream-attachment.mjs";
import { createClientDrain } from "./drain.mjs";
import { createClientApi } from "./public-api.mjs";
import { createDbSetup } from "./setup.mjs";
import { createDbServices } from "./services.mjs";
import { redactBundle } from "./bundle-state.mjs";
import { createProbeApi } from "./probe.mjs";

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
  const drain = createClientDrain({ getPools: setup.getPools, defaultTimeout: drainTimeoutMs });
  const probe = createProbeApi({
    routeFor,
    execution: services.execution,
    getPrimaryPool: setup.getPrimaryPool,
  });
  const client = createClientApi({
    ...services,
    probe,
    getPrimaryPool: setup.getPrimaryPool,
    getBundle: () => redactBundle(setup.getBundle()),
    setNodeAvailability: (route, host, available) => {
      const pool = route === "balanced" ? setup.getBalancedPool() : setup.getPrimaryPool();
      pool?.setAvailability(host, available);
    },
    attachRoutingStream: (stream, api) =>
      attachRoutingStream({
        stream,
        api,
        metrics: setup.metrics,
        getPools: setup.getPools,
        drainTimeoutMs,
      }),
    drain,
    telemetry: setup.metrics,
  });
  log.debug?.("SQL client created", {
    balanced: Boolean(setup.getBalancedPool()),
    routing,
  });
  return client;
}
