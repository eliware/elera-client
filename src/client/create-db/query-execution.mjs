/* istanbul ignore next -- backward-compatible direct factory injection path. */
export function createQueryExecution({ selection, timed, metrics, getBalancedPool, balancedPool, routeFor, routing }) {
  getBalancedPool ??= () => balancedPool;
  const query = async (sql, values, options) => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    return timed(async () => {
      const { choose, isSafeBalancedRetry } = selection();
      const selected = choose(sql, options);
      try { return await selected.query(sql, values); }
      catch (error) {
        // Intentional safety boundary: selection classifies the operation as a
        // safe read before any balanced retry is permitted.
        if (isSafeBalancedRetry(sql, options, error)) {
          metrics?.record?.({ retry: true, route: 'balanced' });
          return getBalancedPool().query(sql, values);
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
