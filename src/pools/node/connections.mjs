import { asSqlError } from "../../errors/index.mjs";
import { trackNodeConnection } from "./tracked-connection.mjs";

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
        return trackNodeConnection(connection, lifecycle);
      } catch (error) {
        if (isRetryable(error)) quarantine();
        throw asSqlError(error);
      }
    },
  };
}
