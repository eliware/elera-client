export async function verifyProbeTransaction(getConnection) {
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
}
