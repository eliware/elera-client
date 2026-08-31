# Elera Client Public API

`@eliware/elera-client` is the application-facing SDK. Its public surface is
intentionally limited to the managed mysql2-compatible database client.

## Application configuration

Applications provide only the Elera HTTP endpoint and an application-scoped
API token:

```js
import { createDb } from '@eliware/elera-client';

const db = await createDb({
  endpoint: process.env.ELERA_API_URL,
  token: process.env.ELERA_API_TOKEN
});
```

Both values are optional when passed explicitly because `createDb()` reads
`ELERA_API_URL` and `ELERA_API_TOKEN` automatically when they are omitted.
`createDb({ env })` is also supported for dependency-injected environments.
Applications do not provide SQL hosts, ports, usernames, passwords, physical
database names, Galera settings, or supervisor credentials.

The runtime accepts only endpoint/token configuration as application inputs.
Transport, routing, pool, and telemetry controls are internal implementation
details and are not part of the application API.

## Public exports

The package exports:

- `createDb()` for creating the managed application client;
- `createDb()`.

The managed client exposes `query`, `execute`, `getConnection`, and `end`.
Acquired connections expose `beginTransaction`, `commit`, `rollback`, and
`release`, matching the mysql2/promise lifecycle.
It obtains routing bundles and SQL credentials internally, applies writer/read
routing, and responds to supervisor lifecycle events. Its WebSocket transport
authenticates with the `Authorization: Bearer …` handshake header and does not
put bearer tokens in query strings.

Bundle parsing, routing pools, WebSocket handling, credential materialization,
Galera operations, provisioning, recovery, and supervisor administration are
implementation details. They must not become application-facing exports.

## Boundary rule

The client package owns application integration. Shared bundle/event contracts
and validation remain in `@eliware/elera-lib`. Client errors, lifecycle policy,
telemetry, transport, SQL pools, and routing behavior belong to this package.
Supervisor-only and CLI-only operations remain in their respective repositories.
