import { asSqlError } from "../../errors/index.mjs";

export function createNodeFailurePolicy({ state, now, quarantineMs }) {
  return {
    isRetryable: (error) => asSqlError(error).retryable,
    isQuarantined: () => now() < state.unavailableUntil,
    quarantine: () => {
      state.unavailableUntil = now() + quarantineMs;
    },
    clearQuarantine: () => {
      state.unavailableUntil = 0;
    },
  };
}
