# Release Notes

## 12.0.0 — 2026-10-14

### Added

- Add the managed `createDb` API for MySQL and MariaDB applications.
- Add `query`, `execute`, `getConnection`, `probe`, and `end` methods.
- Add TypeScript declarations for the public client API.
- Add user guides for setup, SQL calls, connections, and troubleshooting.
- Add CI and npm publication workflows for the current package profile.

### Changed

- Read the API URL and application token from options or environment values.
- Get SQL credentials and route data from the Elera API.
- Route SQL work through current writer and reader routes.
- Reconnect the routing stream after a connection loss.
- Request fresh route data after a version gap.
- Retry safe queries and avoid replay of uncertain writes.
- Keep API tokens out of WebSocket URLs and SQL credentials out of the public bundle.
- Require Node.js 26 or later and use native ECMAScript modules.
- Align package metadata, dependencies, workflows, tests, and documentation with convention v12.0.

### Breaking changes

- Use the managed client API instead of direct internal routing, pool, lifecycle, or telemetry exports.

## 0.3.1 — 2026-08-29

### Changed

- Require WebSocket authentication through the `Authorization` handshake header.
- Reject bearer tokens in WebSocket query strings.
- Validate managed-client bundles and routing updates.
- Keep SQL error classification inside the client package.
- Add route telemetry and availability states.
- Document the public API and package boundary.

## 0.3.0 — 2026-08-29

### Added

- Create a managed MySQL or MariaDB client with an Elera URL and application token.
- Read `ELERA_API_URL` and `ELERA_API_TOKEN` from the environment.
- Retrieve and validate routing bundles with SQL credentials and route data.
- Route writes to the writer and reads through reader routes.
- Handle failover, node quarantine, routing updates, and lifecycle events.
- Recover through REST when the WebSocket stream fails or falls behind.
- Bound drain time for active SQL work.
- Report query, failure, retry, reconnect, failover, and latency metrics.
- Provide TypeScript declarations and SQL error types.
