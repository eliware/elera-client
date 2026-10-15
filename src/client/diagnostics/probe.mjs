export async function probeClient({ sql = "SELECT 1", routeFor, query, getConnection }) {
  const route = routeFor(sql);
  const result = await query(sql);
  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();
    await connection.rollback();
  } finally {
    connection?.release?.();
  }
  return {
    ok: true,
    route,
    result,
    transaction: "started",
    released: Boolean(connection),
  };
}

export function createProbeApi({ routeFor, execution, getPrimaryPool }) {
  return (sql = "SELECT 1") =>
    probeClient({
      sql,
      routeFor,
      query: (statement) => execution.query(statement),
      getConnection: () => getPrimaryPool().choose().getConnection(),
    });
}
