# Release Notes

## 13.0.0 — 2026-10-18

### Added

- Add the managed `createDb` API for MySQL and MariaDB applications.
- Add the `query`, `execute`, `getConnection`, `probe`, and `end` methods.
- Add TypeScript declarations, user guides, and runnable examples.
- Add CI and npm publication workflows.

### Changed

- Read the API URL and application token from options or environment values.
- Read SQL credentials and route data from the Elera API.
- Send writes to the writer and reads through reader routes.
- Reconnect the routing stream after a connection loss.
- Request current route data after missed events.
- Retry safe queries. Do not repeat writes when the result is unknown.
- Keep API tokens out of WebSocket URLs and SQL credentials out of public bundles.
- Require Node.js 26 or later. Use native ESM.
- Use the shared `@eliware/elera-lib` contract and `@eliware/test` validation.
- Drain replaced pools before cleanup. Create new pools when bundle resync finds an unhealthy pool.
- Keep telemetry on by default. Export only `createDb` from the package root.

### Fixed

- Keep refresh state and route reports after bundle updates.
- Close active pools before client shutdown.
- Retry routing requests after stream loss or missed events.

### Breaking changes

- Export only `createDb` from the package root. Remove internal routing, pool, lifecycle, and telemetry exports.

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
