import { createTelemetryEmitter } from "./emitter.mjs";
import { createTelemetryState } from "./state.mjs";

export function createTelemetry({
  intervalMs = 1000,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
  ...options
} = {}) {
  const state = createTelemetryState(options);
  const emitter = createTelemetryEmitter({
    snapshot: state.snapshot,
    intervalMs,
    setIntervalImpl,
    clearIntervalImpl,
  });
  return { ...state, ...emitter };
}
