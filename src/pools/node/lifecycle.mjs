import { createDrainController } from "./drain-controller.mjs";
import { createNodeAvailability } from "./availability.mjs";

export function createNodeLifecycle({ now, timeoutMs = 45000, onForceClose }) {
  let state = "ready";
  let active = 0;
  const idleWaiters = new Set();
  let closed = false;
  const forceClose = async () => {
    if (closed) return;
    closed = true;
    availability.markClosed();
    await onForceClose();
  };
  const begin = () => {
    active += 1;
  };
  const end = () => {
    active = Math.max(0, active - 1);
    if (!active) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters.clear();
    }
  };
  const drainController = createDrainController({ forceClose });
  const drain = (timeout = timeoutMs) => {
    state = "draining";
    availability.markDraining();
    drainController.drain(timeout);
    return { state, active };
  };
  const waitForIdle = async (timeout = timeoutMs) => {
    if (!active) return true;
    let timer;
    await Promise.race([
      new Promise((resolve) => idleWaiters.add(resolve)),
      new Promise((resolve) => {
        timer = setTimeout(resolve, timeout);
      }),
    ]);
    clearTimeout(timer);
    return active === 0;
  };
  const availability = createNodeAvailability({
    now,
    getState: () => state,
    setState: (value) => (state = value),
    isClosed: () => closed,
    cancelDrain: drainController.cancel,
    drain,
  });
  return {
    begin,
    end,
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
      return active;
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
