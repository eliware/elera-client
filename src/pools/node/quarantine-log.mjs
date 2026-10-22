export function logQuarantine(log, error) {
  log?.warn?.("SQL node quarantined", {
    operation: "sql.node.quarantine",
    outcome: "quarantined",
    errorCode: error.code,
  });
}
