import { connectRoutingSocket } from "./connection.mjs";

export function createRoutingConnector(options) {
  return () =>
    connectRoutingSocket({
      ...options,
      streamUrl: options.getStreamUrl,
    });
}
