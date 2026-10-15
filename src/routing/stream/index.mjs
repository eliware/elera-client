import { createRoutingRuntime } from "./runtime.mjs";

export function createRoutingStream(options = {}) {
  const { endpoint, fetchBundle } = options;
  if (!endpoint || typeof fetchBundle !== "function")
    throw new TypeError("endpoint and fetchBundle are required");
  return createRoutingRuntime(options);
}
