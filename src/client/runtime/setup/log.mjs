export function logClientCreated(log, { getBalancedPool, routing }) {
  log.debug?.("SQL client created", {
    balanced: Boolean(getBalancedPool()),
    routing,
  });
}
