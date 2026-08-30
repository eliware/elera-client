import { createRoutingResync, ROUTING_RESYNC } from '../../src/routing/internal-events.mjs';

test('creates the private REST resynchronization signal', () => {
  expect(createRoutingResync({ version: 2, bundle: { bundleVersion: 2 }, receivedAt: 100 })).toEqual({ type: ROUTING_RESYNC, version: 2, bundle: { bundleVersion: 2 }, receivedAt: 100 });
});
