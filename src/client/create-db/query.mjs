export function createQuery({ selection, timed, metrics, getBalancedPool, routeFor, routing }) {
  return async (sql, values, options) => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    return timed(
      async () => {
        const { choose, isSafeBalancedRetry } = selection();
        const selected = choose(sql, options);
        try {
          return await selected.query(sql, values);
        } catch (error) {
          if (isSafeBalancedRetry(sql, options, error)) {
            metrics?.record?.({ retry: true, route: "balanced" });
            return getBalancedPool().query(sql, values);
          }
          throw error;
        }
      },
      { route: selectedRoute },
    );
  };
}
