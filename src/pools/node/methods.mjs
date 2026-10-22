import { asSqlError } from "../../errors/index.mjs";

function logQuarantine(log, error) {
  log?.warn?.("SQL node quarantined", {
    operation: "sql.node.quarantine",
    outcome: "quarantined",
    errorCode: error.code,
  });
}

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
          logQuarantine(log, error);
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
          logQuarantine(log, error);
        }
        throw asSqlError(error);
      }
    },
  };
}
