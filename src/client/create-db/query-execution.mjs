export function createQueryExecution({ selection, timed, routeFor, routing }) {
  return (sql, options, operation) => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    return timed(() => operation(selection(), sql, options), { route: selectedRoute });
  };
}
