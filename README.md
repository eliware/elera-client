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
ELERA_API_URL=http://elera.example.test:8080
ELERA_API_TOKEN=application-scoped-token
```

Create and close the managed client using the familiar mysql2 pool shape:

```js
import { createDb } from '@eliware/elera-client';

const db = await createDb();
try {
  const [rows] = await db.query('SELECT 1');
  console.log(rows);
} finally {
  await db.end();
}
```

`endpoint` and `token` may be passed directly, or through `createDb({ env })`.
When omitted, the client reads `ELERA_API_URL` and `ELERA_API_TOKEN` from the
process environment. The client requires both values and retrieves the initial
routing bundle before opening SQL pools.

For an injected environment, use:

```js
const db = await createDb({
  env: {
    ELERA_API_URL: 'https://elera.example.test',
    ELERA_API_TOKEN: process.env.ELERA_API_TOKEN,
  },
});
```

## Routing and lifecycle

The supervisor supplies the routing bundle. The client validates its
application, database, identity, credentials, writer, readers, ordered
failover nodes, version, expiry, node identity, and port data before use.
Writes use the assigned writer. Reads may use the balanced reader route.
Routing updates and lifecycle events arrive over WebSocket. If the stream is
unavailable, stale, or closed, the client retrieves a fresh bundle over REST
and reconnects through the configured endpoint or the endpoint supplied by a
shutdown event.
Credential-free `routing.topology` events are treated as refresh signals: the
client validates the topology event, then retrieves the authenticated bundle
over REST rather than treating topology data as SQL credentials.
The internal `routing.resync` signal used for that REST refresh is not a
public server event; applications receive the resulting bundle through the
normal client routing behavior.
WebSocket authentication uses the `Authorization: Bearer …` handshake header;
bearer tokens are never placed in the WebSocket URL.

During drain or shutdown, the affected node is removed from new route
selection while in-flight work is allowed to finish up to the configured
client drain deadline. If no primary route remains, availability reports
`standalone-unavailable` for a single-server service or
`cluster-unavailable` for a clustered service. Applications should surface the
error and wait for a later routing update rather than retrying unsafe writes.

## Client API

The public entrypoint exposes only `createDb`. A managed client provides the
mysql2-compatible methods `query`, `execute`, `getConnection`, and `end`.
Acquired connections provide `beginTransaction`, `commit`, `rollback`, and
`release`. SQL credentials and routing internals remain private.

The client selects readers and writers transparently. It does not
automatically retry writes after a failure.

## Telemetry

Routing telemetry is internal to the managed client and is not part of the
mysql2-shaped application API.

## Security and operations

- Use an application-scoped token, never a supervisor root token.
- Keep `.env` files out of version control and rotate tokens through the
  supervisor/CLI workflow.
- Do not log tokens, SQL passwords, or complete routing bundles.
- Always call `db.end()` during application shutdown.

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
