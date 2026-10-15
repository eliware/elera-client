export function createLifecycleAvailability({
  now,
  getState,
  setState,
  isClosed,
  cancelDrain,
  drain,
}) {
  const recover = () => {
    if (isClosed()) return getState();
    cancelDrain();
    setState("ready");
    return getState();
  };
  return {
    get available() {
      return !isClosed() && getState() === "ready" && now() >= 0;
    },
    set available(value) {
      if (value) recover();
      else drain();
    },
    markDraining: () => setState("draining"),
    markClosed: () => setState("unavailable"),
    recover,
  };
}
