import { clearSocketState } from "../socket/cleanup.mjs";
import { recoverConnectionClose } from "../reconnect-recovery.mjs";

export function createConnectionRecovery({ state, now, fallback, schedule }) {
  return {
    close() {
      clearSocketState(state);
      recoverConnectionClose({ state, now, fallback, schedule });
    },
  };
}
