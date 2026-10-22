export function createQueryExecution({ selection, timed, routeFor, routing, log }) {
  return async (sql, options, operation, kind = "query") => {
    const selectedRoute = routeFor(sql, options?.route ?? routing);
    const routeMetadata = options?.connection ? {} : { route: selectedRoute };
    log?.silly?.("SQL route selected", {
      operation: `sql.${kind}.route_select`,
      ...routeMetadata,
    });
    try {
      const result = await timed(() => operation(selection(), sql, options), routeMetadata);
      log?.verbose?.("SQL operation completed", {
        operation: `sql.${kind}`,
        outcome: "success",
        ...routeMetadata,
      });
      return result;
    } catch (error) {
      log?.error?.("SQL operation failed", {
        operation: `sql.${kind}`,
        outcome: "failure",
        ...routeMetadata,
        errorCode: error?.code,
      });
      throw error;
    }
  };
}
