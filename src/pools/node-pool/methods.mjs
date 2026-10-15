import { asSqlError } from "../../errors.mjs";

const connectionFailure = (error) => asSqlError(error).retryable;

export function createNodeMethods({
  profile,
  pool,
  operations,
  lifecycle,
  state,
  log,
  now,
  quarantineMs,
  isAvailable,
}) {
  const quarantine = () => {
    state.unavailableUntil = now() + quarantineMs;
  };
  return {
    async query(sql, values) {
      if (!isAvailable()) throw new Error(`SQL node ${profile.host} is unavailable`);
      try {
        const result = await operations.query(sql, values);
        state.failures = 0;
        return result;
      } catch (error) {
        if (connectionFailure(error)) {
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
        if (connectionFailure(error)) {
          state.failures += 1;
          quarantine();
        }
        throw asSqlError(error);
      }
    },
    async getConnection() {
      if (!isAvailable()) throw new Error(`SQL node ${profile.host} is unavailable`);
      try {
        const connection = await pool.getConnection();
        lifecycle.begin();
        const release = connection.release.bind(connection);
        let released = false;
        connection.release = () => {
          if (released) return;
          released = true;
          lifecycle.end();
          release();
        };
        return connection;
      } catch (error) {
        if (connectionFailure(error)) quarantine();
        throw asSqlError(error);
      }
    },
    async health() {
      try {
        await pool.query("SELECT 1");
        state.failures = 0;
        state.unavailableUntil = 0;
        return { ok: true, host: profile.host, port: profile.port };
      } catch (error) {
        if (connectionFailure(error)) {
          state.failures += 1;
          quarantine();
        }
        throw asSqlError(error);
      }
    },
  };
}
