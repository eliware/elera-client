export function createQuery({ run, metrics }) {
  return async (sql, values, options) => {
    return run(
      sql,
      options,
      async ({ choose, isSafeBalancedRetry }) => {
        const selected = choose(sql, options);
        const selectedNode = selected.choose?.();
        const target = selectedNode ?? selected;
        try {
          return await target.query(sql, values);
        } catch (error) {
          if (isSafeBalancedRetry(sql, options, error)) {
            metrics?.record?.({ retry: true, route: "balanced" });
            const retryNode = selected.choose?.([selectedNode]);
            const retryTarget = retryNode ?? choose(sql, { ...options, route: "balanced" });
            return retryTarget.query(sql, values);
          }
          throw error;
        }
      },
      "query",
    );
  };
}
