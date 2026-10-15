export function createNodeLifecycle({ now, timeoutMs = 45000, onForceClose }) {
  let state = "ready";
  let active = 0;
  const idleWaiters = new Set();
  let drainTimer;
  let forcedUnavailable = false;
  let closed = false;
  const forceClose = async () => {
    if (closed) return;
    closed = true;
    state = "unavailable";
    forcedUnavailable = true;
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
  const drain = (timeout = timeoutMs) => {
    state = "draining";
    forcedUnavailable = true;
    clearTimeout(drainTimer);
    drainTimer = setTimeout(() => {
      void forceClose();
    }, timeout);
    drainTimer.unref?.();
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
  const recover = () => {
    if (closed) return state;
    clearTimeout(drainTimer);
    drainTimer = undefined;
    state = "ready";
    forcedUnavailable = false;
    return state;
  };
  return {
    begin,
    end,
    drain,
    waitForIdle,
    recover,
    forceClose,
    close: async () => {
      clearTimeout(drainTimer);
      await forceClose();
    },
    set available(value) {
      if (value) recover();
      else drain();
    },
    get closed() {
      return closed;
    },
    clear: () => clearTimeout(drainTimer),
    get active() {
      return active;
    },
    get state() {
      return state;
    },
    get available() {
      return !closed && state === "ready" && !forcedUnavailable && now() >= 0;
    },
    set unavailable(value) {
      if (value) {
        state = "unavailable";
        forcedUnavailable = true;
      } else recover();
    },
  };
}
