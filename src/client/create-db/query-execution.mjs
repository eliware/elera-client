export function createQueryExecution({ selection, timed, routeFor, routing }) {
  const execute = async (sql, values, options) => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    return timed(() => selection().choose(sql, options).execute(sql, values), {
      route: selectedRoute,
    });
  };
  return { execute };
}
