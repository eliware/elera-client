# Release notes

## Unreleased

- Redesign the application-facing client around the canonical mysql2-compatible
  `createDb()` pool and connection contract.
- Use `ELERA_API_URL` and `ELERA_API_TOKEN` as the supported application
  configuration variables.
- Keep routing bundles, credentials, lifecycle controls, and diagnostics
  private to the managed client.
- Elid2 migration remains intentionally pending until its dependency and
  legacy SQL environment configuration are updated in the dependent project.

## v0.3.1

Refined the managed client boundary and routing transport.

- Require WebSocket authentication through the `Authorization` handshake
  header; query-string bearer tokens are no longer accepted.
- Tighten managed-client bundle validation and routing update handling.
- Keep client-specific SQL error classification local to the client package and
  synchronize the public exports and declarations.
- Add route-level telemetry and clearer standalone/cluster availability states.
- Document the public application API and package boundary.
- Reorganize focused routing and contract tests while retaining complete 100×4
  coverage.

## v0.3.0

Initial baseline release of the Elera application client.

- Create a managed MySQL/MariaDB client with an Elera endpoint and
  application-scoped API token.
- Read `ELERA_API_URL` and `ELERA_API_TOKEN` from the environment by
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
- Provide typed public declarations and client-specific SQL error types.
