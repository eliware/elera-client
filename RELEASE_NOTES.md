# Release notes

## v0.3.0

Initial baseline release of the Elera application client.

- Create a managed MySQL/MariaDB client with an Elera endpoint and
  application-scoped API token.
- Read `ELERA_API_ENDPOINT` and `ELERA_API_TOKEN` from the environment by
  default, with explicit options available when needed.
- Retrieve and validate routing bundles containing database credentials,
  writers, readers, failover nodes, versions, expiry, and node metadata.
- Route writes to the assigned writer and reads through balanced reader
  routes.
- Handle ordered failover and node quarantine for unavailable SQL nodes.
- Receive routing updates and lifecycle events over WebSocket.
- Recover through REST bundle retrieval when the WebSocket stream is
  unavailable or out of date.
- Honor drain, shutdown, reconnect, and cluster-unavailable states.
- Enforce bounded client-side drain behavior for in-flight operations.
- Expose client telemetry for query activity, failures, retries, reconnects,
  failover, latency, and in-flight work.
- Provide typed public declarations and shared Elera error types.
