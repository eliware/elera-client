import { createManualExclusion } from "./manual-exclusion.mjs";
import { createLifecycleAvailability } from "./lifecycle-availability.mjs";

export function createNodeAvailability({ now, getState, setState, isClosed, cancelDrain, drain }) {
  const manualExclusion = createManualExclusion(setState);
  const lifecycle = createLifecycleAvailability({
    now,
    getState,
    setState,
    isClosed,
    cancelDrain,
    drain,
  });
  const recover = () => {
    const state = lifecycle.recover();
    manualExclusion.clear();
    return state;
  };
  return {
    get available() {
      return lifecycle.available && !manualExclusion.active;
    },
    set available(value) {
      if (value) recover();
      else lifecycle.available = false;
    },
    set unavailable(value) {
      if (value) {
        manualExclusion.exclude();
      } else recover();
    },
    markDraining: lifecycle.markDraining,
    markClosed: lifecycle.markClosed,
    recover,
  };
}
