export async function probeClient({ sql = "SELECT 1", routeFor, query, getConnection }) {
  const route = routeFor(sql);
  const result = await query(sql, route);
  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();
    await connection.rollback();
  } catch (error) {
    try {
      await connection?.rollback?.();
    } catch {}
    throw error;
  } finally {
    connection?.release?.();
  }
  return {
    ok: true,
    route,
    result,
    transaction: "started",
    released: true,
  };
}
