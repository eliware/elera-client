import { createRoutingStream } from "../../routing/stream/index.mjs";
import { resolveManagedConfig, createBundleFetcher } from "./configuration.mjs";
import { exposeManagedClient } from "./public-api.mjs";
import { createManagedShutdown } from "./shutdown.mjs";
import { createManagedClient, createManagedSetup } from "./setup.mjs";
import { createManagedDependencies } from "./options.mjs";

export async function createDb({
  endpoint,
  token,
  env = process.env,
  fetchImpl = globalThis.fetch,
  fetchPath,
  WebSocketImpl = globalThis.WebSocket,
  mysqlLib,
  log,
  routing,
  quarantineMs,
  drainTimeoutMs,
  now,
  telemetry = true,
} = {}) {
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
    options: createManagedDependencies({
      mysqlLib,
      log,
      routing,
      quarantineMs,
      drainTimeoutMs,
      now,
      telemetry,
    }),
  });
  const end = createManagedShutdown(detach, client.close.bind(client));
  return exposeManagedClient(client, end);
}
