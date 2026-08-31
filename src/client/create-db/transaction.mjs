import { asSqlError } from '../../errors.mjs';

export function createTransactionOperation({ primaryPool, timed }) {
  return async function transaction(callback) {
    return timed(async () => {
      const node = primaryPool.choose();
      const connection = await node.getConnection();
      try {
        await connection.beginTransaction();
        const tx = { query: (sql, values) => connection.query(sql, values), execute: (sql, values) => connection.execute(sql, values) };
        const result = await callback(tx);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback().catch(() => {});
        throw asSqlError(error);
      } finally { connection.release(); }
    });
  };
}
