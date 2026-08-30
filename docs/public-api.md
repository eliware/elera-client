# Elera Client Public API

`@eliware/elera-client` is the application-facing SDK. Its public surface is
intentionally limited to the managed database client and the client errors that
applications need to handle operational failures.

## Application configuration

Applications provide only the Elera HTTP endpoint and an application-scoped
API token:

```js
import { createDb } from '@eliware/elera-client';

const db = await createDb({
  endpoint: process.env.ELERA_API_ENDPOINT,
  token: process.env.ELERA_API_TOKEN
});
```

Both values are optional when passed explicitly because `createDb()` reads
`ELERA_API_ENDPOINT` and `ELERA_API_TOKEN` automatically when they are omitted.
Applications do not provide SQL hosts, ports, usernames, passwords, physical
database names, Galera settings, or supervisor credentials.

## Public exports

The package exports:

- `createDb()` for creating the managed application client;
- `SqlClientError` and its operational subclasses;
- `classifyError()` and `asSqlError()` for handling client failures.

The managed client exposes application operations such as `query`, `execute`,
`transaction`, `health`, `close`, and read-only routing/telemetry inspection.
It obtains routing bundles and SQL credentials internally, applies writer/read
routing, and responds to supervisor lifecycle events. Its WebSocket transport
authenticates with the `Authorization: Bearer …` handshake header and does not
put bearer tokens in query strings.

Bundle parsing, routing pools, WebSocket handling, credential materialization,
Galera operations, provisioning, recovery, and supervisor administration are
implementation details. They must not become application-facing exports.

## Boundary rule

The client package owns application integration. Shared bundle/event contracts,
validation, common errors, lifecycle policies, telemetry structures, and generic
transport helpers remain in `@eliware/elera-lib`. Supervisor-only and CLI-only
operations remain in their respective repositories.
