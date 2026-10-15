import { lifecycleEventPolicy } from "./lifecycle-event-policy.mjs";

export function handleLifecycleRoutingEvent(event, pools, drainTimeoutMs) {
  const policy = lifecycleEventPolicy(event, drainTimeoutMs);
  if (!policy) return;
  for (const pool of pools) pool[policy.action](event.node, policy.timeoutMs);
}
