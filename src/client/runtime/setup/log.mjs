export function logClientCreated(log, { getBalancedPool, routing }) {
  const metadata = {
    operation: "client.create",
    balancedPool: Boolean(getBalancedPool()),
    routing,
  };
  log.info?.("Managed database client ready", metadata);
  log.debug?.("SQL client created", metadata);
}
