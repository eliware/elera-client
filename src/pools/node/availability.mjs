import { createManualExclusion } from "./manual-exclusion.mjs";

export function createNodeAvailability({ now, getState, setState, isClosed, cancelDrain, drain }) {
  const manualExclusion = createManualExclusion(setState);

  const recover = () => {
    if (isClosed()) return getState();
    cancelDrain();
    setState("ready");
    manualExclusion.clear();
    return getState();
  };

  return {
    get available() {
      return !isClosed() && getState() === "ready" && !manualExclusion.active && now() >= 0;
    },
    set available(value) {
      if (value) recover();
      else drain();
    },
    set unavailable(value) {
      if (value) {
        manualExclusion.exclude();
      } else recover();
    },
    markDraining() {
      setState("draining");
    },
    markClosed() {
      setState("unavailable");
    },
    recover,
  };
}
