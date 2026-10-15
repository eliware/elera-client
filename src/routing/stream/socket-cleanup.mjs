import { stopHeartbeat } from "./heartbeat.mjs";

export function clearSocketState(state) {
  state.connecting = false;
  stopHeartbeat(state.heartbeat);
  state.heartbeat = undefined;
  state.socket = undefined;
  state.mode = "disconnected";
}
