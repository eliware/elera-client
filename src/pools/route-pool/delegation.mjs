export function createPoolDelegation(choose) {
  return {
    query: (sql, values) => choose().query(sql, values),
    execute: (sql, values) => choose().execute(sql, values)
  };
}
