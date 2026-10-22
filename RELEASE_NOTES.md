# Release Notes

## 15.0.0 — 2026-10-22

### Added

- Add the managed `createDb` API for MySQL and MariaDB applications.
- Add the `query`, `execute`, `getConnection`, `probe`, and `end` methods.
- Add TypeScript declarations, user guides, troubleshooting guidance, runnable examples, and documentation indexes.
- Add CI checks for tests, lint, types, package contents, and repository conventions.
- Add an npm publication workflow that uses trusted publishing and provenance.
- Add injectable structured operation and routing logs through `@eliware/log`.
- Add injectable runtime dependencies for HTTP, WebSocket, MySQL, time, and telemetry.

### Changed

- Read the API URL and application token from options or `ELERA_API_URL` and `ELERA_API_TOKEN`.
- Read SQL credentials, database names, and route data from validated Elera bundles.
- Route writes to the elected writer and reads to eligible reader nodes.
- Reconnect the routing stream after connection loss and request current routes through HTTP after missed events.
- Retry safe queries. Do not repeat writes when the result is unknown.
- Keep API tokens out of WebSocket URLs and SQL credentials out of public bundles and logs.
- Drain replaced pools before cleanup. Count active connections during drain and shutdown.
- Create new pools for unhealthy pools during bundle resync and preserve refresh state and route reports.
- Keep telemetry enabled by default. Report operation and reconnect metrics.
- Require Node.js 26 or later and use native ESM.
- Use `@eliware/elera-lib` 15 bundle contracts, `@eliware/log` structured logging, and `@eliware/test` 15 validation.
- Align package metadata, license, repository conventions, and development tools with Eliware Test 15.
- Organize runtime modules and tests by responsibility with one focused test module for each source module.
- Document setup, configuration, API behavior, routing, troubleshooting, examples, validation, and release steps.

### Fixed

- Preserve refresh state and route reports after bundle updates.
- Close active pools before client shutdown and wait for tracked connections to complete before the drain limit.
- Retry routing requests after stream loss or missed events and restore routing after missed events.
- Do not retire an unchanged startup bundle or refresh pools when no change requires it.
- Keep replaced pools alive until their active work completes, then close them during cleanup.

### Breaking changes

- Export only `createDb` from the package root. Remove internal routing, pool, lifecycle, and telemetry exports.
- Require Node.js 26 or later and the Elera 15 shared bundle contract.
- Use `ELERA_API_URL` for the API endpoint and `ELERA_API_TOKEN` for the application token. Remove legacy managed-client options.

## 0.3.1 — 2026-08-29

### Changed

- Require WebSocket authentication through the `Authorization` handshake header.
- Reject bearer tokens in WebSocket query strings.
- Validate managed-client bundles and routing updates.
- Keep SQL error classes inside the client package.
- Add route telemetry and availability states.
- Document the public API and package boundary.

## 0.3.0 — 2026-08-29

### Added

- Create a managed MySQL or MariaDB client with an Elera URL and application token.
- Read `ELERA_API_URL` and `ELERA_API_TOKEN` from the environment.
- Retrieve and validate routing bundles with SQL credentials and route data.
- Route writes to the writer and reads through reader routes.
- Support failover, node quarantine, routing updates, and lifecycle events.
- Request route data through HTTP when the WebSocket stream fails or misses events.
- Bound drain time for active SQL work.
- Report query, failure, retry, reconnect, failover, and latency metrics.
- Provide TypeScript declarations and SQL error types.
