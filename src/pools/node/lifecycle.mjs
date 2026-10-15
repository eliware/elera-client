import { createDrainController } from "./drain-controller.mjs";
import { createNodeAvailability } from "./availability.mjs";
import { createNodeActivity } from "./activity.mjs";

export function createNodeLifecycle({ now, timeoutMs = 45000, onForceClose }) {
  let state = "ready";
  const activity = createNodeActivity();
  let closed = false;
  const forceClose = async () => {
    if (closed) return;
    closed = true;
    availability.markClosed();
    await onForceClose();
  };
  const drainController = createDrainController({ forceClose });
  const drain = (timeout = timeoutMs) => {
    state = "draining";
    availability.markDraining();
    drainController.drain(timeout);
    return { state, active: activity.active };
  };
  const waitForIdle = (timeout = timeoutMs) => activity.waitForIdle(timeout);
  const availability = createNodeAvailability({
    now,
    getState: () => state,
    setState: (value) => (state = value),
    isClosed: () => closed,
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
      return closed;
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
