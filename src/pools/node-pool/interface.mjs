export function createNodeInterface({ profile, state, lifecycle, methods, health, now }) {
  return {
    host: profile.host,
    port: profile.port,
    weight: Number(profile.weight ?? 100),
    get available() {
      return lifecycle.available && now() >= state.unavailableUntil;
    },
    set available(value) {
      lifecycle.available = value;
      if (value && !lifecycle.closed) state.unavailableUntil = 0;
    },
    get failures() {
      return state.failures;
    },
    get state() {
      return lifecycle.state;
    },
    get active() {
      return lifecycle.active;
    },
    drain: lifecycle.drain,
    recover: () => {
      lifecycle.recover();
      return lifecycle.state;
    },
    waitForIdle: lifecycle.waitForIdle,
    forceClose: lifecycle.forceClose,
    ...methods,
    health,
    async close() {
      await lifecycle.close();
    },
  };
}
