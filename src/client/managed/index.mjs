import { createDbFromBundle } from "../from-bundle.mjs";
import { createRoutingStream } from "../../routing/stream-client/index.mjs";
import { resolveManagedConfig, createBundleFetcher } from "./configuration.mjs";
import { exposeManagedClient } from "./public-api.mjs";
import { createManagedShutdown } from "./shutdown.mjs";
import { createManagedSetup } from "./setup.mjs";

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
  const client = await createDbFromBundle({
    bundle,
    tokenContext,
    mysqlLib,
    log,
    routing,
    quarantineMs,
    drainTimeoutMs,
    now,
    telemetry,
  });
  const detach = await client.attachRoutingStream(stream);
  const end = createManagedShutdown(detach, client.close.bind(client));
  return exposeManagedClient(client, end);
}
