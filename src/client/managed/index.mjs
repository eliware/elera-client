import { createRoutingStream } from "../../routing/stream/index.mjs";
import { resolveManagedConfig, createBundleFetcher } from "./configuration.mjs";
import { exposeManagedClient } from "./public-api.mjs";
import { createManagedShutdown } from "./shutdown.mjs";
import { createManagedClient, createManagedSetup } from "./setup.mjs";
import { resolveManagedRuntimeOptions } from "./runtime-options.mjs";

export async function createDb({ endpoint, token, env = process.env, ...runtimeInput } = {}) {
  const runtime = resolveManagedRuntimeOptions(runtimeInput);
  const {
    fetchImpl,
    fetchPath,
    WebSocketImpl,
    mysqlLib,
    log,
    routing,
    quarantineMs,
    drainTimeoutMs,
    now,
    telemetry,
  } = runtime;
  ({ endpoint, token } = resolveManagedConfig({ endpoint, token, env }));
  const fetchBundle = createBundleFetcher({ endpoint, token, fetchImpl, fetchPath });
  const { bundle, tokenContext } = await createManagedSetup(fetchBundle);
  const stream = createRoutingStream({
    endpoint,
    token,
    fetchBundle,
    WebSocketImpl,
    log,
    now,
    telemetry,
  });
  const { client, detach } = await createManagedClient({
    bundle,
    tokenContext,
    stream,
    options: { mysqlLib, log, routing, quarantineMs, drainTimeoutMs, now, telemetry },
  });
  const end = createManagedShutdown(detach, client.close.bind(client));
  return exposeManagedClient(client, end);
}
