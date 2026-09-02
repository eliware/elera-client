import { ROUTING_RESYNC } from '../../routing/internal-events.mjs';
import { clientDrainTimeout } from '../drain-policy.mjs';

export function createRoutingEventHandler({ refresh, getPools, drainTimeoutMs }) {
  return async function handle(event) {
    const update = event.type === 'routing.update' ? { ...event } : event.type === ROUTING_RESYNC ? event.bundle : undefined;
    if (update?.type) delete update.type;
    if (update?.version !== undefined) delete update.version;
    if (update?.generatedAt !== undefined) delete update.generatedAt;
    if (update) await refresh(update);
    const pools = getPools();
    if (event.type === 'routing.drain') for (const pool of pools) pool.drain(event.node, clientDrainTimeout(event.drainTimeoutMs ?? drainTimeoutMs));
    if (event.type === 'routing.shutdown') for (const pool of pools) pool.drain(event.node, clientDrainTimeout(event.reconnectDeadlineMs ?? event.drainTimeoutMs ?? drainTimeoutMs));
    if (event.type === 'routing.recovery') for (const pool of pools) pool.recover(event.node, drainTimeoutMs);
  };
}
