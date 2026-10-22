import { lifecycleEventPolicy } from "./event-policy.mjs";

export function handleLifecycleRoutingEvent(event, pools, drainTimeoutMs) {
  if (event.type === "routing.topology") {
    for (const node of event.topology?.nodes ?? []) {
      const action = node.draining ? "drain" : node.state === "ready" ? "recover" : undefined;
      if (action) {
        for (const pool of pools) pool[action](node.nodeId, drainTimeoutMs);
      }
    }
    return;
  }
  const policy = lifecycleEventPolicy(event, drainTimeoutMs);
  if (!policy) return;
  for (const pool of pools) pool[policy.action](event.node, policy.timeoutMs);
}
