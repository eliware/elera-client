export function createNodeAvailability({ now, getState, setState, isClosed, cancelDrain, drain }) {
  let forcedUnavailable = false;

  const recover = () => {
    if (isClosed()) return getState();
    cancelDrain();
    setState("ready");
    forcedUnavailable = false;
    return getState();
  };

  return {
    get available() {
      return !isClosed() && getState() === "ready" && !forcedUnavailable && now() >= 0;
    },
    set available(value) {
      if (value) recover();
      else drain();
    },
    set unavailable(value) {
      if (value) {
        setState("unavailable");
        forcedUnavailable = true;
      } else recover();
    },
    markDraining() {
      forcedUnavailable = true;
      setState("draining");
    },
    markClosed() {
      forcedUnavailable = true;
      setState("unavailable");
    },
    recover,
  };
}
