export function createQueryExecution({ selection, timed, routeFor, routing }) {
  return (sql, options, operation) => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    const metadata = options?.connection ? {} : { route: selectedRoute };
    return timed(() => operation(selection(), sql, options), metadata);
  };
}
