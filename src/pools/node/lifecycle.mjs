import { createDrainController } from "./drain-controller.mjs";
import { createNodeAvailability } from "./availability.mjs";
import { createNodeActivity } from "./activity.mjs";
import { createNodeCloseState } from "./close-state.mjs";

export function createNodeLifecycle({ timeoutMs = 45000, onForceClose }) {
  let state = "ready";
  const activity = createNodeActivity();
  let availability;
  const closeState = createNodeCloseState({
    markClosed: () => availability.markClosed(),
    onForceClose,
  });
  const forceClose = closeState.close;
  const drainController = createDrainController({ forceClose });
  const drain = (timeout = timeoutMs) => {
    state = "draining";
    availability.markDraining();
    drainController.drain(timeout);
    return { state, active: activity.active };
  };
  const waitForIdle = (timeout = timeoutMs) => activity.waitForIdle(timeout);
  availability = createNodeAvailability({
    getState: () => state,
    setState: (value) => (state = value),
    isClosed: () => closeState.closed,
    cancelDrain: drainController.cancel,
    drain,
  });
  return {
    begin: activity.begin,
    end: activity.end,
    drain,
    waitForIdle,
    recover: availability.recover,
    forceClose,
    close: async () => {
      drainController.cancel();
      await forceClose();
    },
    set available(value) {
      availability.available = value;
    },
    get closed() {
      return closeState.closed;
    },
    clear: drainController.cancel,
    get active() {
      return activity.active;
    },
    get state() {
      return state;
    },
    get available() {
      return availability.available;
    },
    set unavailable(value) {
      availability.unavailable = value;
    },
  };
}
