import { asSqlError } from "../../errors/index.mjs";

export function createNodeMethods({
  profile,
  operations,
  state,
  log,
  isRetryable,
  quarantine,
  isAvailable,
}) {
  return {
    async query(sql, values) {
      if (!isAvailable()) throw new Error(`SQL node ${profile.host} is unavailable`);
      try {
        const result = await operations.query(sql, values);
        state.failures = 0;
        return result;
      } catch (error) {
        if (isRetryable(error)) {
          state.failures += 1;
          quarantine();
          log?.warn?.("SQL node quarantined", {
            host: profile.host,
            port: profile.port,
            error: error.message,
          });
        }
        throw asSqlError(error);
      }
    },
    async execute(sql, values) {
      if (!isAvailable()) throw new Error(`SQL node ${profile.host} is unavailable`);
      try {
        const result = await operations.execute(sql, values);
        state.failures = 0;
        return result;
      } catch (error) {
        if (isRetryable(error)) {
          state.failures += 1;
          quarantine();
        }
        throw asSqlError(error);
      }
    },
  };
}
