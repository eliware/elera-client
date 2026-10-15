import { asSqlError } from "../../errors/index.mjs";

export function createNodeHealth({ profile, pool, state, isRetryable, quarantine }) {
  return async function health() {
    try {
      await pool.query("SELECT 1");
      state.failures = 0;
      state.unavailableUntil = 0;
      return { ok: true, host: profile.host, port: profile.port };
    } catch (error) {
      if (isRetryable(error)) {
        state.failures += 1;
        quarantine();
      }
      throw asSqlError(error);
    }
  };
}
