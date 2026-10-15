import { log as defaultLog } from "@eliware/common";
import { websocketUrl } from "./address.mjs";
import { createReconnectPolicy } from "./reconnect.mjs";
import { createRestFallback } from "./fallback.mjs";
import { connectRoutingSocket } from "./connection.mjs";
import { createRoutingMessageHandler } from "./message-handler.mjs";
import { stopHeartbeat } from "./heartbeat.mjs";

export function createRoutingStream(options = {}) {
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
  if (!endpoint || typeof fetchBundle !== "function")
    throw new TypeError("endpoint and fetchBundle are required");
  const state = {
    socket: undefined,
    closed: false,
    connecting: false,
    heartbeat: undefined,
    expectedVersion: 0,
    updateHandler: onUpdate,
    mode: "disconnected",
    plannedReconnect: false,
    lastReconnectWasPlanned: false,
    disconnectedAt: undefined,
    reconnectDeadlineAt: undefined,
    activeEndpoint: endpoint,
    telemetry,
  };
  const log = options.log ?? defaultLog;
  const fallback = createRestFallback({
    fetchBundle,
    getEndpoint: () => state.activeEndpoint,
    isClosed: () => state.closed,
    getVersion: () => state.expectedVersion,
    setMode: (value) => (state.mode = value),
    update: (event) => state.updateHandler?.(event),
    onError,
    log,
    now,
  });
  const reconnect = createReconnectPolicy({
    reconnectMs,
    maxReconnectMs,
    now,
    isClosed: () => state.closed,
    getDeadline: () => state.reconnectDeadlineAt,
    scheduleConnect: connect,
  });
  const schedule = reconnect.schedule;
  const onMessage = createRoutingMessageHandler({ state, fallback, reconnect, now, onError });
  async function connect() {
    await connectRoutingSocket({
      state,
      WebSocketImpl,
      streamUrl: () => websocketUrl(state.activeEndpoint),
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
  }
  return {
    connect,
    sendTelemetry: (payload) => {
      if (state.socket?.readyState === 1) state.socket.send(JSON.stringify(payload));
    },
    setOnUpdate: (handler) => (state.updateHandler = handler),
    setTelemetry: (value) => (state.telemetry = value),
    close: () => {
      state.closed = true;
      state.mode = "disconnected";
      reconnect.cancel();
      stopHeartbeat(state.heartbeat);
      state.socket?.close?.();
    },
    state: () => ({
      connected: state.socket?.readyState === 1,
      mode: state.mode,
      expectedVersion: state.expectedVersion,
      endpoint: state.activeEndpoint,
      reconnectDeadlineAt: state.reconnectDeadlineAt,
    }),
  };
}
