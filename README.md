# @eliware/elera-client

`@eliware/elera-client` is the application-facing Elera SDK. It turns an
Elera HTTP endpoint and application-scoped bearer token into a native
MySQL/MariaDB client with bundle-driven routing, failover, drain handling,
reconnects, and in-memory telemetry.

## Quick start

Install the published package in the application:

```sh
npm install @eliware/elera-client
```

Configure the application environment without storing SQL credentials:

```dotenv
ELERA_API_ENDPOINT=http://elera.example.test:8080
ELERA_API_TOKEN=application-scoped-token
```

Create and close the managed client:

```js
import { createDb } from '@eliware/elera-client';

const db = await createDb();
try {
  const [rows] = await db.query('SELECT 1');
  console.log(rows);
} finally {
  await db.close();
}
```

`endpoint` and `token` may be passed directly to `createDb` when an
application needs configuration other than the two environment variables.
The client requires both values and retrieves the initial routing bundle
before opening SQL pools.

## Routing and lifecycle

The supervisor supplies the routing bundle. The client validates its
application, database, identity, credentials, writer, readers, ordered
failover nodes, version, expiry, node identity, and port data before use.
Writes use the assigned writer. Reads may use the balanced reader route.
Routing updates and lifecycle events arrive over WebSocket. If the stream is
unavailable, stale, or closed, the client retrieves a fresh bundle over REST
and reconnects through the configured endpoint or the endpoint supplied by a
shutdown event.
WebSocket authentication uses the `Authorization: Bearer …` handshake header;
bearer tokens are never placed in the WebSocket URL.

During drain or shutdown, the affected node is removed from new route
selection while in-flight work is allowed to finish up to the configured
client drain deadline. If no primary route remains, availability reports
`cluster-unavailable`; applications should surface the error and wait for a
later routing update rather than retrying unsafe writes.

## Client API

The public entrypoint intentionally exposes only `createDb` and shared Elera
error types. A managed client provides `query`, `execute`, `transaction`,
`health`, `bundle`, `availability`, `nodeStates`, `drain`, `telemetry`, and
`close`. SQL credentials and routing internals are obtained from the bundle;
applications do not provision databases, manage Galera, or operate cluster
recovery through this package.

Use `routing: 'primary'`, `routing: 'balanced'`, or the default `routing:
'auto'` where a query-specific route override is required. The client does
not automatically retry writes after a failure.

## Telemetry

Pass `telemetry: true` to collect an in-memory snapshot, or provide a
telemetry implementation. Snapshots include query count, failures, retries,
reconnects, failover count, reconnect delay, in-flight work, and latency
statistics. Telemetry is sent through the routing stream when available and
does not issue SQL queries from health or readiness operations.

## Security and operations

- Use an application-scoped token, never a supervisor root token.
- Keep `.env` files out of version control and rotate tokens through the
  supervisor/CLI workflow.
- Do not log tokens, SQL passwords, or complete routing bundles.
- Treat `ClusterUnavailableError` and `ServerUnavailableError` as
  operational states, not authorization failures.
- Always close the client during application shutdown.

The package does not include containers, lab orchestration, backups, GitOps,
or supervisor/CLI administration. Those responsibilities belong to their
respective repositories. Shared contracts and protocol helpers come from
`@eliware/elera-lib`; client-specific SQL errors remain local to this package.

The public API boundary is documented in [docs/public-api.md](docs/public-api.md).

## Development

```sh
npm test
npm run lint
npm run check
npm run typecheck
npm run contracts
npm run audit
npm run pack
```

The baseline suite requires 100% statements, branches, functions, and lines
for in-scope production logic. Integration and lifecycle behavior is tested
separately from the coverage gate.
