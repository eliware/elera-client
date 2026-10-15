import { asSqlError } from "../../errors/index.mjs";

export function createNodeFailurePolicy({ state, now, quarantineMs }) {
  return {
    isRetryable: (error) => asSqlError(error).retryable,
    quarantine: () => {
      state.unavailableUntil = now() + quarantineMs;
    },
  };
}
