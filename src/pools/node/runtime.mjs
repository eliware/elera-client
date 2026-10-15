import { createNodeEligibility } from "./eligibility.mjs";
import { createNodeFailurePolicy } from "./failure-policy.mjs";
import { createNodeLifecycle } from "./lifecycle.mjs";
import { createDriverPoolCloser } from "./driver-pool.mjs";

export function createNodeRuntime({ pool, state, now, quarantineMs }) {
  const failurePolicy = createNodeFailurePolicy({ state, now, quarantineMs });
  const lifecycle = createNodeLifecycle({ onForceClose: createDriverPoolCloser(pool) });
  const isAvailable = createNodeEligibility({
    lifecycle,
    isQuarantined: failurePolicy.isQuarantined,
  });
  return { failurePolicy, lifecycle, isAvailable };
}
