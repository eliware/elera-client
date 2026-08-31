export function createNodeOperations({ pool, sessionStatements, begin, end }) {
  const withConnection = async (operation, sql, values) => { const connection = await pool.getConnection(); try { for (const statement of sessionStatements) await connection.query(statement); return operation(connection, sql, values); } finally { connection.release(); } };
  const run = async (work) => { begin(); try { return await work(); } finally { end(); } };
  return { query: (sql, values) => run(() => sessionStatements.length ? withConnection((connection, statement, params) => connection.query(statement, params), sql, values) : pool.query(sql, values)), execute: (sql, values) => run(() => sessionStatements.length ? withConnection((connection, statement, params) => connection.execute(statement, params), sql, values) : pool.execute(sql, values)), withConnection };
}
