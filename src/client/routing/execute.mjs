export function createExecute({ run }) {
  return (sql, values, options) =>
    run(sql, options, ({ choose }) => choose(sql, options).execute(sql, values));
}
