export function createQuery({ run, metrics }) {
  return async (sql, values, options) => {
    return run(
      sql,
      options,
      async ({ choose, isSafeBalancedRetry }) => {
        const selected = choose(sql, options);
        try {
          return await selected.query(sql, values);
        } catch (error) {
          if (isSafeBalancedRetry(sql, options, error)) {
            metrics?.record?.({ retry: true, route: "balanced" });
            return choose(sql, { ...options, route: "balanced" }).query(sql, values);
          }
          throw error;
        }
      },
      "query",
    );
  };
}
