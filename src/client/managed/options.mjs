export function createManagedDependencies(options) {
  const { mysqlLib, log, routing, quarantineMs, drainTimeoutMs, now, telemetry } = options;
  return { mysqlLib, log, routing, quarantineMs, drainTimeoutMs, now, telemetry };
}
