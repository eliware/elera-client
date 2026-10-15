import { asSqlError } from "../../errors.mjs";

export function createNodeConnections({
  profile,
  pool,
  lifecycle,
  isRetryable,
  quarantine,
  isAvailable,
}) {
  return {
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
        if (isRetryable(error)) quarantine();
        throw asSqlError(error);
      }
    },
  };
}
