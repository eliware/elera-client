import { log as defaultLog } from "@eliware/common";
import { websocketUrl } from "./address.mjs";
import { createReconnectPolicy } from "./reconnect.mjs";
import { createRuntimeFallback } from "./fallback.mjs";
import { createRoutingConnector } from "./connector.mjs";
import { createRoutingMessageHandler } from "./message-handler.mjs";
import { stopHeartbeat } from "./heartbeat.mjs";
import { createRoutingStreamApi } from "./public-api.mjs";
import { createRoutingStreamState } from "./state.mjs";

export function createRoutingRuntime(options) {
  const {
    endpoint,
    token,
    fetchBundle,
    WebSocketImpl = globalThis.WebSocket,
    onUpdate,
    onError,
    reconnectMs = 1000,
    maxReconnectMs = 30000,
    heartbeatMs = 45000,
    now = () => Date.now(),
    telemetry,
  } = options;
  const state = createRoutingStreamState({ endpoint, onUpdate, telemetry });
  const log = options.log ?? defaultLog;
  const fallback = createRuntimeFallback({
    fetchBundle,
    state,
    onError,
    log,
    now,
  });
  let connect;
  const reconnect = createReconnectPolicy({
    reconnectMs,
    maxReconnectMs,
    now,
    isClosed: () => state.closed,
    getDeadline: () => state.reconnectDeadlineAt,
    scheduleConnect: (...args) => connect(...args),
  });
  const schedule = reconnect.schedule;
  const onMessage = createRoutingMessageHandler({ state, fallback, reconnect, now, onError });
  connect = createRoutingConnector({
    state,
    WebSocketImpl,
    getStreamUrl: () => websocketUrl(state.activeEndpoint),
    token,
    heartbeatMs,
    now,
    telemetry: state.telemetry,
    reconnect,
    fallback,
    schedule,
    onMessage,
    onError,
  });
  return { connect, ...createRoutingStreamApi({ state, reconnect, stopHeartbeat }) };
}
