import { clientDrainTimeout } from "../../lifecycle/drain-policy.mjs";

export function lifecycleEventPolicy(event, defaultTimeoutMs) {
  if (event.type === "routing.drain") {
    return {
      action: "drain",
      timeoutMs: clientDrainTimeout(event.drainTimeoutMs ?? defaultTimeoutMs),
    };
  }
  if (event.type === "routing.shutdown") {
    return {
      action: "drain",
      timeoutMs: clientDrainTimeout(
        event.reconnectDeadlineMs ?? event.drainTimeoutMs ?? defaultTimeoutMs,
      ),
    };
  }
  if (event.type === "routing.recovery") {
    return { action: "recover", timeoutMs: defaultTimeoutMs };
  }
  return undefined;
}
