export function createQueryExecution({ selection, timed, metrics, balancedPool, routeFor, routing }) {
  const query = async (sql, values, options) => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    return timed(async () => {
      const { choose, isSafeBalancedRetry } = selection();
      const selected = choose(sql, options);
      try { return await selected.query(sql, values); }
      catch (error) {
        if (isSafeBalancedRetry(sql, options, error)) {
          metrics?.record?.({ retry: true, route: 'balanced' });
          return balancedPool.query(sql, values);
        }
        throw error;
      }
    }, { route: selectedRoute });
  };
  const execute = async (sql, values, options) => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    return timed(() => selection().choose(sql, options).execute(sql, values), { route: selectedRoute });
  };
  return { query, execute };
}
