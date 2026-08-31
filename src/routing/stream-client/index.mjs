
import { log as defaultLog } from '@eliware/common';
import { validateRoutingEvent } from '@eliware/elera-lib';
import { compareBundleVersions } from '../bundle-version.mjs';
import { createRoutingResync } from '../internal-events.mjs';
import { websocketUrl, activeEndpointFromShutdown } from './address.mjs';
import { createReconnectPolicy } from './reconnect.mjs';
import { startHeartbeat, stopHeartbeat } from './heartbeat.mjs';

export function createRoutingStream({ endpoint, token, fetchBundle, WebSocketImpl = globalThis.WebSocket, onUpdate, onError, reconnectMs = 1000, maxReconnectMs = 30000, heartbeatMs = 45000, now = () => Date.now(), telemetry } = {}) {
  if (!endpoint || typeof fetchBundle !== 'function') throw new TypeError('endpoint and fetchBundle are required');
  let socket; let closed = false; let connecting = false; let heartbeat; let expectedVersion = 0; let updateHandler = onUpdate; let mode = 'disconnected'; let plannedReconnect = false; let lastReconnectWasPlanned = false; let disconnectedAt; let reconnectDeadlineAt; let activeEndpoint = endpoint;
  const log = arguments[0]?.log ?? defaultLog;
  const streamUrl = () => websocketUrl(activeEndpoint);
  async function fallback() { try { const bundle = await fetchBundle(activeEndpoint); if (closed) return; mode = 'rest'; await updateHandler?.(createRoutingResync({ version: expectedVersion, bundle, receivedAt: now() })); } catch (error) { if (closed) return; mode = 'disconnected'; onError?.(error); log.warn?.('Routing REST fallback failed', { error }); } }
  const reconnect = createReconnectPolicy({ reconnectMs, maxReconnectMs, now, isClosed: () => closed, getDeadline: () => reconnectDeadlineAt, scheduleConnect: connect });
  const schedule = reconnect.schedule;
  async function connect() {
    if (closed || connecting || socket?.readyState === 1 || (reconnectDeadlineAt !== undefined && now() >= reconnectDeadlineAt)) return;
    if (closed || typeof WebSocketImpl !== 'function') { await fallback(); schedule(); return; }
    try {
      connecting = true;
      socket = new WebSocketImpl(streamUrl(), { headers: { authorization: `Bearer ${token ?? ''}` } });
      socket.onopen = () => { connecting = false; mode = 'websocket'; reconnectDeadlineAt = undefined; reconnect.reset(); if (disconnectedAt !== undefined) { telemetry?.recordReconnect?.({ delayMs: Math.max(0, now() - disconnectedAt), failover: lastReconnectWasPlanned }); disconnectedAt = undefined; lastReconnectWasPlanned = false; } heartbeat = startHeartbeat({ getSocket: () => socket, heartbeatMs, now }); };
      socket.onmessage = async ({ data }) => {
        try {
          const event = validateRoutingEvent(JSON.parse(data));
          if (event.type === 'routing.shutdown') {
            activeEndpoint = activeEndpointFromShutdown(activeEndpoint, event);
            updateHandler?.(event);
            if (typeof event.loadBalancerEndpoint === 'string' && event.loadBalancerEndpoint) endpoint = event.loadBalancerEndpoint;
            const deadlineMs = event.reconnectDeadlineMs;
            reconnectDeadlineAt = now() + deadlineMs;
            plannedReconnect = deadlineMs > 0;
            if (deadlineMs <= 0) reconnect.cancel();
            reconnect.reset();
            await fallback();
            socket?.close?.(1012, 'supervisor restarting');
            return;
          }
          const version = event.version;
          if (version !== undefined && expectedVersion !== 0 && compareBundleVersions(version, expectedVersion) <= 0) return;
          const numericVersion = Number(version); const numericExpected = Number(expectedVersion);
          if (Number.isInteger(numericVersion) && Number.isInteger(numericExpected) && numericExpected > 0 && numericVersion > numericExpected + 1) await fallback();
          expectedVersion = version;
          if (event.type === 'routing.topology') { await fallback(); return; }
          updateHandler?.(event);
        } catch (error) { onError?.(error); }
      };
      socket.onerror = (error) => { onError?.(error); };
      socket.onclose = () => { connecting = false; stopHeartbeat(heartbeat); heartbeat = undefined; socket = undefined; mode = 'disconnected'; if (!closed) { disconnectedAt = now(); lastReconnectWasPlanned = plannedReconnect; if (!plannedReconnect) void fallback(); plannedReconnect = false; schedule(); } };
    } catch (error) { connecting = false; socket = undefined; mode = 'disconnected'; onError?.(error); await fallback(); schedule(); }
  }
  return { connect, sendTelemetry: (payload) => { if (socket?.readyState === 1) socket.send(JSON.stringify(payload)); }, setOnUpdate: (handler) => { updateHandler = handler; }, setTelemetry: (value) => { telemetry = value; }, close: () => { closed = true; mode = 'disconnected'; reconnect.cancel(); stopHeartbeat(heartbeat); socket?.close?.(); }, state: () => ({ connected: socket?.readyState === 1, mode, expectedVersion, endpoint: activeEndpoint, reconnectDeadlineAt }) };
}
